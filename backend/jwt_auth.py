"""
PhishX JWT Authentication (Phase 3)

JWT-based authentication system with:
- Token generation and validation
- Refresh token rotation
- Token expiration and revocation
- Role-based access control (RBAC)
- Multi-tenant token isolation
- Audit logging of all auth events
"""

import os
import time
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import uuid

import jwt
from passlib.context import CryptContext

from log_config import logger

# ========================================
# Configuration
# ========================================

class JWTConfig:
    """JWT Configuration"""
    
    # Algorithm (RS256 for production, HS256 for dev)
    ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    
    # Keys (use RSA key pair in production)
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-rsa-key")
    PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY", None)
    
    # Token lifetimes
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE", 15))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE", 30))
    
    # Issuer and audience
    ISSUER = "phishx"
    AUDIENCE = "phishx-api"
    
    @classmethod
    def validate(cls):
        """Validate JWT configuration"""
        if cls.ALGORITHM == "RS256":
            if not cls.PUBLIC_KEY or not cls.SECRET_KEY:
                raise ValueError("RS256 requires both PUBLIC_KEY and SECRET_KEY environment variables")
        if cls.ALGORITHM not in ["HS256", "RS256"]:
            raise ValueError(f"Unsupported algorithm: {cls.ALGORITHM}")


# ========================================
# User Roles & Permissions
# ========================================

class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    SOC_ANALYST = "soc_analyst"
    API_CLIENT = "api_client"
    READONLY = "readonly"


class TokenScope(str, Enum):
    """Token access scopes"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    EMAIL_INGEST = "email_ingest"
    ENFORCE = "enforce"
    SOC = "soc"


# Permission mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [TokenScope.READ, TokenScope.WRITE, TokenScope.ADMIN],
    UserRole.SOC_ANALYST: [TokenScope.READ, TokenScope.WRITE, TokenScope.SOC],
    UserRole.API_CLIENT: [TokenScope.READ, TokenScope.WRITE, TokenScope.EMAIL_INGEST, TokenScope.ENFORCE],
    UserRole.READONLY: [TokenScope.READ],
}


# ========================================
# JWT Token Models
# ========================================

class TokenPayload:
    """JWT token payload"""
    
    def __init__(
        self,
        user_id: str,
        tenant_id: str,
        role: UserRole,
        scopes: List[TokenScope],
        issued_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
        refresh_token_id: Optional[str] = None,
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.role = role
        self.scopes = scopes
        self.issued_at = issued_at or datetime.utcnow()
        self.expires_at = expires_at or (datetime.utcnow() + timedelta(minutes=JWTConfig.ACCESS_TOKEN_EXPIRE_MINUTES))
        self.refresh_token_id = refresh_token_id
        self.jti = str(uuid.uuid4())  # JWT ID for revocation tracking
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JWT encoding"""
        return {
            "sub": self.user_id,  # Subject (user ID)
            "tenant_id": self.tenant_id,
            "role": self.role.value,
            "scopes": [s.value for s in self.scopes],
            "iat": int(self.issued_at.timestamp()),
            "exp": int(self.expires_at.timestamp()),
            "iss": JWTConfig.ISSUER,
            "aud": JWTConfig.AUDIENCE,
            "jti": self.jti,
            "refresh_token_id": self.refresh_token_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TokenPayload":
        """Create from JWT payload dictionary"""
        return cls(
            user_id=data.get("sub"),
            tenant_id=data.get("tenant_id"),
            role=UserRole(data.get("role")),
            scopes=[TokenScope(s) for s in data.get("scopes", [])],
            issued_at=datetime.fromtimestamp(data.get("iat")),
            expires_at=datetime.fromtimestamp(data.get("exp")),
            refresh_token_id=data.get("refresh_token_id"),
        )


class RefreshToken:
    """Refresh token model"""
    
    def __init__(
        self,
        token_id: str,
        user_id: str,
        tenant_id: str,
        issued_at: datetime,
        expires_at: datetime,
        revoked: bool = False,
    ):
        self.token_id = token_id
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.issued_at = issued_at
        self.expires_at = expires_at
        self.revoked = revoked
    
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid (not expired and not revoked)"""
        return not self.is_expired() and not self.revoked


# ========================================
# JWT Token Manager
# ========================================

class JWTTokenManager:
    """Manage JWT token generation, validation, and revocation"""
    
    # Token revocation list (in-memory; use Redis in production)
    revoked_tokens: set = set()
    refresh_tokens: Dict[str, RefreshToken] = {}
    
    @classmethod
    def generate_access_token(
        cls,
        user_id: str,
        tenant_id: str,
        role: UserRole,
        scopes: Optional[List[TokenScope]] = None,
    ) -> str:
        """Generate JWT access token"""
        if scopes is None:
            scopes = ROLE_PERMISSIONS.get(role, [])
        
        payload = TokenPayload(
            user_id=user_id,
            tenant_id=tenant_id,
            role=role,
            scopes=scopes,
        )
        
        try:
            token = jwt.encode(
                payload.to_dict(),
                JWTConfig.SECRET_KEY,
                algorithm=JWTConfig.ALGORITHM,
            )
            
            logger.security_event(
                "Access token generated",
                severity="LOW",
                user_id=user_id,
                tenant_id=tenant_id,
                role=role.value,
                token_jti=payload.jti,
            )
            
            return token
        
        except Exception as e:
            logger.error(
                "access_token_generation_failed",
                error=str(e),
                user_id=user_id,
            )
            raise
    
    @classmethod
    def generate_refresh_token(
        cls,
        user_id: str,
        tenant_id: str,
    ) -> str:
        """Generate refresh token"""
        token_id = str(uuid.uuid4())
        issued_at = datetime.utcnow()
        expires_at = issued_at + timedelta(days=JWTConfig.REFRESH_TOKEN_EXPIRE_DAYS)
        
        refresh_token = RefreshToken(
            token_id=token_id,
            user_id=user_id,
            tenant_id=tenant_id,
            issued_at=issued_at,
            expires_at=expires_at,
        )
        
        # Store refresh token
        cls.refresh_tokens[token_id] = refresh_token
        
        logger.security_event(
            "Refresh token generated",
            severity="LOW",
            user_id=user_id,
            tenant_id=tenant_id,
            token_id=token_id,
        )
        
        return token_id
    
    @classmethod
    def validate_token(cls, token: str) -> Optional[TokenPayload]:
        """Validate JWT token"""
        try:
            # Decode JWT
            payload = jwt.decode(
                token,
                JWTConfig.SECRET_KEY,
                algorithms=[JWTConfig.ALGORITHM],
                issuer=JWTConfig.ISSUER,
                audience=JWTConfig.AUDIENCE,
            )
            
            # Check revocation list
            jti = payload.get("jti")
            if jti in cls.revoked_tokens:
                logger.warning(
                    "token_revoked",
                    jti=jti,
                    sub=payload.get("sub"),
                )
                return None
            
            return TokenPayload.from_dict(payload)
        
        except jwt.ExpiredSignatureError:
            logger.warning(
                "token_expired",
                token_preview=token[:20],
            )
            return None
        
        except jwt.InvalidTokenError as e:
            logger.warning(
                "token_invalid",
                error=str(e),
            )
            return None
        
        except Exception as e:
            logger.error(
                "token_validation_error",
                error=str(e),
            )
            return None
    
    @classmethod
    def refresh_access_token(
        cls,
        refresh_token_id: str,
        user_id: str,
        tenant_id: str,
    ) -> Optional[str]:
        """Generate new access token from valid refresh token"""
        # Validate refresh token
        refresh_token = cls.refresh_tokens.get(refresh_token_id)
        
        if not refresh_token or not refresh_token.is_valid():
            logger.security_event(
                "Invalid refresh token attempt",
                severity="MEDIUM",
                user_id=user_id,
                tenant_id=tenant_id,
                token_id=refresh_token_id,
            )
            return None
        
        # Verify token belongs to user/tenant
        if refresh_token.user_id != user_id or refresh_token.tenant_id != tenant_id:
            logger.security_event(
                "Refresh token mismatch",
                severity="HIGH",
                expected_user=refresh_token.user_id,
                provided_user=user_id,
                token_id=refresh_token_id,
            )
            return None
        
        # Rotate refresh token (revoke old, issue new)
        cls.revoke_refresh_token(refresh_token_id)
        new_refresh_token_id = cls.generate_refresh_token(user_id, tenant_id)
        
        # Generate new access token
        try:
            payload = TokenPayload(
                user_id=user_id,
                tenant_id=tenant_id,
                role=UserRole.API_CLIENT,  # Could retrieve from database
                scopes=[TokenScope.READ, TokenScope.WRITE],
                refresh_token_id=new_refresh_token_id,
            )
            
            token = jwt.encode(
                payload.to_dict(),
                JWTConfig.SECRET_KEY,
                algorithm=JWTConfig.ALGORITHM,
            )
            
            logger.security_event(
                "Access token refreshed",
                severity="LOW",
                user_id=user_id,
                tenant_id=tenant_id,
                old_refresh_token=refresh_token_id,
                new_refresh_token=new_refresh_token_id,
            )
            
            return token
        
        except Exception as e:
            logger.error(
                "token_refresh_failed",
                error=str(e),
                user_id=user_id,
            )
            return None
    
    @classmethod
    def revoke_token(cls, jti: str):
        """Revoke access token by JTI"""
        cls.revoked_tokens.add(jti)
        logger.security_event(
            "Access token revoked",
            severity="MEDIUM",
            jti=jti,
        )
    
    @classmethod
    def revoke_refresh_token(cls, token_id: str):
        """Revoke refresh token"""
        if token_id in cls.refresh_tokens:
            cls.refresh_tokens[token_id].revoked = True
            logger.security_event(
                "Refresh token revoked",
                severity="MEDIUM",
                token_id=token_id,
            )
    
    @classmethod
    def revoke_all_user_tokens(cls, user_id: str):
        """Revoke all tokens for a user (logout)"""
        # Revoke all refresh tokens for user
        count = 0
        for token_id, refresh_token in list(cls.refresh_tokens.items()):
            if refresh_token.user_id == user_id:
                cls.revoke_refresh_token(token_id)
                count += 1
        
        logger.security_event(
            "All user tokens revoked",
            severity="MEDIUM",
            user_id=user_id,
            tokens_revoked=count,
        )


# ========================================
# Password Hashing
# ========================================

class PasswordManager:
    """Manage password hashing and verification"""
    
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=12,  # Increase rounds for production
    )
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash password"""
        return cls.pwd_context.hash(password)
    
    @classmethod
    def verify_password(cls, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return cls.pwd_context.verify(password, hashed)


# ========================================
# Permission Checking
# ========================================

class AuthorizationManager:
    """Check user permissions"""
    
    @staticmethod
    def has_scope(token: TokenPayload, required_scope: TokenScope) -> bool:
        """Check if token has required scope"""
        return required_scope in token.scopes
    
    @staticmethod
    def has_any_scope(token: TokenPayload, required_scopes: List[TokenScope]) -> bool:
        """Check if token has any of the required scopes"""
        return any(scope in token.scopes for scope in required_scopes)
    
    @staticmethod
    def has_all_scopes(token: TokenPayload, required_scopes: List[TokenScope]) -> bool:
        """Check if token has all required scopes"""
        return all(scope in token.scopes for scope in required_scopes)
    
    @staticmethod
    def is_admin(token: TokenPayload) -> bool:
        """Check if user is admin"""
        return token.role == UserRole.ADMIN
    
    @staticmethod
    def is_tenant_owner(token: TokenPayload, resource_tenant_id: str) -> bool:
        """Check if user owns the resource's tenant"""
        return token.tenant_id == resource_tenant_id


# ========================================
# Authentication Events & Audit
# ========================================

class AuthAuditLog:
    """Log authentication events"""
    
    events: List[Dict[str, Any]] = []
    
    @classmethod
    def record_login(cls, user_id: str, tenant_id: str, success: bool):
        """Record login attempt"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "login",
            "user_id": user_id,
            "tenant_id": tenant_id,
            "success": success,
        }
        cls.events.append(event)
        logger.audit(
            "login_attempt",
            user_id=user_id,
            tenant_id=tenant_id,
            success=success,
        )
    
    @classmethod
    def record_logout(cls, user_id: str, tenant_id: str):
        """Record logout"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "logout",
            "user_id": user_id,
            "tenant_id": tenant_id,
        }
        cls.events.append(event)
        logger.audit(
            "logout",
            user_id=user_id,
            tenant_id=tenant_id,
        )
    
    @classmethod
    def record_token_refresh(cls, user_id: str, tenant_id: str, success: bool):
        """Record token refresh"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "token_refresh",
            "user_id": user_id,
            "tenant_id": tenant_id,
            "success": success,
        }
        cls.events.append(event)
        logger.audit(
            "token_refresh",
            user_id=user_id,
            tenant_id=tenant_id,
            success=success,
        )
    
    @classmethod
    def get_user_audit_log(cls, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit log for user"""
        return [e for e in cls.events if e.get("user_id") == user_id][-limit:]
