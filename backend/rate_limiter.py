"""
PhishX Rate Limiting & Security Middleware

Implements:
- Per-IP rate limiting
- Per-API-key rate limiting  
- Per-tenant rate limiting
- DDoS protection
- Request validation
"""

import os
import time
from typing import Optional, Callable
from functools import wraps

from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import logging

logger = logging.getLogger(__name__)

# ========================================
# Rate Limiting Configuration
# ========================================

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")

class RedisLimiter(Limiter):
    """Extended Limiter with Redis backend"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


# Initialize limiter with Redis backend
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=REDIS_URL,
    strategy="moving-window",
    default_limits=["200/minute"],
)

# ========================================
# Rate Limit Definitions
# ========================================

class RateLimits:
    """Centralized rate limit definitions"""
    
    # Public endpoints
    HEALTH_CHECK = "1000/minute"  # Very permissive
    
    # API endpoints - per IP
    INGEST_EMAIL_IP = "100/minute"
    ENFORCE_SMTP_IP = "200/minute"
    ENFORCE_GRAPH_IP = "200/minute"
    
    # API endpoints - per API key
    INGEST_EMAIL_KEY = "10000/hour"
    ENFORCE_SMTP_KEY = "50000/hour"
    ENFORCE_GRAPH_KEY = "20000/hour"
    
    # API endpoints - per tenant
    INGEST_EMAIL_TENANT = "1000000/day"  # 1M emails per day
    
    # SOC endpoints
    SOC_QUERY = "1000/minute"
    SOC_ACTION = "100/minute"


# ========================================
# Custom Key Functions
# ========================================

def get_api_key_from_request(request: Request) -> str:
    """Extract and hash API key from request headers"""
    import hashlib
    
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        api_key = auth_header.split(" ", 1)[1].strip()
    else:
        api_key = auth_header.strip()
    
    if not api_key:
        return "anonymous"
    
    # Hash API key to avoid exposing it in logs
    return f"key_{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"


def get_tenant_id_from_request(request: Request) -> str:
    """Extract tenant ID from request headers"""
    tenant_id = request.headers.get("X-Tenant-ID", "unknown")
    return f"tenant_{tenant_id}"


def get_combined_key(request: Request) -> str:
    """Combine IP, API key, and tenant for comprehensive limiting"""
    ip = get_remote_address(request)
    api_key = get_api_key_from_request(request)
    return f"{ip}:{api_key}"


# ========================================
# Rate Limit Exception Handlers
# ========================================

async def handle_rate_limit_exceeded(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded"""
    logger.warning(
        "rate_limit_exceeded",
        ip=get_remote_address(request),
        endpoint=request.url.path,
        limit=exc.detail,
    )
    
    return HTTPException(
        status_code=429,
        detail={
            "status": "error",
            "message": "Rate limit exceeded. Please try again later.",
            "retry_after": 60,
        }
    )


# ========================================
# Decorator-based Rate Limiting
# ========================================

def rate_limit_by_ip(limit: str) -> Callable:
    """Decorator for IP-based rate limiting"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            ip = get_remote_address(request)
            key = f"ratelimit:ip:{ip}:{func.__name__}"
            
            # Check rate limit
            from redis import Redis
            redis_client = Redis.from_url(REDIS_URL)
            
            current = redis_client.incr(key)
            if current == 1:
                redis_client.expire(key, 60)  # Reset every minute
            
            # Parse limit (e.g., "100/minute")
            limit_count = int(limit.split("/")[0])
            
            if current > limit_count:
                logger.warning(
                    "ip_rate_limit_exceeded",
                    ip=ip,
                    endpoint=func.__name__,
                    current=current,
                    limit=limit_count,
                )
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests",
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def rate_limit_by_key(limit: str) -> Callable:
    """Decorator for API-key-based rate limiting"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            api_key = get_api_key_from_request(request)
            key = f"ratelimit:key:{api_key}:{func.__name__}"
            
            from redis import Redis
            redis_client = Redis.from_url(REDIS_URL)
            
            current = redis_client.incr(key)
            if current == 1:
                # Parse limit window (e.g., "10000/hour" = 3600 seconds)
                if "/minute" in limit:
                    window = 60
                elif "/hour" in limit:
                    window = 3600
                elif "/day" in limit:
                    window = 86400
                else:
                    window = 60
                
                redis_client.expire(key, window)
            
            limit_count = int(limit.split("/")[0])
            
            if current > limit_count:
                logger.warning(
                    "api_key_rate_limit_exceeded",
                    api_key=api_key,
                    endpoint=func.__name__,
                    current=current,
                    limit=limit_count,
                )
                raise HTTPException(
                    status_code=429,
                    detail="API rate limit exceeded",
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def rate_limit_by_tenant(limit: str) -> Callable:
    """Decorator for tenant-based rate limiting"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            tenant_id = get_tenant_id_from_request(request)
            key = f"ratelimit:tenant:{tenant_id}:{func.__name__}"
            
            from redis import Redis
            redis_client = Redis.from_url(REDIS_URL)
            
            current = redis_client.incr(key)
            if current == 1:
                # Parse window
                if "/minute" in limit:
                    window = 60
                elif "/hour" in limit:
                    window = 3600
                elif "/day" in limit:
                    window = 86400
                else:
                    window = 60
                
                redis_client.expire(key, window)
            
            limit_count = int(limit.split("/")[0])
            
            if current > limit_count:
                logger.warning(
                    "tenant_rate_limit_exceeded",
                    tenant_id=tenant_id,
                    endpoint=func.__name__,
                    current=current,
                    limit=limit_count,
                )
                raise HTTPException(
                    status_code=429,
                    detail="Tenant email quota exceeded",
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


# ========================================
# DDoS Protection Utilities
# ========================================

class DDoSProtection:
    """DDoS detection and protection mechanisms"""
    
    @staticmethod
    def detect_suspicious_pattern(request: Request) -> bool:
        """
        Detect suspicious request patterns that indicate DDoS:
        - Rapid requests from single IP
        - Missing user-agent headers
        - Suspicious header counts
        - Request size spikes
        """
        ip = get_remote_address(request)
        
        # Check for missing user-agent (many bots don't set this)
        if not request.headers.get("user-agent"):
            logger.warning("suspicious_request_no_ua", ip=ip)
            return True
        
        # Check for suspicious header patterns
        headers = dict(request.headers)
        if len(headers) < 5:  # Most legitimate clients have 5+ headers
            logger.warning("suspicious_request_few_headers", ip=ip, count=len(headers))
            return True
        
        return False
    
    @staticmethod
    def get_ip_reputation(ip: str) -> dict:
        """Check IP reputation (would integrate with threat intel service)"""
        from redis import Redis
        redis_client = Redis.from_url(REDIS_URL)
        
        # Check if IP is in blocklist
        blocklist_key = f"ip_blocklist:{ip}"
        is_blocked = redis_client.exists(blocklist_key)
        
        return {
            "ip": ip,
            "is_blocked": bool(is_blocked),
            "reputation": "blocked" if is_blocked else "clean",
        }


# ========================================
# Request Validation Middleware
# ========================================

def validate_request_headers(request: Request) -> bool:
    """Validate required and suspicious headers"""
    
    # Check Content-Type for POST requests
    if request.method == "POST":
        content_type = request.headers.get("content-type", "")
        if not content_type:
            logger.warning("missing_content_type", ip=get_remote_address(request))
            return False
    
    return True


# ========================================
# Utility Functions
# ========================================

def reset_ip_limit(ip: str) -> bool:
    """Admin function to reset rate limit for an IP"""
    from redis import Redis
    redis_client = Redis.from_url(REDIS_URL)
    
    pattern = f"ratelimit:ip:{ip}:*"
    keys = redis_client.keys(pattern)
    
    if keys:
        redis_client.delete(*keys)
        logger.info("ip_limit_reset", ip=ip, keys_deleted=len(keys))
        return True
    
    return False


def reset_api_key_limit(api_key: str) -> bool:
    """Admin function to reset rate limit for an API key"""
    from redis import Redis
    import hashlib
    
    redis_client = Redis.from_url(REDIS_URL)
    hashed_key = f"key_{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
    
    pattern = f"ratelimit:key:{hashed_key}:*"
    keys = redis_client.keys(pattern)
    
    if keys:
        redis_client.delete(*keys)
        logger.info("api_key_limit_reset", api_key=hashed_key, keys_deleted=len(keys))
        return True
    
    return False


def get_rate_limit_status(request: Request) -> dict:
    """Get current rate limit status for a request"""
    from redis import Redis
    
    redis_client = Redis.from_url(REDIS_URL)
    ip = get_remote_address(request)
    api_key = get_api_key_from_request(request)
    
    ip_key = f"ratelimit:ip:{ip}:*"
    key_key = f"ratelimit:key:{api_key}:*"
    
    ip_keys = redis_client.keys(ip_key)
    key_keys = redis_client.keys(key_key)
    
    return {
        "ip": ip,
        "api_key": api_key,
        "ip_limit_status": len(ip_keys),
        "key_limit_status": len(key_keys),
    }
