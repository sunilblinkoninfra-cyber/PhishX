"""
Phase 3 Anomaly Detection Integration

Integrates ML-based anomaly detection into task processing pipeline.
Provides singleton anomaly detection engine for reuse across tasks.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime

from anomaly_detection import (
    AnomalyDetectionEngine,
    EmailFeatures,
    AnomalyConfig,
)
from log_config import logger


# ========================================
# Configuration
# ========================================

class AnomalyConfig:
    """Anomaly detection configuration from environment"""
    
    ANOMALY_DETECTION_ENABLED = os.getenv("ANOMALY_DETECTION_ENABLED", "true").lower() == "true"
    ANOMALY_CONFIDENCE_THRESHOLD = float(os.getenv("ANOMALY_CONFIDENCE_THRESHOLD", 0.8))
    ANOMALY_ALERT_ON_DETECTION = os.getenv("ANOMALY_ALERT_ON_DETECTION", "true").lower() == "true"
    ANOMALY_SLIDING_WINDOW_SIZE = int(os.getenv("ANOMALY_SLIDING_WINDOW_SIZE", 1000))
    ANOMALY_ZSCORE_THRESHOLD = float(os.getenv("ANOMALY_ZSCORE_THRESHOLD", 3.0))
    ANOMALY_IQR_THRESHOLD = float(os.getenv("ANOMALY_IQR_THRESHOLD", 1.5))
    
    @classmethod
    def initialize(cls):
        """Initialize anomaly detection configuration"""
        AnomalyConfig.SLIDING_WINDOW_SIZE = cls.ANOMALY_SLIDING_WINDOW_SIZE
        AnomalyConfig.ZSCORE_THRESHOLD = cls.ANOMALY_ZSCORE_THRESHOLD
        AnomalyConfig.IQR_THRESHOLD = cls.ANOMALY_IQR_THRESHOLD
        
        if cls.ANOMALY_DETECTION_ENABLED:
            logger.info(
                "anomaly_detection_enabled",
                confidence_threshold=cls.ANOMALY_CONFIDENCE_THRESHOLD,
                alert_on_detection=cls.ANOMALY_ALERT_ON_DETECTION,
            )
        else:
            logger.info("anomaly_detection_disabled")


# Initialize on import
AnomalyConfig.initialize()


# ========================================
# Singleton Anomaly Detection Engine
# ========================================

_anomaly_engine: Optional[AnomalyDetectionEngine] = None


def get_anomaly_engine() -> Optional[AnomalyDetectionEngine]:
    """
    Get singleton anomaly detection engine.
    
    Returns:
        AnomalyDetectionEngine instance or None if disabled
    """
    global _anomaly_engine
    
    if not AnomalyConfig.ANOMALY_DETECTION_ENABLED:
        return None
    
    if _anomaly_engine is None:
        try:
            _anomaly_engine = AnomalyDetectionEngine()
            logger.info("anomaly_engine_initialized")
        except Exception as e:
            logger.error("anomaly_engine_initialization_failed", error=str(e))
            return None
    
    return _anomaly_engine


# ========================================
# Anomaly Detection in Processing Pipeline
# ========================================

def detect_anomalies(
    email_id: str,
    sender: str,
    subject: str,
    body: str,
    urls: list,
    risk_score: float,
    tenant_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Detect anomalies in email during processing pipeline.
    
    Called after enrichment but before decision making.
    
    Args:
        email_id: Email identifier
        sender: Email sender address
        subject: Email subject
        body: Email body text
        urls: List of URLs found in email
        risk_score: ML-calculated risk score (0-100)
        tenant_id: Organization ID
    
    Returns:
        Dict with anomaly details if detected, None otherwise
    """
    engine = get_anomaly_engine()
    if not engine:
        return None
    
    try:
        # Create email features
        email_data = {
            "subject": subject,
            "body": body,
            "urls": urls,
            "risk_score": risk_score,
            "sender": sender,
        }
        
        # Analyze for anomalies
        anomaly_result = engine.analyze(email_data)
        
        if anomaly_result:
            logger.warning(
                "anomaly_detected",
                email_id=email_id,
                tenant_id=tenant_id,
                anomaly_type=anomaly_result.anomaly_type,
                confidence=anomaly_result.confidence,
                detection_method=anomaly_result.detection_method,
            )
            
            # Return anomaly details for downstream processing
            return {
                "anomaly_type": anomaly_result.anomaly_type,
                "confidence": anomaly_result.confidence,
                "detection_method": anomaly_result.detection_method,
                "details": anomaly_result.details,
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        return None
    
    except Exception as e:
        logger.error(
            "anomaly_detection_error",
            email_id=email_id,
            error=str(e),
            exc_info=True,
        )
        return None


def should_escalate_anomaly(anomaly_info: Dict[str, Any]) -> bool:
    """
    Determine if detected anomaly should be escalated to SOC.
    
    Args:
        anomaly_info: Anomaly details from detect_anomalies()
    
    Returns:
        True if should escalate, False if just log
    """
    if not anomaly_info:
        return False
    
    # Escalate high-confidence anomalies
    if anomaly_info["confidence"] >= AnomalyConfig.ANOMALY_CONFIDENCE_THRESHOLD:
        return True
    
    # Escalate certain anomaly types regardless of confidence
    escalate_types = {
        "sender_behavior_change",
        "high_new_sender_rate",
        "extreme_risk",
    }
    
    if anomaly_info["anomaly_type"] in escalate_types:
        return True
    
    return False


def handle_anomaly_alert(
    email_id: str,
    tenant_id: str,
    anomaly_info: Dict[str, Any],
):
    """
    Handle alert for detected anomaly.
    
    This could be extended to:
    - Send to SOC dashboard
    - Create incident ticket
    - Update risk scoring
    - Trigger additional checks
    
    Args:
        email_id: Email identifier
        tenant_id: Organization ID
        anomaly_info: Anomaly details
    """
    if not AnomalyConfig.ANOMALY_ALERT_ON_DETECTION:
        return
    
    try:
        # Log alert
        logger.warning(
            "anomaly_alert_triggered",
            email_id=email_id,
            tenant_id=tenant_id,
            anomaly_type=anomaly_info["anomaly_type"],
            confidence=anomaly_info["confidence"],
        )
        
        # Could integrate with:
        # - alerting.AlertManager.trigger_alert(...)
        # - soc_integration.send_to_soc_dashboard(...)
        # - incident tracking system
        
    except Exception as e:
        logger.error(
            "anomaly_alert_handling_failed",
            email_id=email_id,
            error=str(e),
        )


# ========================================
# Anomaly Statistics
# ========================================

def get_anomaly_statistics() -> Dict[str, Any]:
    """
    Get anomaly detection statistics.
    
    Returns:
        Dictionary with detection stats
    """
    engine = get_anomaly_engine()
    if not engine:
        return {
            "enabled": False,
            "total_analyzed": 0,
            "anomalies_detected": 0,
        }
    
    try:
        stats = engine.get_statistics()
        return {
            "enabled": True,
            **stats,
        }
    except Exception as e:
        logger.error("failed_to_get_anomaly_statistics", error=str(e))
        return {
            "enabled": True,
            "total_analyzed": 0,
            "anomalies_detected": 0,
            "error": str(e),
        }


def reset_anomaly_detection():
    """
    Reset anomaly detection engine (clear statistics).
    
    DANGER: Only use during testing or maintenance.
    """
    global _anomaly_engine
    
    logger.warning("anomaly_engine_reset_requested")
    
    # Clear detection data
    engine = get_anomaly_engine()
    if engine:
        try:
            # Re-initialize to clear state
            _anomaly_engine = AnomalyDetectionEngine()
            logger.warning("anomaly_engine_reset_complete")
        except Exception as e:
            logger.error("anomaly_engine_reset_failed", error=str(e))
