"""
PhishX Structured Logging Configuration

Centralized logging with structured output for:
- ELK Stack / Loki integration
- Distributed tracing
- Security audit trail
- Performance monitoring
"""

import os
import sys
import json
import logging
import logging.config
from typing import Any, Dict
from datetime import datetime
import traceback

import structlog
from pythonjsonlogger import jsonlogger

# ========================================
# Configuration
# ========================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")  # "json" or "text"
LOG_OUTPUT = os.getenv("LOG_OUTPUT", "file")  # "file", "stdout", or "both"
LOG_DIR = os.getenv("LOG_DIR", "logs")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
SERVICE_NAME = "PhishX"
SERVICE_VERSION = "1.0.0"

# Create logs directory if it doesn't exist
if LOG_OUTPUT in ("file", "both"):
    os.makedirs(LOG_DIR, exist_ok=True)

# ========================================
# Structlog Configuration
# ========================================

def setup_structlog():
    """Configure structlog for structured logging"""
    
    # Configure structlog processors
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ]
    
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


# ========================================
# Standard Logging Configuration
# ========================================

def get_logging_config() -> Dict[str, Any]:
    """Generate logging configuration dictionary"""
    
    handlers = {}
    
    if LOG_OUTPUT in ("file", "both"):
        # File handler for all logs
        handlers["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(LOG_DIR, "phishx.log"),
            "maxBytes": 104857600,  # 100MB
            "backupCount": 10,
            "formatter": "json_formatter" if LOG_FORMAT == "json" else "detailed",
            "level": LOG_LEVEL,
        }
        
        # Separate file for error logs
        handlers["error_file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(LOG_DIR, "phishx-errors.log"),
            "maxBytes": 104857600,
            "backupCount": 10,
            "formatter": "json_formatter" if LOG_FORMAT == "json" else "detailed",
            "level": "ERROR",
        }
        
        # Security audit log (immutable)
        handlers["audit_file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(LOG_DIR, "phishx-audit.log"),
            "maxBytes": 104857600,
            "backupCount": 20,
            "formatter": "audit_formatter",
            "level": "INFO",
        }
    
    if LOG_OUTPUT in ("stdout", "both"):
        # Console handler
        handlers["console"] = {
            "class": "logging.StreamHandler",
            "formatter": "text_formatter" if LOG_FORMAT == "text" else "json_formatter",
            "stream": "ext://sys.stdout",
            "level": LOG_LEVEL,
        }
    
    formatters = {
        "json_formatter": {
            "()": jsonlogger.JsonFormatter,
            "fmt": "%(timestamp)s %(name)s %(levelname)s %(message)s",
        },
        "text_formatter": {
            "format": "[%(asctime)s] %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "detailed": {
            "format": (
                "%(asctime)s | %(name)s | %(levelname)s | "
                "%(filename)s:%(lineno)d | %(funcName)s() | %(message)s"
            ),
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "audit_formatter": {
            "format": "%(asctime)s | AUDIT | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }
    
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "handlers": handlers,
        "loggers": {
            "phishx": {
                "level": LOG_LEVEL,
                "handlers": [h for h in handlers.keys() if h != "audit_file"],
                "propagate": False,
            },
            "phishx.audit": {
                "level": "INFO",
                "handlers": ["audit_file"] if "audit_file" in handlers else [],
                "propagate": False,
            },
            "phishx.security": {
                "level": "INFO",
                "handlers": ["error_file"] if "error_file" in handlers else [],
                "propagate": False,
            },
        },
        "root": {
            "level": LOG_LEVEL,
            "handlers": list(handlers.keys()),
        },
    }


# ========================================
# Logger Classes
# ========================================

class PhishXLogger:
    """Central logger for PhishX with context support"""
    
    def __init__(self, name: str = "phishx"):
        self.logger = structlog.get_logger(name)
        self.audit_logger = logging.getLogger("phishx.audit")
        self.security_logger = logging.getLogger("phishx.security")
    
    def _add_context(self, **kwargs) -> Dict[str, Any]:
        """Add service context to all logs"""
        return {
            "service": SERVICE_NAME,
            "version": SERVICE_VERSION,
            "environment": ENVIRONMENT,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs,
        }
    
    # ====== Regular Logging ======
    
    def info(self, message: str, **kwargs):
        """Info level log"""
        self.logger.info(message, **self._add_context(**kwargs))
    
    def warning(self, message: str, **kwargs):
        """Warning level log"""
        self.logger.warning(message, **self._add_context(**kwargs))
    
    def error(self, message: str, exc_info=None, **kwargs):
        """Error level log with optional exception info"""
        if exc_info:
            kwargs["traceback"] = traceback.format_exc()
        self.logger.error(message, **self._add_context(**kwargs))
    
    def debug(self, message: str, **kwargs):
        """Debug level log"""
        self.logger.debug(message, **self._add_context(**kwargs))
    
    # ====== Security & Audit Logging ======
    
    def audit(self, event: str, **kwargs):
        """
        Immutable audit log entry.
        Used for security-critical events.
        """
        audit_entry = {
            "event": event,
            "timestamp": datetime.utcnow().isoformat(),
            "service": SERVICE_NAME,
            **kwargs,
        }
        self.audit_logger.info(json.dumps(audit_entry))
    
    def security_event(self, event: str, severity: str = "MEDIUM", **kwargs):
        """
        Log security-relevant events (failed auth, rate limits, etc).
        severity: LOW, MEDIUM, HIGH, CRITICAL
        """
        self.security_logger.info(
            f"SECURITY[{severity}] {event}",
            extra={
                "severity": severity,
                "event": event,
                **kwargs,
            }
        )
    
    # ====== Business Logic Logging ======
    
    def email_decision(self, email_id: str, risk_score: int, category: str, **kwargs):
        """Log email decision"""
        self.info(
            "email_decision",
            email_id=email_id,
            risk_score=risk_score,
            category=category,
            **kwargs,
        )
    
    def threat_detected(self, email_id: str, threat_type: str, **kwargs):
        """Log threat detection"""
        self.security_event(
            f"Threat detected: {threat_type}",
            severity="HIGH",
            email_id=email_id,
            threat_type=threat_type,
            **kwargs,
        )
    
    def api_call(self, method: str, endpoint: str, status_code: int, **kwargs):
        """Log API interactions"""
        self.info(
            "api_call",
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            **kwargs,
        )
    
    def external_service_failure(self, service: str, error: str, **kwargs):
        """Log external service failures"""
        self.warning(
            f"External service failure: {service}",
            service=service,
            error=error,
            **kwargs,
        )
    
    def rate_limit_exceeded(self, client_id: str, limit: str, **kwargs):
        """Log rate limit violations"""
        self.security_event(
            f"Rate limit exceeded for {client_id}",
            severity="MEDIUM",
            client_id=client_id,
            limit=limit,
            **kwargs,
        )
    
    def failed_authentication(self, reason: str, **kwargs):
        """Log authentication failures"""
        self.security_event(
            "Failed authentication attempt",
            severity="HIGH",
            reason=reason,
            **kwargs,
        )
    
    def unauthorized_access_attempt(self, resource: str, **kwargs):
        """Log unauthorized access attempts"""
        self.security_event(
            f"Unauthorized access to {resource}",
            severity="HIGH",
            resource=resource,
            **kwargs,
        )
    
    def data_integrity_error(self, entity: str, error: str, **kwargs):
        """Log data integrity issues"""
        self.security_event(
            f"Data integrity error in {entity}",
            severity="CRITICAL",
            entity=entity,
            error=error,
            **kwargs,
        )


# ========================================
# Initialize Logging
# ========================================

def setup_logging():
    """Initialize all logging components"""
    
    # Setup structlog
    setup_structlog()
    
    # Setup standard logging
    config = get_logging_config()
    logging.config.dictConfig(config)
    
    # Get root logger for this module
    logger = PhishXLogger("phishx")
    
    logger.info(
        "logging_initialized",
        environment=ENVIRONMENT,
        log_level=LOG_LEVEL,
        log_format=LOG_FORMAT,
    )
    
    return logger


# ========================================
# Global Logger Instance
# ========================================

# Initialize on module import
logger = setup_logging()

# Export for use in other modules
__all__ = ["logger", "PhishXLogger", "setup_logging"]
