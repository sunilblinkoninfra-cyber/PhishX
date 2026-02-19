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
from typing import Optional, Any, Dict, List
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
from jwt_auth import TokenPayload, UserRole, TokenScope, JWTTokenManager
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
DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "00000000-0000-0000-0000-000000000000")

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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
    
    # Validate API key first (legacy mode)
    if api_key == API_KEY:
        return get_api_key_from_request(request)

    # Accept JWT access tokens for frontend compatibility
    jwt_payload = JWTTokenManager.validate_token(api_key)
    if jwt_payload:
        return f"jwt:{jwt_payload.user_id}"

    logger.security_event(
        "Invalid API key/token",
        severity="HIGH",
        ip=request.client.host if request.client else "unknown",
    )
    raise HTTPException(status_code=401, detail="Invalid API key/token")


def resolve_tenant(
    request: Request,
    x_tenant_id: str = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    Resolve tenant ID from request headers with validation.
    """
    if not x_tenant_id:
        logger.warning(
            "tenant_header_missing_using_default",
            default_tenant_id=DEFAULT_TENANT_ID,
            ip=request.client.host if request.client else "unknown",
        )
        x_tenant_id = DEFAULT_TENANT_ID
    
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


def _safe_json(value: Any) -> Dict[str, Any]:
    """Safely parse JSON payloads from DB rows."""
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {}
    return {}


def _as_iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return datetime.utcnow().isoformat()


def _risk_level_from_category(category: Optional[str]) -> str:
    category_u = (category or "COLD").upper()
    if category_u in ("HOT", "WARM", "COLD"):
        return category_u
    return "COLD"


def _risk_score_to_ten(score: Any) -> float:
    try:
        numeric = float(score or 0)
    except Exception:
        numeric = 0.0
    if numeric > 10:
        numeric = numeric / 10.0
    return round(max(0.0, min(10.0, numeric)), 1)


def _normalize_status(status: Optional[str]) -> str:
    mapping = {
        "OPEN": "NEW",
        "NEW": "NEW",
        "INVESTIGATING": "INVESTIGATING",
        "RESOLVED": "RESOLVED",
        "CONFIRMED": "CONFIRMED",
        "FALSE_POSITIVE": "FALSE_POSITIVE",
        "ESCALATED": "ESCALATED",
        "RELEASED": "RELEASED",
        "DELETED": "DELETED",
    }
    return mapping.get((status or "NEW").upper(), "NEW")


def _to_string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v) for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _build_alert_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert backend DB rows into frontend-ready alert shape."""
    findings = _safe_json(row.get("findings"))
    alert_id = str(row.get("alert_id") or row.get("id") or row.get("email_id"))
    email_id = str(row.get("email_id") or alert_id)

    sender = (
        findings.get("sender")
        or findings.get("from")
        or findings.get("mail_from")
        or "unknown@phishx.local"
    )
    recipients = _to_string_list(
        findings.get("recipient")
        or findings.get("to")
        or findings.get("recipients")
    )
    if not recipients:
        recipients = ["unknown@phishx.local"]
    subject = findings.get("subject") or f"Email {email_id}"
    body_preview = findings.get("body_preview") or findings.get("body") or ""
    if isinstance(body_preview, str) and len(body_preview) > 300:
        body_preview = body_preview[:300]
    urls = _to_string_list(findings.get("urls"))
    attachments_raw = findings.get("attachments")
    attachments: List[str] = []
    if isinstance(attachments_raw, list):
        for item in attachments_raw:
            if isinstance(item, dict):
                attachments.append(str(item.get("filename") or item.get("name") or "attachment"))
            else:
                attachments.append(str(item))

    category = _risk_level_from_category(row.get("category"))
    status = _normalize_status(row.get("status"))
    risk_score = _risk_score_to_ten(row.get("risk_score"))
    classification = findings.get("classification")
    if not classification:
        classification = "PHISHING" if category in ("HOT", "WARM") else "LEGITIMATE"
    classification = str(classification).upper()

    timestamp = (
        row.get("alert_created_at")
        or row.get("email_created_at")
        or row.get("created_at")
        or datetime.utcnow()
    )
    timestamp_iso = _as_iso(timestamp)

    return {
        "id": alert_id,
        "emailId": email_id,
        "timestamp": timestamp_iso,
        "from": sender,
        "to": recipients[0],
        "subject": subject,
        "bodyPreview": body_preview,
        "urls": urls,
        "attachments": attachments,
        "riskScore": risk_score,
        "riskLevel": category,
        "status": status,
        "classification": classification,
        "classifications": [classification],
        "metadata": {
            "id": alert_id,
            "timestamp": timestamp_iso,
            "sender": sender,
            "recipient": recipients,
            "subject": subject,
            "received": timestamp_iso,
            "bodyPreview": body_preview,
            "classifications": [classification],
        },
        "riskBreakdown": {
            "phishingScore": risk_score,
            "malwareScore": round(risk_score * 0.8, 1),
            "urlReputation": round(risk_score * 0.7, 1),
            "senderReputation": round(risk_score * 0.6, 1),
            "contentSuspicion": round(risk_score * 0.9, 1),
            "overallRisk": risk_score,
        },
        "auditHistory": [],
    }


def _fetch_alert_row(conn, alert_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            sa.id AS alert_id,
            sa.email_id,
            sa.category,
            sa.status,
            sa.created_at AS alert_created_at,
            sa.updated_at AS alert_updated_at,
            ed.risk_score,
            ed.findings,
            ed.decision,
            ed.created_at AS email_created_at
        FROM soc_alerts sa
        LEFT JOIN email_decisions ed ON sa.email_id = ed.id
        WHERE sa.tenant_id = %s AND sa.id = %s
        LIMIT 1
        """,
        (tenant_id, alert_id),
    )
    row = cur.fetchone()
    cur.close()
    return row


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
    request: Request,
    username: Optional[str] = None,
    password: Optional[str] = None,
    email: Optional[str] = None,
):
    """
    Authenticate user and issue JWT tokens.
    Supports query params and JSON body for frontend compatibility.
    """
    try:
        body_data: Dict[str, Any] = {}
        try:
            body_data = await request.json()
        except Exception:
            body_data = {}

        user_identifier = (
            username
            or email
            or body_data.get("username")
            or body_data.get("email")
            or ""
        )
        user_password = password or body_data.get("password") or ""

        if not user_identifier or not user_password:
            raise HTTPException(status_code=400, detail="username/email and password are required")

        from auth_integration import verify_password, UserRole, TokenScope

        if not verify_password(user_identifier, user_password):
            raise HTTPException(status_code=401, detail="Authentication failed")

        log_auth_event(
            event_type="login",
            user_id=user_identifier,
            tenant_id="default",
            status="success",
            ip_address=request.client.host if request.client else "unknown",
        )

        tokens = create_jwt_tokens(
            user_id=user_identifier,
            tenant_id="default",
            role=UserRole.API_CLIENT,
            scopes=[TokenScope.READ, TokenScope.WRITE, TokenScope.EMAIL_INGEST],
        )

        return {
            "status": "ok",
            "data": tokens,
            "user": {
                "id": user_identifier,
                "email": user_identifier,
                "name": user_identifier.split("@")[0] if "@" in user_identifier else user_identifier,
                "role": "SOC_ANALYST",
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_failed", error=str(e))
        log_auth_event(
            event_type="login",
            user_id=username or email or "unknown",
            tenant_id="unknown",
            status="failure",
            details={"error": str(e)},
        )
        raise HTTPException(status_code=401, detail="Authentication failed")


@app.post("/auth/refresh")
async def refresh_token(
    request: Request,
) -> dict:
    """
    Refresh expired access token using refresh token.
    Supports query params and JSON body payloads.
    """
    try:
        body_data: Dict[str, Any] = {}
        try:
            body_data = await request.json()
        except Exception:
            body_data = {}

        refresh_token_id = (
            request.query_params.get("refresh_token_id")
            or body_data.get("refresh_token_id")
            or body_data.get("refreshToken")
            or ""
        )
        if not refresh_token_id:
            raise HTTPException(status_code=400, detail="refresh_token_id is required")

        user_id = "default_user"
        tenant_id = "default"

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

    except HTTPException:
        raise
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


@app.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)) -> dict:
    """Return current authenticated user profile."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token_or_key = authorization
    if token_or_key.lower().startswith("bearer "):
        token_or_key = token_or_key.split(" ", 1)[1].strip()

    if token_or_key == API_KEY:
        return {
            "id": "api-client",
            "email": "api-client@phishx.local",
            "name": "API Client",
            "role": "SOC_ANALYST",
        }

    payload = JWTTokenManager.validate_token(token_or_key)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "id": payload.user_id,
        "email": payload.user_id,
        "name": payload.user_id.split("@")[0] if "@" in payload.user_id else payload.user_id,
        "role": "SOC_ANALYST",
        "tenantId": payload.tenant_id,
    }


@app.get("/auth/validate")
async def auth_validate(authorization: Optional[str] = Header(None)) -> dict:
    """Validate API key/JWT token and return boolean status."""
    if not authorization:
        return {"valid": False}

    token_or_key = authorization
    if token_or_key.lower().startswith("bearer "):
        token_or_key = token_or_key.split(" ", 1)[1].strip()

    if token_or_key == API_KEY:
        return {"valid": True}

    return {"valid": JWTTokenManager.validate_token(token_or_key) is not None}


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
        health = SystemHealthCheck.get_full_health()
        
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
        readiness = SystemHealthCheck.get_readiness()
        status_code = 200 if readiness.get("ready") else 503
        return readiness
    except Exception:
        return {"ready": False}


@app.get("/alive")
async def liveness_probe() -> dict:
    """Kubernetes liveness probe"""
    try:
        liveness = SystemHealthCheck.get_liveness()
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
# Frontend Compatibility Endpoints
# ========================================

@app.get("/alerts")
async def list_alerts(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
    riskLevels: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List alerts in frontend-friendly shape."""
    try:
        categories = []
        if riskLevels:
            categories = [v.strip().upper() for v in riskLevels.split(",") if v.strip()]

        conn = get_db()
        cur = conn.cursor()

        where_sql = ["sa.tenant_id = %s"]
        params: List[Any] = [tenant_id]

        if categories:
            where_sql.append("sa.category = ANY(%s)")
            params.append(categories)

        if status:
            status_values = [v.strip().upper() for v in status.split(",") if v.strip()]
            backend_statuses = ["OPEN" if v == "NEW" else v for v in status_values]
            if backend_statuses:
                where_sql.append("sa.status = ANY(%s)")
                params.append(backend_statuses)

        where_clause = " AND ".join(where_sql)

        cur.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM soc_alerts sa
            WHERE {where_clause}
            """,
            params,
        )
        total_row = cur.fetchone() or {}
        total = int(total_row.get("total", 0))

        cur.execute(
            f"""
            SELECT
                sa.id AS alert_id,
                sa.email_id,
                sa.category,
                sa.status,
                sa.created_at AS alert_created_at,
                sa.updated_at AS alert_updated_at,
                ed.risk_score,
                ed.findings,
                ed.decision,
                ed.created_at AS email_created_at
            FROM soc_alerts sa
            LEFT JOIN email_decisions ed ON sa.email_id = ed.id
            WHERE {where_clause}
            ORDER BY sa.created_at DESC
            LIMIT %s OFFSET %s
            """,
            [*params, limit, offset],
        )
        rows = cur.fetchall() or []
        cur.close()
        conn.close()

        items = [_build_alert_payload(dict(row)) for row in rows]
        return {"items": items, "total": total}

    except Exception as e:
        logger.error("list_alerts_failed", error=str(e))
        if ENVIRONMENT == "development":
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Failed to list alerts")


@app.get("/logs")
async def list_logs(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List COLD category decisions as informational logs."""
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM email_decisions
            WHERE tenant_id = %s AND category = 'COLD'
            """,
            (tenant_id,),
        )
        total_row = cur.fetchone() or {}
        total = int(total_row.get("total", 0))

        cur.execute(
            """
            SELECT
                ed.id AS alert_id,
                ed.id AS email_id,
                ed.category,
                'RESOLVED' AS status,
                ed.created_at AS email_created_at,
                ed.created_at AS alert_created_at,
                ed.risk_score,
                ed.findings,
                ed.decision
            FROM email_decisions ed
            WHERE ed.tenant_id = %s
              AND ed.category = 'COLD'
            ORDER BY ed.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (tenant_id, limit, offset),
        )
        rows = cur.fetchall() or []
        cur.close()
        conn.close()

        items = [_build_alert_payload(dict(row)) for row in rows]
        return {"items": items, "total": total}

    except Exception as e:
        logger.error("list_logs_failed", error=str(e))
        if ENVIRONMENT == "development":
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Failed to list logs")


@app.get("/alerts/{alert_id}")
async def get_alert(
    request: Request,
    alert_id: str,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Fetch a single alert by ID."""
    try:
        conn = get_db()
        row = _fetch_alert_row(conn, alert_id, tenant_id)
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")

        return _build_alert_payload(dict(row))

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_alert_failed", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch alert")


@app.post("/alerts/{alert_id}/status")
async def update_alert_status(
    request: Request,
    alert_id: str,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Update alert status with optional notes."""
    try:
        payload = await request.json()
        desired_status = _normalize_status(payload.get("status"))
        notes = str(payload.get("notes") or "")
        changed_by = str(payload.get("changedBy") or payload.get("changed_by") or "system")

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE soc_alerts
            SET status = %s, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (desired_status, alert_id, tenant_id),
        )
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Alert not found")

        cur.execute(
            """
            INSERT INTO soc_actions (id, alert_id, action, acted_by, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                alert_id,
                "status_change",
                json.dumps({"analyst": changed_by, "tenant_id": tenant_id}),
                notes,
            ),
        )

        conn.commit()
        row = _fetch_alert_row(conn, alert_id, tenant_id)
        cur.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")

        return _build_alert_payload(dict(row))

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_alert_status_failed", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update alert status")


@app.post("/alerts/{alert_id}/notes")
async def add_alert_note(
    request: Request,
    alert_id: str,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Append an analyst note for an alert."""
    try:
        payload = await request.json()
        note_text = str(payload.get("notes") or payload.get("text") or "").strip()
        added_by = str(payload.get("addedBy") or payload.get("added_by") or "system")

        if not note_text:
            raise HTTPException(status_code=400, detail="Note text is required")

        action_id = str(uuid.uuid4())
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO soc_actions (id, alert_id, action, acted_by, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                action_id,
                alert_id,
                "note",
                json.dumps({"analyst": added_by, "tenant_id": tenant_id}),
                note_text,
            ),
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "id": action_id,
            "alertId": alert_id,
            "text": note_text,
            "addedBy": added_by,
            "createdAt": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("add_alert_note_failed", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to add note")


@app.post("/alerts/{alert_id}/release")
async def release_alert(
    request: Request,
    alert_id: str,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Release alert from quarantine workflow."""
    try:
        payload = await request.json()
        released_by = str(payload.get("releasedBy") or payload.get("released_by") or "system")

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE soc_alerts
            SET status = 'RELEASED', updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (alert_id, tenant_id),
        )
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Alert not found")

        cur.execute(
            """
            INSERT INTO soc_actions (id, alert_id, action, acted_by, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                alert_id,
                "release",
                json.dumps({"analyst": released_by, "tenant_id": tenant_id}),
                "Released from quarantine",
            ),
        )

        conn.commit()
        row = _fetch_alert_row(conn, alert_id, tenant_id)
        cur.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")

        return _build_alert_payload(dict(row))

    except HTTPException:
        raise
    except Exception as e:
        logger.error("release_alert_failed", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to release alert")


@app.delete("/alerts/{alert_id}")
async def delete_alert(
    request: Request,
    alert_id: str,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Soft-delete alert by transitioning status to DELETED."""
    try:
        payload: Dict[str, Any] = {}
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        deleted_by = str(payload.get("deletedBy") or payload.get("deleted_by") or "system")

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE soc_alerts
            SET status = 'DELETED', updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (alert_id, tenant_id),
        )
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Alert not found")

        cur.execute(
            """
            INSERT INTO soc_actions (id, alert_id, action, acted_by, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                alert_id,
                "delete",
                json.dumps({"analyst": deleted_by, "tenant_id": tenant_id}),
                "Alert deleted",
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

        return {"status": "ok", "id": alert_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_alert_failed", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete alert")


@app.get("/audit")
async def list_audit_entries(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
    limit: int = 500,
    offset: int = 0,
) -> dict:
    """List SOC actions as frontend audit entries."""
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM soc_actions sact
            JOIN soc_alerts sa ON sa.id = sact.alert_id
            WHERE sa.tenant_id = %s
            """,
            (tenant_id,),
        )
        total_row = cur.fetchone() or {}
        total = int(total_row.get("total", 0))

        cur.execute(
            """
            SELECT
                sact.id,
                sact.alert_id,
                sact.action,
                sact.notes,
                sact.acted_by,
                sact.created_at
            FROM soc_actions sact
            JOIN soc_alerts sa ON sa.id = sact.alert_id
            WHERE sa.tenant_id = %s
            ORDER BY sact.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (tenant_id, limit, offset),
        )
        rows = cur.fetchall() or []
        cur.close()
        conn.close()

        action_map = {
            "note": "NOTED",
            "release": "RELEASED",
            "resolve": "RESOLVED",
            "delete": "DELETED",
            "escalate": "ESCALATED",
            "status_change": "UPDATED",
        }
        items: List[Dict[str, Any]] = []
        for row in rows:
            actor_meta = _safe_json(row.get("acted_by"))
            actor_name = (
                actor_meta.get("analyst")
                or actor_meta.get("user")
                or actor_meta.get("user_id")
                or "system"
            )
            actor_email = actor_meta.get("email")
            if not actor_email:
                actor_email = actor_name if "@" in str(actor_name) else f"{actor_name}@phishx.local"

            raw_action = str(row.get("action") or "")
            action = action_map.get(raw_action.lower(), raw_action.upper() or "VIEWED")
            ts = row.get("created_at") or datetime.utcnow()
            ts_iso = _as_iso(ts)
            items.append(
                {
                    "id": str(row.get("id")),
                    "timestamp": ts_iso,
                    "userId": str(actor_name),
                    "userName": str(actor_name),
                    "userEmail": str(actor_email),
                    "action": action,
                    "alertId": str(row.get("alert_id")),
                    "notes": row.get("notes"),
                }
            )

        return {"items": items, "total": total}

    except Exception as e:
        logger.error("list_audit_entries_failed", error=str(e))
        if ENVIRONMENT == "development":
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Failed to list audit entries")


@app.post("/exports")
async def create_export_job(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Create an export job placeholder for frontend workflows."""
    payload = await request.json()
    return {
        "jobId": str(uuid.uuid4()),
        "status": "QUEUED",
        "format": str(payload.get("format") or "CSV"),
        "createdAt": datetime.utcnow().isoformat(),
    }


@app.get("/metrics/dashboard")
async def dashboard_metrics(
    request: Request,
    authorized: str = Depends(authenticate_request),
    tenant_id: str = Depends(resolve_tenant),
) -> dict:
    """Return dashboard metric summary in frontend-friendly format."""
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT category, COUNT(*) AS count
            FROM email_decisions
            WHERE tenant_id = %s
            GROUP BY category
            """,
            (tenant_id,),
        )
        counts = {"COLD": 0, "WARM": 0, "HOT": 0}
        for row in cur.fetchall() or []:
            counts[str(row.get("category", "")).upper()] = int(row.get("count", 0))

        cur.execute(
            """
            SELECT COUNT(*) AS count
            FROM email_decisions
            WHERE tenant_id = %s
              AND created_at::date = CURRENT_DATE
            """,
            (tenant_id,),
        )
        today_count = int((cur.fetchone() or {}).get("count", 0))

        cur.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM soc_alerts
            WHERE tenant_id = %s
            GROUP BY status
            """,
            (tenant_id,),
        )
        status_counts: Dict[str, int] = {}
        for row in cur.fetchall() or []:
            normalized = _normalize_status(row.get("status"))
            status_counts[normalized] = status_counts.get(normalized, 0) + int(row.get("count", 0))

        cur.close()
        conn.close()

        total_alerts = counts["COLD"] + counts["WARM"] + counts["HOT"]
        return {
            "totalAlerts": total_alerts,
            "newAlerts": today_count,
            "hotAlerts": counts["HOT"],
            "warmAlerts": counts["WARM"],
            "coldAlerts": counts["COLD"],
            "quarantinedEmails": counts["HOT"],
            "alertsByRisk": counts,
            "alertsByStatus": status_counts,
            "topSenders": [],
            "topDetectedThreats": [],
        }

    except Exception as e:
        logger.error("dashboard_metrics_failed", error=str(e))
        if ENVIRONMENT == "development":
            return {
                "totalAlerts": 0,
                "newAlerts": 0,
                "hotAlerts": 0,
                "warmAlerts": 0,
                "coldAlerts": 0,
                "quarantinedEmails": 0,
                "alertsByRisk": {"COLD": 0, "WARM": 0, "HOT": 0},
                "alertsByStatus": {},
                "topSenders": [],
                "topDetectedThreats": [],
            }
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard metrics")


@app.patch("/users/{user_id}")
async def update_user_profile(
    request: Request,
    user_id: str,
    authorized: str = Depends(authenticate_request),
) -> dict:
    """Lightweight profile update endpoint for settings page."""
    payload = await request.json()
    return {
        "id": user_id,
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": "SOC_ANALYST",
    }


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
