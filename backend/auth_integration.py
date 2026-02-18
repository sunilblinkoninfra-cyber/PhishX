"""
Phase 3 JWT Authentication Integration

Bridge between JWT auth system and FastAPI application.
Provides dependency injection for authenticated requests.
"""

import os
from typing import Optional
from functools import lru_cache

from fastapi import Depends, HTTPException, Request, Header
from jwt_auth import (
    JWTTokenManager,
    PasswordManager,
    AuthorizationManager,
    TokenScope,
    UserRole,
    TokenPayload,
)
from log_config import logger


# ========================================
# Configuration
# ========================================

class JWTConfig:
    """JWT configuration from environment"""
    
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRE = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE", 15))
    JWT_REFRESH_TOKEN_EXPIRE = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE", 30))
    ENABLE_JWT_AUTH = os.getenv("ENABLE_JWT_AUTH", "false").lower() == "true"
    
    @classmethod
    def validate(cls):
        """Validate JWT configuration"""
        if cls.ENABLE_JWT_AUTH and not cls.JWT_SECRET_KEY:
            raise RuntimeError("JWT_SECRET_KEY environment variable required when JWT auth is enabled")


# Validate on import
JWTConfig.validate()


# ========================================
# Authentication Dependencies
# ========================================

async def get_current_user(
    authorization: Optional[str] = Header(None),
    request: Request = None,
) -> Optional[TokenPayload]:
    """
    Dependency for FastAPI endpoints.
    Validates JWT token from Authorization header.
    
    Usage:
        @app.get("/protected")
        async def protected_endpoint(user: TokenPayload = Depends(get_current_user)):
            return {"user_id": user.user_id}
    
    Returns:
        TokenPayload with user info, or raises 401 if token invalid
    """
    
    # If JWT auth disabled, return None (legacy API key auth)
    if not JWTConfig.ENABLE_JWT_AUTH:
        return None
    
    if not authorization:
        logger.security_event(
            "Missing authorization header",
            severity="MEDIUM",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    # Extract token from "Bearer <token>"
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.security_event(
            "Invalid authorization format",
            severity="MEDIUM",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = parts[1]
    
    # Validate token
    payload = JWTTokenManager.validate_token(token)
    if not payload:
        logger.security_event(
            "Invalid JWT token",
            severity="MEDIUM",
            ip=request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    logger.info(
        "user_authenticated",
        user_id=payload.user_id,
        tenant_id=payload.tenant_id,
        role=payload.role.value,
    )
    
    return payload


async def require_scope(required_scope: TokenScope):
    """
    Dependency factory for scope checking.
    
    Usage:
        @app.post("/ingest/email")
        async def ingest_email(
            request: EmailIngestRequest,
            user: TokenPayload = Depends(require_scope(TokenScope.EMAIL_INGEST))
        ):
            return process_email(request)
    """
    async def check_scope(user: TokenPayload = Depends(get_current_user)):
        if not user:
            return None  # Legacy auth mode
        
        if not AuthorizationManager.has_scope(user, required_scope):
            logger.security_event(
                "Insufficient scope for operation",
                severity="MEDIUM",
                user_id=user.user_id,
                required_scope=required_scope.value,
                user_scopes=[s.value for s in user.scopes],
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        return user
    
    return check_scope


async def require_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    """
    Dependency for admin-only endpoints.
    
    Usage:
        @app.delete("/admin/reset")
        async def admin_reset(admin: TokenPayload = Depends(require_admin)):
            return perform_admin_action()
    """
    if not user:
        return None  # Legacy auth mode
    
    if not AuthorizationManager.is_admin(user):
        logger.security_event(
            "Non-admin attempted privileged operation",
            severity="HIGH",
            user_id=user.user_id,
            role=user.role.value,
        )
        raise HTTPException(status_code=403, detail="Admin role required")
    
    return user


async def require_tenant_access(
    tenant_id: str,
    user: Optional[TokenPayload] = Depends(get_current_user)
) -> Optional[TokenPayload]:
    """
    Dependency for tenant-scoped operations.
    Ensures user has access to requested tenant.
    """
    if not user:
        return None  # Legacy auth mode
    
    if not AuthorizationManager.is_tenant_owner(user, tenant_id):
        logger.security_event(
            "User attempted access to different tenant",
            severity="HIGH",
            user_id=user.user_id,
            user_tenant=user.tenant_id,
            requested_tenant=tenant_id,
        )
        raise HTTPException(status_code=403, detail="Tenant access forbidden")
    
    return user


# ========================================
# Authentication Helpers
# ========================================

def create_jwt_tokens(
    user_id: str,
    tenant_id: str,
    role: UserRole,
    scopes: list,
) -> dict:
    """
    Create access and refresh tokens for authenticated user.
    
    Args:
        user_id: Unique user identifier
        tenant_id: Organization ID
        role: User role (admin, soc_analyst, etc.)
        scopes: List of TokenScope
    
    Returns:
        Dict with access_token, refresh_token_id, expires_in
    """
    access_token = JWTTokenManager.generate_access_token(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        scopes=scopes,
    )
    
    refresh_token_id = JWTTokenManager.generate_refresh_token(
        user_id=user_id,
        tenant_id=tenant_id,
    )
    
    return {
        "access_token": access_token,
        "refresh_token_id": refresh_token_id,
        "token_type": "bearer",
        "expires_in": JWTConfig.JWT_ACCESS_TOKEN_EXPIRE * 60,  # seconds
    }


def verify_password(username: str, password: str) -> bool:
    """
    Verify user credentials.
    
    TODO: Integrate with actual user database.
    Currently a stub for integration.
    """
    # This would query user database and verify password hash
    # For now, allow integration testing
    logger.info("password_verification_attempted", username=username)
    return True  # Placeholder


# ========================================
# Audit Logging
# ========================================

def log_auth_event(
    event_type: str,
    user_id: str,
    tenant_id: str,
    status: str,
    details: dict = None,
    ip_address: str = None,
):
    """
    Log authentication event for audit trail.
    
    Args:
        event_type: "login", "logout", "refresh", "failed_auth"
        user_id: User identifier
        tenant_id: Organization ID
        status: "success" or "failure"
        details: Additional event details
        ip_address: Client IP for security monitoring
    """
    event = {
        "event_type": event_type,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "status": status,
    }
    
    if details:
        event.update(details)
    
    if ip_address:
        event["ip_address"] = ip_address
    
    if status == "failure":
        logger.security_event(event["event_type"], severity="MEDIUM", **event)
    else:
        logger.info(event_type, **event)
