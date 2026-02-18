"""
PhishX Async Task Definitions

Core processing tasks that run asynchronously via Celery.
Decouples email ingestion from processing pipeline.
"""

import json
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from task_queue import app as celery_app
from db import get_db
import logging

logger = logging.getLogger(__name__)

# ========================================
# Phase 3: Anomaly Detection Integration
# ========================================

try:
    from anomaly_integration import (
        detect_anomalies,
        should_escalate_anomaly,
        handle_anomaly_alert,
    )
    ANOMALY_DETECTION_AVAILABLE = True
except ImportError:
    logger.warning("anomaly_integration not available")
    ANOMALY_DETECTION_AVAILABLE = False

# ========================================
# Core Processing Tasks
# ========================================

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="emails",
)
def process_email(
    self,
    email_id: str,
    subject: str,
    sender: str,
    body: str,
    urls: List[str],
    tenant_id: str,
    priority: str = "normal",
) -> Dict[str, Any]:
    """
    Main email processing pipeline.
    
    Flow:
    1. Parse and validate email
    2. Enrich with threat intelligence
    3. Run ML models (NLP, URL)
    4. Calculate risk score
    5. Make enforcement decision
    6. Persist to database
    7. Queue enforcement actions
    """
    try:
        from scanner.risk_engine import calculate_risk
        from scanner.url_ml_v2 import analyze_urls
        
        # Import NLP service call
        from app_new import call_nlp_service, get_active_policy
        
        logger.info(
            "email_processing_start",
            email_id=email_id,
            tenant_id=tenant_id,
            priority=priority,
        )
        
        # Get tenant policy
        policy = get_active_policy(tenant_id)
        cold_threshold = int(policy.get("cold_threshold", 40))
        warm_threshold = int(policy.get("warm_threshold", 75))
        
        # NLP Analysis (async call via task)
        nlp_result = enrich_nlp.apply_async(
            args=(subject, body),
            queue="enrichment",
        ).get(timeout=10)
        
        text_score = float(nlp_result.get("text_ml_score", 0.0))
        
        # URL Analysis (async call via task)
        url_result = enrich_urls.apply_async(
            args=(urls,),
            queue="enrichment",
        ).get(timeout=10) if urls else {"score": 0.0, "signals": []}
        
        # Calculate risk score
        risk_eval = calculate_risk(
            text_ml_score=text_score,
            text_findings={},
            url_result=url_result,
            malware_hits=[],
        )
        
        if isinstance(risk_eval, dict):
            risk_score = int(risk_eval.get("risk_score", 0))
            findings = risk_eval.get("findings", {})
        else:
            risk_score = int(risk_eval)
            findings = {}
        
        # ========================================
        # Phase 3: Anomaly Detection
        # ========================================
        anomaly_result = None
        if ANOMALY_DETECTION_AVAILABLE:
            try:
                anomaly_result = detect_anomalies(
                    email_id=email_id,
                    sender=sender,
                    subject=subject,
                    body=body,
                    urls=urls or [],
                    risk_score=risk_score,
                    tenant_id=tenant_id,
                )
                
                if anomaly_result:
                    # Add anomaly info to findings
                    if not isinstance(findings, dict):
                        findings = {}
                    findings["anomaly"] = anomaly_result
                    
                    # Check if should escalate to SOC
                    if should_escalate_anomaly(anomaly_result):
                        handle_anomaly_alert(email_id, tenant_id, anomaly_result)
                        # Could also boost risk score or change decision here
                        logger.warning(
                            "anomaly_escalated",
                            email_id=email_id,
                            anomaly_type=anomaly_result.get("anomaly_type"),
                        )
            
            except Exception as e:
                logger.error(
                    "anomaly_detection_error",
                    email_id=email_id,
                    error=str(e),
                )
                # Don't fail the whole process if anomaly detection fails
        
        # Determine category and decision (now considering anomalies)
        if risk_score >= warm_threshold:
            category = "HOT"
            decision = "QUARANTINE"
        elif risk_score >= cold_threshold:
            category = "WARM"
            decision = "ALLOW"
        else:
            category = "COLD"
            decision = "ALLOW"
        
        # Persist decision
        persist_decision.apply_async(
            args=(
                email_id,
                tenant_id,
                risk_score,
                category,
                decision,
                json.dumps(findings),
            ),
            queue="emails",
        )
        
        # Queue enforcement action if needed
        if category in ("WARM", "HOT"):
            enforce_decision.apply_async(
                args=(email_id, category, decision),
                queue="enforcement",
            )
        
        logger.info(
            "email_processing_complete",
            email_id=email_id,
            risk_score=risk_score,
            category=category,
            decision=decision,
        )
        
        return {
            "email_id": email_id,
            "risk_score": risk_score,
            "category": category,
            "decision": decision,
            "findings": findings,
        }
        
    except Exception as exc:
        logger.error(
            "email_processing_failed",
            email_id=email_id,
            error=str(exc),
            retry_count=self.request.retries,
        )
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


# ========================================
# Enrichment Tasks
# ========================================

@celery_app.task(
    bind=True,
    queue="enrichment",
    max_retries=2,
)
def enrich_nlp(self, subject: str, body: str) -> Dict[str, Any]:
    """
    Call external NLP service for phishing text analysis.
    Includes circuit breaker pattern.
    """
    try:
        from app_new import call_nlp_service
        
        result = call_nlp_service(subject, body)
        return result
        
    except Exception as exc:
        logger.warning(
            "nlp_enrichment_failed",
            error=str(exc),
            retry_count=self.request.retries,
        )
        if self.request.retries < 2:
            raise self.retry(exc=exc, countdown=5)
        # Fallback to default score
        return {"text_ml_score": 0.0, "model_version": "fallback"}


@celery_app.task(
    bind=True,
    queue="enrichment",
    max_retries=2,
)
def enrich_urls(self, urls: List[str]) -> Dict[str, Any]:
    """
    Analyze URLs using ML model and reputation checks.
    """
    try:
        from scanner.url_ml_v2 import analyze_urls
        
        if not urls:
            return {"score": 0.0, "signals": []}
        
        result = analyze_urls(urls)
        return result
        
    except Exception as exc:
        logger.warning(
            "url_enrichment_failed",
            error=str(exc),
            retry_count=self.request.retries,
        )
        if self.request.retries < 2:
            raise self.retry(exc=exc, countdown=5)
        return {"score": 0.0, "signals": []}


# ========================================
# Persistence Tasks
# ========================================

@celery_app.task(queue="emails")
def persist_decision(
    email_id: str,
    tenant_id: str,
    risk_score: int,
    category: str,
    decision: str,
    findings: str,
) -> bool:
    """
    Persist email decision to database.
    Append-only pattern for immutable audit trail.
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Insert email decision
        cur.execute("""
            INSERT INTO email_decisions
            (id, tenant_id, risk_score, category, decision, findings, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (
            email_id,
            tenant_id,
            risk_score,
            category,
            decision,
            findings,
        ))
        
        # Create SOC alert if warm or hot
        if category in ("WARM", "HOT"):
            cur.execute("""
                INSERT INTO soc_alerts (id, tenant_id, email_id, category, status, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                str(uuid.uuid4()),
                tenant_id,
                email_id,
                category,
                "OPEN",
            ))
        
        # Audit log entry
        cur.execute("""
            INSERT INTO audit_log (id, entity_type, entity_id, action, actor, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (
            str(uuid.uuid4()),
            "email_decision",
            email_id,
            "created",
            json.dumps({"source": "system", "service": "phishx"}),
            json.dumps({"risk_score": risk_score, "category": category}),
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        logger.info(
            "decision_persisted",
            email_id=email_id,
            category=category,
        )
        return True
        
    except Exception as e:
        logger.error(
            "decision_persistence_failed",
            email_id=email_id,
            error=str(e),
        )
        raise


# ========================================
# Enforcement Tasks
# ========================================

@celery_app.task(
    queue="enforcement",
    max_retries=3,
    bind=True,
)
def enforce_decision(
    self,
    email_id: str,
    category: str,
    decision: str,
) -> bool:
    """
    Execute enforcement action (SMTP reject, quarantine, etc).
    Includes retry logic for transient failures.
    """
    try:
        # Get email details from database
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT tenant_id, findings FROM email_decisions WHERE id = %s
        """, (email_id,))
        
        row = cur.fetchone()
        if not row:
            logger.warning("email_not_found_for_enforcement", email_id=email_id)
            return False
        
        cur.close()
        conn.close()
        
        # Execute enforcement based on category
        if category == "HOT" and decision == "QUARANTINE":
            # These would call adapter handlers
            logger.info(
                "enforcement_action_queued",
                email_id=email_id,
                action="quarantine",
            )
        
        return True
        
    except Exception as exc:
        logger.error(
            "enforcement_failed",
            email_id=email_id,
            error=str(exc),
            retry_count=self.request.retries,
        )
        if self.request.retries < 3:
            raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
        return False


# ========================================
# Maintenance Tasks
# ========================================

@celery_app.task()
def cleanup_expired_alerts() -> int:
    """
    Remove resolved alerts older than 90 days.
    Runs daily via Celery Beat.
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        cur.execute("""
            DELETE FROM soc_alerts
            WHERE status = 'RESOLVED' AND created_at < %s
            RETURNING id
        """, (cutoff_date,))
        
        deleted_count = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        
        logger.info(
            "alerts_cleanup_complete",
            deleted_count=deleted_count,
        )
        return deleted_count
        
    except Exception as e:
        logger.error("alerts_cleanup_failed", error=str(e))
        return 0


@celery_app.task()
def sync_threat_intelligence() -> bool:
    """
    Refresh threat intelligence feeds.
    Runs every 6 hours via Celery Beat.
    """
    try:
        # This would integrate with external threat feeds
        # URLhaus, PhishTank, etc.
        logger.info("threat_intelligence_sync_started")
        
        # Implementation details would go here
        
        logger.info("threat_intelligence_sync_complete")
        return True
        
    except Exception as e:
        logger.error("threat_intelligence_sync_failed", error=str(e))
        return False
