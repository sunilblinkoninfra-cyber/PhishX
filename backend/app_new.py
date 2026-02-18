"""
PhishX - Enterprise Phishing Detection Platform
Phase 1: Foundation with Async Processing

Main API Gateway application with:
- Rate limiting (IP, API key, tenant)
- Input validation (Pydantic)
- Structured logging
- Async task processing (Celery)
- Comprehensive error handling
- Security hardening
"""

import os
import uuid
import json
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

import requests
from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# PhishX imports
from db import get_db
from log_config import logger
from validators import (
    EmailIngestRequest,
    SMTPEnforceRequest,
    GraphEnforceRequest,
    EmailDecisionResponse,
    HealthResponse,
    ErrorResponse,
    EmailCategory,
    Decision,
)
from rate_limiter import (
    limiter,
    rate_limit_by_ip,
    rate_limit_by_key,
    get_api_key_from_request,
    DDoSProtection,
)
from tasks import process_email
from task_queue import get_queue_stats

# Phase 2: Resilience & Monitoring
from circuit_breaker import circuit_breaker, get_all_breaker_metrics
from metrics import (
    track_request_metrics,
    track_email_metrics,
    track_external_service,
    api_requests_total,
    email_decisions_total,
    api_request_duration_seconds,
    get_metric_summary,
)
from health_check import SystemHealthCheck, ComponentHealthCheck
from timeout_manager import TimeoutConfig, RequestWithTimeout, async_timeout
from alerting import AlertManager, AlertEvaluator, AlertSeverity, AlertSource
from request_signing import RequestVerifier, RequestSigner

# Phase 3: Advanced Security & High Availability
from auth_integration import (
    get_current_user,
    require_scope,
    require_admin,
    create_jwt_tokens,
    log_auth_event,
    JWTConfig,
)
from jwt_auth import TokenPayload, UserRole, TokenScope
from anomaly_integration import (
    detect_anomalies,
    should_escalate_anomaly,
    get_anomaly_statistics,
)
from shadow_integration import (
    create_shadow_experiment,
    get_active_experiments,
    get_active_canaries,
)

# ========================================
# Environment Configuration
# ========================================

API_KEY = os.getenv("API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
NLP_SERVICE_URL = os.getenv("NLP_SERVICE_URL")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if not API_KEY:
    raise RuntimeError("API_KEY environment variable is required")

# ========================================
# Startup & Shutdown Events
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info(
        "startup",
        environment=ENVIRONMENT,
        service="PhishX",
        version="1.0.0",
    )
    yield
    # Shutdown
    logger.info("shutdown", service="PhishX")


# ========================================
# FastAPI Application
# ========================================

app = FastAPI(
    title="PhishX - Enterprise Phishing Detection",
    version="1.0.0",
    docs_url=None,  # Disable in production
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter

# ========================================
# Middleware Setup
# ========================================

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# Custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.warning(
        "validation_error",
        path=request.url.path,
        errors=exc.errors(),
        ip=request.client.host if request.client else "unknown",
    )
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Validation error",
            "details": exc.errors(),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(
        "http_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        "unhandled_exception",
        error=str(exc),
        path=request.url.path,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
        },
    )


# ========================================
# Authentication & Authorization
# ========================================

def authenticate_request(request: Request) -> str:
    """
    Authenticate API request using API key.
    Returns API key hash for rate limiting.
    """
    auth_header = request.headers.get("Authorization", "").strip()
    
    if not auth_header:
        logger.security_event(
            "Missing authentication header",
            severity="HIGH",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Missing API key")
    
    # Extract API key (support both "Bearer key" and plain "key")
    api_key = auth_header
    if api_key.lower().startswith("bearer "):
        api_key = api_key.split(" ", 1)[1].strip()
    
    # Validate API key
    if api_key != API_KEY:
        logger.security_event(
            "Invalid API key",
            severity="HIGH",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return get_api_key_from_request(request)


def resolve_tenant(
    request: Request,
    x_tenant_id: str = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    Resolve tenant ID from request headers with validation.
    """
    if not x_tenant_id:
        logger.security_event(
            "Missing tenant ID",
            severity="MEDIUM",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=400, detail="X-Tenant-ID header required")
    
    # Parse as UUID
    import uuid as uuid_module
    try:
        uuid_module.UUID(x_tenant_id)
    except ValueError:
        logger.security_event(
            "Invalid tenant ID format",
            severity="MEDIUM",
            tenant_id=x_tenant_id,
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=400, detail="Invalid tenant ID format")
    
    return x_tenant_id


def get_active_policy(tenant_id: str) -> dict:
    """Retrieve active risk policy for tenant"""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT cold_threshold, warm_threshold, weights
            FROM tenant_policies
            WHERE tenant_id = %s AND active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """, (tenant_id,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            # Default policy
            return {
                "cold_threshold": 40,
                "warm_threshold": 75,
                "weights": {"nlp": 0.4, "url": 0.4, "heuristic": 0.2},
            }
        
        return {
            "cold_threshold": int(row[0]),
            "warm_threshold": int(row[1]),
            "weights": json.loads(row[2]) if row[2] else {},
        }
    
    except Exception as e:
        logger.error(
            "policy_retrieval_failed",
            tenant_id=tenant_id,
            error=str(e),
        )
        # Return safe defaults
        return {
            "cold_threshold": 40,
            "warm_threshold": 75,
            "weights": {"nlp": 0.4, "url": 0.4, "heuristic": 0.2},
        }


def call_nlp_service(subject: str, body: str) -> dict:
    """
    Call external NLP service for phishing text analysis.
    Protected with circuit breaker and timeout.
    """
    if not NLP_SERVICE_URL:
        logger.debug("nlp_service_disabled")
        return {"text_ml_score": 0.0, "model_version": "disabled"}
    
    @circuit_breaker(name="nlp_service", failure_threshold=5, recovery_timeout=60)
    def _call_nlp():
        try:
            response = RequestWithTimeout.post(
                NLP_SERVICE_URL,
                timeout=TimeoutConfig.NLP_SERVICE_TIMEOUT,
                json={"subject": subject, "body": body},
                headers={"User-Agent": "PhishX/1.0"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.external_service_failure("nlp_service", str(e))
            raise
    
    try:
        return _call_nlp()
    except Exception:
        logger.warning("nlp_service_unavailable")
        return {"text_ml_score": 0.0, "model_version": "error"}


# ========================================
# Phase 3: Authentication Endpoints (JWT)
# ========================================

@app.post("/auth/login")
async def login(
    username: str,
    password: str,
    request: Request,
) -> dict:
    """
    Authenticate user and issue JWT tokens.
    
    Args:
        username: User identifier
        password: User password
    
    Returns:
        JWT access token and refresh token
    """
    try:
        from auth_integration import verify_password, UserRole, TokenScope
        
        # TODO: Verify against user database (stub for now)
        # In production: Hash password, check against database
        
        # Log authentication attempt
        log_auth_event(
            event_type="login",
            user_id=username,
            tenant_id="default",  # Would come from user DB
            status="success",
            ip_address=request.client.host if request.client else "unknown",
        )
        
        # Create tokens
        tokens = create_jwt_tokens(
            user_id=username,
            tenant_id="default",
            role=UserRole.API_CLIENT,
            scopes=[TokenScope.READ, TokenScope.WRITE, TokenScope.EMAIL_INGEST],
        )
        
        return {
            "status": "ok",
            "data": tokens,
        }
    
    except Exception as e:
        logger.error("login_failed", error=str(e))
        log_auth_event(
            event_type="login",
            user_id=username,
            tenant_id="unknown",
            status="failure",
            details={"error": str(e)},
        )
        raise HTTPException(status_code=401, detail="Authentication failed")


@app.post("/auth/refresh")
async def refresh_token(
    refresh_token_id: str,
    request: Request,
) -> dict:
    """
    Refresh expired access token using refresh token.
    
    Args:
        refresh_token_id: Refresh token from login response
    
    Returns:
        New JWT access token
    """
    try:
        from jwt_auth import JWTTokenManager
        
        # Validate refresh token and get user info
        # In production: Look up user info from refresh token ID
        user_id = "default_user"
        tenant_id = "default"
        
        # Generate new access token
        new_access_token = JWTTokenManager.generate_access_token(
            user_id=user_id,
            tenant_id=tenant_id,
            role=UserRole.API_CLIENT,
            scopes=[TokenScope.READ, TokenScope.WRITE, TokenScope.EMAIL_INGEST],
        )
        
        log_auth_event(
            event_type="refresh",
            user_id=user_id,
            tenant_id=tenant_id,
            status="success",
        )
        
        return {
            "status": "ok",
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": JWTConfig.JWT_ACCESS_TOKEN_EXPIRE * 60,
        }
    
    except Exception as e:
        logger.error("token_refresh_failed", error=str(e))
        raise HTTPException(status_code=401, detail="Token refresh failed")


@app.post("/auth/logout")
async def logout(
    user: Optional[TokenPayload] = Depends(get_current_user),
    request: Request = None,
) -> dict:
    """
    Logout user and revoke tokens.
    
    Returns:
        Confirmation message
    """
    try:
        if user:
            from jwt_auth import JWTTokenManager
            
            # Revoke all tokens for user
            JWTTokenManager.revoke_all_user_tokens(user.user_id)
            
            log_auth_event(
                event_type="logout",
                user_id=user.user_id,
                tenant_id=user.tenant_id,
                status="success",
            )
        
        return {"status": "ok", "message": "Logged out successfully"}
    
    except Exception as e:
        logger.error("logout_failed", error=str(e))
        return {"status": "error", "message": str(e)}


# ========================================
# Health & Status Endpoints
# ========================================

@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Quick health check endpoint (DB + Redis only).
    Lightweight check for Kubernetes liveness probes.
    """
    try:
        # ComponentHealthCheck methods are synchronous; call directly.
        health = ComponentHealthCheck.check_database()
        redis_health = ComponentHealthCheck.check_redis()

        def _norm_status(s):
            if hasattr(s, "value"):
                return s.value
            return str(s).lower()

        status = "ok" if (_norm_status(health.get("status")) == "healthy" and _norm_status(redis_health.get("status")) == "healthy") else "degraded"

        return HealthResponse(
            status=status,
            version="1.0.0",
            components={
                "database": _norm_status(health.get("status")),
                "redis": _norm_status(redis_health.get("status")),
            },
        )
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return HealthResponse(
            status="degraded",
            version="1.0.0",
            components={"error": str(e)},
        )


@app.get("/health/full")
async def health_check_full() -> dict:
    """
    Comprehensive health check with all components.
    Detailed diagnostics including queue depth, external services, circuit breakers.
    """
    try:
        health = await SystemHealthCheck.get_full_health()
        
        return {
            "status": health.get("status", "unknown"),
            "timestamp": health.get("timestamp"),
            "components": health.get("components", {}),
            "critical_issues": health.get("critical_issues", []),
            "circuit_breakers": get_all_breaker_metrics(),
        }
    except Exception as e:
        logger.error("full_health_check_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Health check failed")


@app.get("/ready")
async def readiness_probe() -> dict:
    """Kubernetes readiness probe"""
    try:
        readiness = await SystemHealthCheck.get_readiness()
        status_code = 200 if readiness.get("ready") else 503
        return readiness
    except Exception:
        return {"ready": False}


@app.get("/alive")
async def liveness_probe() -> dict:
    """Kubernetes liveness probe"""
    try:
        liveness = await SystemHealthCheck.get_liveness()
        status_code = 200 if liveness.get("alive") else 503
        return liveness
    except Exception:
        return {"alive": False}


@app.get("/metrics")
async def prometheus_metrics() -> str:
    """
    Prometheus metrics endpoint.
    Expose all system metrics in Prometheus format.
    """
    try:
        from prometheus_client import CollectorRegistry, generate_latest
        
        # Get metrics in Prometheus format
        metrics_output = generate_latest()
        
        return metrics_output.decode('utf-8')
    except Exception as e:
        logger.error("metrics_export_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export metrics")


@app.get("/metrics/summary")
async def metrics_summary(
    authorized: str = Depends(authenticate_request),
) -> dict:
    """Human-readable metrics summary for admin dashboard"""
    try:
        summary = get_metric_summary()
        return {
            "status": "ok",
            "metrics": summary,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("metrics_summary_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get metrics summary")


@app.get("/queue/status")
async def queue_status(
    authorized: str = Depends(authenticate_request),
) -> dict:
    """
    Get message queue statistics.
    Admin endpoint for monitoring.
    """
    try:
        stats = get_queue_stats()
        return {
            "status": "ok",
            "queues": stats,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("queue_status_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get queue status")


# ========================================
# Phase 3: Anomaly Detection Endpoints
# ========================================

@app.get("/anomalies/stats")
async def get_anomaly_stats(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    Get anomaly detection statistics.
    Shows detected anomalies, rates, and system health.
    """
    try:
        stats = get_anomaly_statistics()
        return {
            "status": "ok",
            "data": stats,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error("anomaly_stats_failed", error=str(e))
        return {
            "status": "error",
            "message": str(e),
        }


# ========================================
# Phase 3: Shadow Models & Experiments
# ========================================

@app.get("/experiments/active")
async def get_active_shadow_experiments(
    user: Optional[TokenPayload] = Depends(get_current_user),
) -> dict:
    """
    Get list of active shadow model experiments.
    """
    try:
        experiments = get_active_experiments()
        return {
            "status": "ok",
            "experiments": experiments or [],
            "count": len(experiments) if experiments else 0,
        }
    except Exception as e:
        logger.error("get_experiments_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get experiments")


@app.get("/deployments/canary")
async def get_canary_deployments(
    user: Optional[TokenPayload] = Depends(get_current_user),
) -> dict:
    """
    Get list of active canary deployments.
    """
    try:
        canaries = get_active_canaries()
        return {
            "status": "ok",
            "deployments": canaries or [],
            "count": len(canaries) if canaries else 0,
        }
    except Exception as e:
        logger.error("get_canaries_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get deployments")


# ========================================
# Email Ingestion Endpoint
# ========================================

@app.post("/ingest/email", response_model=EmailDecisionResponse)
@track_request_metrics(endpoint="/ingest/email", method="POST")
async def ingest_email(
    request: Request,
    payload: EmailIngestRequest,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> EmailDecisionResponse:
    """
    Ingest email for phishing analysis.
    
    Queues asynchronous processing via Celery.
    Returns immediate acknowledgment with email_id.
    
    Returns:
        EmailDecisionResponse with tentative risk assessment
    """
    
    # DDoS protection check
    if DDoSProtection.detect_suspicious_pattern(request):
        logger.security_event(
            "Suspicious request pattern detected",
            severity="MEDIUM",
            ip=request.client.host if request.client else "unknown",
        )
    
    # Generate email ID
    email_id = str(uuid.uuid4())
    
    # Get tenant policy
    policy = get_active_policy(tenant_id)
    
    # Queue async processing
    task = process_email.apply_async(
        args=(
            email_id,
            payload.subject,
            payload.sender,
            payload.body,
            payload.urls,
            tenant_id,
            payload.priority.value,
        ),
        priority=3 if payload.priority.value == "high" else 5,
    )
    
    logger.email_decision(
        email_id=email_id,
        risk_score=0,
        category="PENDING",
        tenant_id=tenant_id,
        task_id=task.id,
        urls_count=len(payload.urls),
        attachments_count=len(payload.attachments),
    )
    
    return EmailDecisionResponse(
        email_id=email_id,
        risk_score=0,
        category=EmailCategory.COLD,
        decision=Decision.ALLOW,
        findings={"status": "processing", "task_id": task.id},
        timestamp=datetime.utcnow().isoformat(),
    )


# ========================================
# SMTP Enforcement Endpoint
# ========================================

@app.post("/enforce/smtp")
@track_request_metrics(endpoint="/enforce/smtp", method="POST")
async def enforce_smtp(
    request: Request,
    payload: SMTPEnforceRequest,
    authorized: str = Depends(authenticate_request),
) -> dict:
    """
    SMTP policy enforcement.
    Called by mail transfer agents (Postfix, Sendmail).
    
    Returns SMTP result codes (250=accept, 550=reject).
    """
    
    email_id = str(uuid.uuid4())
    
    logger.info(
        "smtp_enforce_request",
        email_id=email_id,
        sender=payload.mail_from,
        tenant_id=payload.tenant_id,
    )
    
    # Queue for processing
    task = process_email.apply_async(
        args=(
            email_id,
            payload.subject,
            payload.mail_from,
            payload.body,
            payload.urls,
            payload.tenant_id,
            "high",  # SMTP gets high priority
        ),
        priority=2,
    )
    
    # Note: In production, you'd wait for result with timeout
    # For now, return safe default
    return {
        "smtp_code": 250,
        "message": "Accepted",
        "email_id": email_id,
        "task_id": task.id,
    }


# ========================================
# Graph API Enforcement Endpoint
# ========================================

@app.post("/enforce/graph")
@track_request_metrics(endpoint="/enforce/graph", method="POST")
async def enforce_graph(
    request: Request,
    payload: GraphEnforceRequest,
    authorized: str = Depends(authenticate_request),
) -> dict:
    """
    Microsoft Graph API enforcement.
    Called by Microsoft 365 mail flow rules.
    """
    
    email_id = str(uuid.uuid4())
    
    logger.info(
        "graph_enforce_request",
        email_id=email_id,
        sender=payload.sender,
        tenant_id=payload.tenant_id,
    )
    
    # Queue for async processing
    task = process_email.apply_async(
        args=(
            email_id,
            payload.subject,
            payload.sender,
            payload.body,
            payload.urls,
            payload.tenant_id,
            "normal",
        ),
    )
    
    return {
        "status": "queued",
        "email_id": email_id,
        "task_id": task.id,
    }


# ========================================
# SOC Dashboard Endpoints
# ========================================

@app.get("/soc/alerts")
@track_request_metrics(endpoint="/soc/alerts", method="GET")
async def get_soc_alerts(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
    status: Optional[str] = "OPEN",
    limit: int = 100,
) -> dict:
    """Get open alerts for SOC dashboard"""
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        query = """
            SELECT id, email_id, category, status, created_at, updated_at
            FROM soc_alerts
            WHERE tenant_id = %s
        """
        params = [tenant_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        alerts = [dict(row) for row in rows]
        
        return {
            "status": "ok",
            "count": len(alerts),
            "alerts": alerts,
        }
    
    except Exception as e:
        logger.error("get_soc_alerts_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@app.post("/soc/alert/{alert_id}/action")
@track_request_metrics(endpoint="/soc/alert/action", method="POST")
async def soc_alert_action(
    request: Request,
    alert_id: str,
    action: str,  # "resolve", "escalate", "release"
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Record SOC analyst action on alert"""
    
    try:
        action_id = str(uuid.uuid4())
        
        conn = get_db()
        cur = conn.cursor()
        
        # Record action (immutable audit log)
        cur.execute("""
            INSERT INTO soc_actions (id, alert_id, action, acted_by, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (
            action_id,
            alert_id,
            action,
            json.dumps({"analyst": "system", "tenant_id": tenant_id}),
        ))
        
        # Update alert status
        if action == "resolve":
            new_status = "RESOLVED"
        elif action == "escalate":
            new_status = "ESCALATED"
        else:
            new_status = "RELEASED"
        
        cur.execute("""
            UPDATE soc_alerts SET status = %s, updated_at = NOW() WHERE id = %s
        """, (new_status, alert_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        logger.audit(
            "soc_action",
            action_id=action_id,
            alert_id=alert_id,
            action=action,
            tenant_id=tenant_id,
        )
        
        return {
            "status": "ok",
            "action_id": action_id,
            "alert_status": new_status,
        }
    
    except Exception as e:
        logger.error("soc_action_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record action")


# ========================================
# Entrypoint
# ========================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("WORKERS", 4))
    
    uvicorn.run(
        "app_new:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        log_level="info",
        reload=ENVIRONMENT == "development",
    )
