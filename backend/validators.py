"""
PhishX Input Validation Models

Comprehensive Pydantic schemas with validation rules.
Prevents injection attacks and ensures data integrity.
"""

from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field, validator, HttpUrl

# Compatibility: provide a stable `root_validator` decorator that maps to
# Pydantic v2's `model_validator(mode='after')` when available. If the
# installed Pydantic exposes the deprecated `root_validator` (v1 compatibility)
# we'll prefer the v2-style wrapper to avoid v2 runtime errors about
# `skip_on_failure` and deprecation.
try:
    # Prefer v2 API
    from pydantic import model_validator as _model_validator

    def root_validator(func=None, **kwargs):
        """Map legacy `@root_validator` usage to `@model_validator(mode='after')`."""
        if func is None:
            return _model_validator(mode='after', **kwargs)
        return _model_validator(mode='after', **kwargs)(func)
except Exception:
    # Fallback: try to import the legacy root_validator (pydantic v1 compat)
    try:
        from pydantic import root_validator as _legacy_root_validator

        def root_validator(func=None, **kwargs):
            if func is None:
                return _legacy_root_validator(**kwargs)
            return _legacy_root_validator(func, **kwargs)
    except Exception:
        # Last-resort no-op decorator to keep runtime working in constrained
        # environments (e.g., during tests where pydantic may be absent).
        def root_validator(func=None, **kwargs):
            if func is None:
                def _decorator(f):
                    return f
                return _decorator
            return func
from email_validator import validate_email, EmailNotValidError
import re
from urllib.parse import urlparse

# ========================================
# Constants
# ========================================

MAX_SUBJECT_LENGTH = 255
MAX_SENDER_LENGTH = 255
MAX_BODY_LENGTH = 5_000_000  # 5MB
MAX_URLS_PER_EMAIL = 100
MAX_ATTACHMENTS_PER_EMAIL = 50
MAX_ATTACHMENT_SIZE = 25_000_000  # 25MB
MAX_EMAIL_SIZE = 30_000_000  # 30MB

INTERNAL_IP_RANGES = {
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "::1/128",
    "fc00::/7",
}

DISALLOWED_SCHEMES = {"file://", "gopher://", "dict://", "sftp://"}

# ========================================
# Enums
# ========================================

class EmailCategory(str, Enum):
    """Email risk categories"""
    COLD = "COLD"
    WARM = "WARM"
    HOT = "HOT"


class Decision(str, Enum):
    """Enforcement decisions"""
    ALLOW = "ALLOW"
    QUARANTINE = "QUARANTINE"
    REJECT = "REJECT"


class EmailPriority(str, Enum):
    """Processing priority for high-risk senders"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


# ========================================
# Base Models
# ========================================

class Attachment(BaseModel):
    """Email attachment metadata"""
    filename: str = Field(..., min_length=1, max_length=255)
    base64: str = Field(..., min_length=1, max_length=MAX_ATTACHMENT_SIZE)
    content_type: Optional[str] = Field(None, max_length=100)
    
    @validator("filename")
    def validate_filename(cls, v):
        """Prevent directory traversal attacks"""
        if ".." in v or "/" in v or "\\" in v:
            raise ValueError("Invalid filename: path traversal detected")
        # Only allow alphanumeric, dots, dashes, underscores
        if not re.match(r"^[\w\-. ]+$", v):
            raise ValueError("Filename contains invalid characters")
        return v
    
    @validator("base64")
    def validate_base64(cls, v):
        """Validate base64 encoding"""
        import base64
        try:
            base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError("Invalid base64 encoding")
        return v


class EmailUrl(BaseModel):
    """Validated URL with security checks"""
    url: str = Field(..., max_length=2048)
    
    @validator("url")
    def validate_url(cls, v):
        """Validate URL format and prevent SSRF attacks"""
        v = v.strip()
        
        # Check for disallowed schemes
        for scheme in DISALLOWED_SCHEMES:
            if v.lower().startswith(scheme):
                raise ValueError(f"Disallowed URL scheme: {scheme}")
        
        # Ensure HTTP/HTTPS
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Invalid URL scheme - must be HTTP or HTTPS")
        
        try:
            parsed = urlparse(v)
            hostname = parsed.hostname
            
            if not hostname:
                raise ValueError("URL missing hostname")
            
            # Prevent SSRF attacks - check for internal IPs
            # In production, use ipaddress library to properly check ranges
            internal_patterns = [
                r"^127\.",
                r"^10\.",
                r"^172\.1[6-9]\.",
                r"^172\.2[0-9]\.",
                r"^172\.3[01]\.",
                r"^192\.168\.",
                r"^localhost$",
                r"^0\.0\.0\.0$",
            ]
            
            for pattern in internal_patterns:
                if re.match(pattern, hostname):
                    raise ValueError(f"SSRF attack detected: internal hostname {hostname}")
            
            # Check URL length
            if len(v) > 2048:
                raise ValueError("URL too long")
                
        except Exception as e:
            if "SSRF attack" in str(e) or "Invalid URL" in str(e):
                raise
            raise ValueError(f"Invalid URL format: {str(e)}")
        
        return v


# ========================================
# Request Models
# ========================================

class EmailIngestRequest(BaseModel):
    """Email ingestion request with comprehensive validation"""
    subject: str = Field(..., min_length=1, max_length=MAX_SUBJECT_LENGTH)
    sender: str = Field(..., min_length=1, max_length=MAX_SENDER_LENGTH)
    body: str = Field(..., min_length=1, max_length=MAX_BODY_LENGTH)
    urls: List[str] = Field(default_factory=list, max_items=MAX_URLS_PER_EMAIL)
    attachments: List[Attachment] = Field(
        default_factory=list,
        max_items=MAX_ATTACHMENTS_PER_EMAIL
    )
    priority: EmailPriority = Field(default=EmailPriority.NORMAL)
    message_id: Optional[str] = Field(None, max_length=255)
    
    class Config:
        # Example schema for validation
        schema_extra = {
            "example": {
                "subject": "Urgent Action Required",
                "sender": "user@example.com",
                "body": "Please verify your account...",
                "urls": ["https://example.com/verify"],
                "attachments": [],
                "priority": "normal",
            }
        }
    
    @validator("sender")
    def validate_sender(cls, v):
        """Validate sender email format"""
        v = v.strip().lower()
        try:
            valid = validate_email(v, check_deliverability=False)
            return valid.email
        except EmailNotValidError as e:
            raise ValueError(f"Invalid sender email: {str(e)}")
    
    @validator("urls", pre=True)
    def normalize_urls(cls, v):
        """Normalize and deduplicate URLs"""
        if not v:
            return []
        # Remove duplicates while preserving order
        seen = set()
        result = []
        for url in v:
            url_lower = url.strip().lower()
            if url_lower not in seen:
                seen.add(url_lower)
                result.append(url.strip())
        return result
    
    @validator("urls", each_item=True)
    def validate_url_items(cls, v):
        """Validate each URL in the list"""
        EmailUrl(url=v)  # Use nested validator
        return v
    
    @validator("body")
    def sanitize_body(cls, v):
        """Basic sanitization of email body"""
        # Remove null bytes that could bypass security filters
        v = v.replace("\x00", "")
        return v.strip()
    
    @validator("subject")
    def sanitize_subject(cls, v):
        """Sanitize subject line"""
        v = v.replace("\x00", "")
        return v.strip()
    
    @root_validator
    def validate_total_size(cls, values):
        """Validate total email size"""
        subject = values.get("subject", "")
        sender = values.get("sender", "")
        body = values.get("body", "")
        urls = values.get("urls", [])
        attachments = values.get("attachments", [])
        
        total_size = (
            len(subject.encode()) +
            len(sender.encode()) +
            len(body.encode()) +
            sum(len(u.encode()) for u in urls) +
            sum(len(a.base64.encode()) for a in attachments)
        )
        
        if total_size > MAX_EMAIL_SIZE:
            raise ValueError(f"Email size ({total_size} bytes) exceeds maximum ({MAX_EMAIL_SIZE} bytes)")
        
        return values


class SMTPEnforceRequest(BaseModel):
    """SMTP enforcement request from mail transfer agent"""
    subject: str = Field(..., max_length=MAX_SUBJECT_LENGTH)
    mail_from: str = Field(..., max_length=MAX_SENDER_LENGTH)
    body: str = Field(..., max_length=MAX_BODY_LENGTH)
    urls: List[str] = Field(default_factory=list, max_items=MAX_URLS_PER_EMAIL)
    tenant_id: str = Field(..., min_length=1, max_length=255)
    
    @validator("mail_from")
    def validate_mail_from(cls, v):
        """Validate SMTP sender"""
        try:
            valid = validate_email(v, check_deliverability=False)
            return valid.email
        except EmailNotValidError as e:
            raise ValueError(f"Invalid sender: {str(e)}")
    
    @validator("tenant_id")
    def validate_tenant_id(cls, v):
        """Validate tenant ID format (UUID)"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError("Invalid tenant_id format - must be UUID")


class GraphEnforceRequest(BaseModel):
    """Microsoft Graph API enforcement request"""
    subject: str = Field(..., max_length=MAX_SUBJECT_LENGTH)
    sender: str = Field(..., max_length=MAX_SENDER_LENGTH)
    body: str = Field(..., max_length=MAX_BODY_LENGTH)
    urls: List[str] = Field(default_factory=list, max_items=MAX_URLS_PER_EMAIL)
    tenant_id: str = Field(..., min_length=1, max_length=255)
    message_id: Optional[str] = Field(None, max_length=255)
    
    @validator("tenant_id")
    def validate_tenant_id(cls, v):
        """Validate tenant ID format"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError("Invalid tenant_id format")


# ========================================
# Response Models
# ========================================

class EmailDecisionResponse(BaseModel):
    """Email decision response"""
    email_id: str
    risk_score: int = Field(..., ge=0, le=100)
    category: EmailCategory
    decision: Decision
    findings: dict = Field(default_factory=dict)
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    components: dict = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Error response"""
    status: str = "error"
    message: str
    code: Optional[str] = None
    timestamp: str
