"""
PhishX Alerting Rules & Thresholds (Phase 2)

Define alert conditions and severity levels for:
- System health degradation
- Security incidents
- Performance anomalies
- External service failures
- Queue depth anomalies
"""

import time
from enum import Enum
from dataclasses import dataclass
from typing import Callable, Optional, List, Dict, Any

from log_config import logger
from metrics import (
    api_request_duration_seconds,
    rate_limit_exceeded_total,
    authentication_failures_total,
    external_service_availability_percent,
    queue_depth_current,
    database_query_duration_seconds,
)


# ========================================
# Alert Severity Levels
# ========================================

class AlertSeverity(str, Enum):
    """Alert severity classification"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    
    def to_pagerduty_level(self) -> str:
        """Convert to PagerDuty severity"""
        mapping = {
            AlertSeverity.INFO: "info",
            AlertSeverity.WARNING: "warning",
            AlertSeverity.CRITICAL: "critical",
        }
        return mapping.get(self, "warning")


class AlertSource(str, Enum):
    """Alert source categorization"""
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"
    INTEGRATION = "integration"
    QUEUE = "queue"
    DATABASE = "database"


# ========================================
# Alert Model
# ========================================

@dataclass
class Alert:
    """Alert object for notifications"""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    source: AlertSource
    timestamp: float
    value: Optional[Any] = None
    threshold: Optional[Any] = None
    context: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "source": self.source.value,
            "timestamp": self.timestamp,
            "value": self.value,
            "threshold": self.threshold,
            "context": self.context or {},
        }
    
    def to_slack_message(self) -> dict:
        """Format as Slack message"""
        severity_colors = {
            AlertSeverity.INFO: "#36a64f",
            AlertSeverity.WARNING: "#ff9800",
            AlertSeverity.CRITICAL: "#d32f2f",
        }
        
        return {
            "attachments": [
                {
                    "fallback": self.title,
                    "color": severity_colors.get(self.severity, "#gray"),
                    "title": self.title,
                    "text": self.description,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": self.severity.value.upper(),
                            "short": True,
                        },
                        {
                            "title": "Source",
                            "value": self.source.value.upper(),
                            "short": True,
                        },
                        {
                            "title": "Value",
                            "value": str(self.value),
                            "short": True,
                        },
                        {
                            "title": "Threshold",
                            "value": str(self.threshold),
                            "short": True,
                        },
                    ],
                    "ts": int(self.timestamp),
                }
            ]
        }


# ========================================
# Alert Configuration Registry
# ========================================

class AlertingRules:
    """Centralized alert rule definitions and thresholds"""
    
    # ========== API Performance Thresholds ==========
    API_RESPONSE_TIME_WARNING = 1.0  # seconds
    API_RESPONSE_TIME_CRITICAL = 5.0  # seconds
    
    # ========== Security Thresholds ==========
    RATE_LIMIT_EXCEEDED_COUNT_WARNING = 100  # per hour
    RATE_LIMIT_EXCEEDED_COUNT_CRITICAL = 1000  # per hour
    
    AUTH_FAILURES_WARNING = 10  # per hour
    AUTH_FAILURES_CRITICAL = 50  # per hour
    
    SUSPICIOUS_REQUEST_PATTERN_THRESHOLD = 50  # requests/min from single IP
    
    # ========== External Service Thresholds ==========
    EXTERNAL_SERVICE_AVAILABILITY_WARNING = 95  # percent
    EXTERNAL_SERVICE_AVAILABILITY_CRITICAL = 80  # percent
    EXTERNAL_SERVICE_TIMEOUT_CRITICAL = 3  # consecutive timeouts
    
    # ========== Queue Thresholds ==========
    QUEUE_DEPTH_WARNING = 1000  # tasks
    QUEUE_DEPTH_CRITICAL = 5000  # tasks
    QUEUE_PROCESSING_TIME_WARNING = 300  # seconds
    QUEUE_PROCESSING_TIME_CRITICAL = 600  # seconds
    
    # ========== Database Thresholds ==========
    DATABASE_QUERY_TIME_WARNING = 5.0  # seconds
    DATABASE_QUERY_TIME_CRITICAL = 10.0  # seconds
    DATABASE_CONNECTIONS_WARNING = 80  # percent of pool
    DATABASE_CONNECTIONS_CRITICAL = 95  # percent of pool
    
    # ========== Circuit Breaker Thresholds ==========
    CIRCUIT_BREAKER_OPEN_TIME_CRITICAL = 60  # seconds
    CIRCUIT_BREAKER_FAILURE_RATE_WARNING = 0.5  # 50%
    CIRCUIT_BREAKER_FAILURE_RATE_CRITICAL = 0.8  # 80%
    
    # ========== System Memory/CPU ==========
    MEMORY_USAGE_WARNING = 80  # percent
    MEMORY_USAGE_CRITICAL = 95  # percent
    CPU_USAGE_WARNING = 80  # percent
    CPU_USAGE_CRITICAL = 95  # percent


# ========================================
# Alert Evaluators
# ========================================

class AlertEvaluator:
    """Evaluate metrics against alert thresholds"""
    
    alert_history: Dict[str, Alert] = {}
    
    @classmethod
    def evaluate_api_performance(cls, response_time_ms: float) -> Optional[Alert]:
        """Evaluate API response time"""
        response_time_sec = response_time_ms / 1000
        
        if response_time_sec > AlertingRules.API_RESPONSE_TIME_CRITICAL:
            alert = Alert(
                id=f"api_performance_critical_{int(time.time())}",
                title="Critical API Response Time",
                description=f"API response time is {response_time_ms:.0f}ms (threshold: {AlertingRules.API_RESPONSE_TIME_CRITICAL * 1000}ms)",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.PERFORMANCE,
                timestamp=time.time(),
                value=response_time_ms,
                threshold=AlertingRules.API_RESPONSE_TIME_CRITICAL * 1000,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif response_time_sec > AlertingRules.API_RESPONSE_TIME_WARNING:
            alert = Alert(
                id=f"api_performance_warning_{int(time.time())}",
                title="Warning API Response Time",
                description=f"API response time is {response_time_ms:.0f}ms (threshold: {AlertingRules.API_RESPONSE_TIME_WARNING * 1000}ms)",
                severity=AlertSeverity.WARNING,
                source=AlertSource.PERFORMANCE,
                timestamp=time.time(),
                value=response_time_ms,
                threshold=AlertingRules.API_RESPONSE_TIME_WARNING * 1000,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None
    
    @classmethod
    def evaluate_rate_limit_abuse(cls, exceeded_count: int) -> Optional[Alert]:
        """Evaluate rate limit violations"""
        if exceeded_count > AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_CRITICAL:
            alert = Alert(
                id=f"rate_limit_critical_{int(time.time())}",
                title="Critical Rate Limit Abuse",
                description=f"{exceeded_count} rate limit violations detected (threshold: {AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_CRITICAL})",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.SECURITY,
                timestamp=time.time(),
                value=exceeded_count,
                threshold=AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_CRITICAL,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif exceeded_count > AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_WARNING:
            alert = Alert(
                id=f"rate_limit_warning_{int(time.time())}",
                title="Warning Rate Limit Abuse",
                description=f"{exceeded_count} rate limit violations detected (threshold: {AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_WARNING})",
                severity=AlertSeverity.WARNING,
                source=AlertSource.SECURITY,
                timestamp=time.time(),
                value=exceeded_count,
                threshold=AlertingRules.RATE_LIMIT_EXCEEDED_COUNT_WARNING,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None
    
    @classmethod
    def evaluate_authentication_failures(cls, failure_count: int) -> Optional[Alert]:
        """Evaluate authentication failure rate"""
        if failure_count > AlertingRules.AUTH_FAILURES_CRITICAL:
            alert = Alert(
                id=f"auth_critical_{int(time.time())}",
                title="Critical Authentication Failures",
                description=f"{failure_count} authentication failures detected (threshold: {AlertingRules.AUTH_FAILURES_CRITICAL})",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.SECURITY,
                timestamp=time.time(),
                value=failure_count,
                threshold=AlertingRules.AUTH_FAILURES_CRITICAL,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif failure_count > AlertingRules.AUTH_FAILURES_WARNING:
            alert = Alert(
                id=f"auth_warning_{int(time.time())}",
                title="Warning Authentication Failures",
                description=f"{failure_count} authentication failures detected (threshold: {AlertingRules.AUTH_FAILURES_WARNING})",
                severity=AlertSeverity.WARNING,
                source=AlertSource.SECURITY,
                timestamp=time.time(),
                value=failure_count,
                threshold=AlertingRules.AUTH_FAILURES_WARNING,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None
    
    @classmethod
    def evaluate_external_service_availability(
        cls, 
        service_name: str, 
        availability_percent: float
    ) -> Optional[Alert]:
        """Evaluate external service availability"""
        if availability_percent < AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_CRITICAL:
            alert = Alert(
                id=f"ext_service_critical_{service_name}_{int(time.time())}",
                title=f"Critical {service_name} Service Availability",
                description=f"{service_name} availability is {availability_percent:.1f}% (threshold: {AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_CRITICAL}%)",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.INTEGRATION,
                timestamp=time.time(),
                value=availability_percent,
                threshold=AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_CRITICAL,
                context={"service": service_name},
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif availability_percent < AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_WARNING:
            alert = Alert(
                id=f"ext_service_warning_{service_name}_{int(time.time())}",
                title=f"Warning {service_name} Service Availability",
                description=f"{service_name} availability is {availability_percent:.1f}% (threshold: {AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_WARNING}%)",
                severity=AlertSeverity.WARNING,
                source=AlertSource.INTEGRATION,
                timestamp=time.time(),
                value=availability_percent,
                threshold=AlertingRules.EXTERNAL_SERVICE_AVAILABILITY_WARNING,
                context={"service": service_name},
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None
    
    @classmethod
    def evaluate_queue_depth(cls, queue_name: str, depth: int) -> Optional[Alert]:
        """Evaluate queue processing depth"""
        if depth > AlertingRules.QUEUE_DEPTH_CRITICAL:
            alert = Alert(
                id=f"queue_critical_{queue_name}_{int(time.time())}",
                title=f"Critical Queue Backlog: {queue_name}",
                description=f"Queue depth is {depth} tasks (threshold: {AlertingRules.QUEUE_DEPTH_CRITICAL})",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.QUEUE,
                timestamp=time.time(),
                value=depth,
                threshold=AlertingRules.QUEUE_DEPTH_CRITICAL,
                context={"queue_name": queue_name},
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif depth > AlertingRules.QUEUE_DEPTH_WARNING:
            alert = Alert(
                id=f"queue_warning_{queue_name}_{int(time.time())}",
                title=f"Warning Queue Backlog: {queue_name}",
                description=f"Queue depth is {depth} tasks (threshold: {AlertingRules.QUEUE_DEPTH_WARNING})",
                severity=AlertSeverity.WARNING,
                source=AlertSource.QUEUE,
                timestamp=time.time(),
                value=depth,
                threshold=AlertingRules.QUEUE_DEPTH_WARNING,
                context={"queue_name": queue_name},
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None
    
    @classmethod
    def evaluate_database_performance(cls, query_time_ms: float) -> Optional[Alert]:
        """Evaluate database query performance"""
        query_time_sec = query_time_ms / 1000
        
        if query_time_sec > AlertingRules.DATABASE_QUERY_TIME_CRITICAL:
            alert = Alert(
                id=f"db_critical_{int(time.time())}",
                title="Critical Database Query Time",
                description=f"Query time is {query_time_ms:.0f}ms (threshold: {AlertingRules.DATABASE_QUERY_TIME_CRITICAL * 1000}ms)",
                severity=AlertSeverity.CRITICAL,
                source=AlertSource.DATABASE,
                timestamp=time.time(),
                value=query_time_ms,
                threshold=AlertingRules.DATABASE_QUERY_TIME_CRITICAL * 1000,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        elif query_time_sec > AlertingRules.DATABASE_QUERY_TIME_WARNING:
            alert = Alert(
                id=f"db_warning_{int(time.time())}",
                title="Warning Database Query Time",
                description=f"Query time is {query_time_ms:.0f}ms (threshold: {AlertingRules.DATABASE_QUERY_TIME_WARNING * 1000}ms)",
                severity=AlertSeverity.WARNING,
                source=AlertSource.DATABASE,
                timestamp=time.time(),
                value=query_time_ms,
                threshold=AlertingRules.DATABASE_QUERY_TIME_WARNING * 1000,
            )
            cls.alert_history[alert.id] = alert
            return alert
        
        return None


# ========================================
# Alert Manager
# ========================================

class AlertManager:
    """Central alert management and delivery"""
    
    # Alert handlers to notify
    handlers: List[Callable[[Alert], None]] = []
    
    # Suppress duplicate alerts for N seconds
    ALERT_DEDUP_WINDOW = 300  # 5 minutes
    alert_cache: Dict[str, float] = {}
    
    @classmethod
    def register_handler(cls, handler: Callable[[Alert], None]):
        """Register alert handler (Slack, email, Webhook, etc.)"""
        cls.handlers.append(handler)
        logger.info(
            "alert_handler_registered",
            handler_name=handler.__name__,
        )
    
    @classmethod
    def send_alert(cls, alert: Alert, force: bool = False) -> bool:
        """Send alert to all registered handlers"""
        # Check deduplication cache
        alert_key = f"{alert.source}_{alert.title}"
        
        if not force and alert_key in cls.alert_cache:
            # Check if alert was sent recently
            time_since_last = time.time() - cls.alert_cache[alert_key]
            if time_since_last < cls.ALERT_DEDUP_WINDOW:
                logger.debug(
                    "alert_deduplicated",
                    alert_id=alert.id,
                    alert_key=alert_key,
                    seconds_since_last=int(time_since_last),
                )
                return False
        
        # Update cache
        cls.alert_cache[alert_key] = time.time()
        
        # Send to all handlers
        for handler in cls.handlers:
            try:
                handler(alert)
                logger.info(
                    "alert_dispatched",
                    alert_id=alert.id,
                    handler=handler.__name__,
                    severity=alert.severity.value,
                )
            except Exception as e:
                logger.error(
                    "alert_delivery_failed",
                    alert_id=alert.id,
                    handler=handler.__name__,
                    error=str(e),
                )
        
        return True


# ========================================
# Built-in Alert Handlers
# ========================================

class SlackAlertHandler:
    """Send alerts to Slack"""
    
    @staticmethod
    def send_to_slack(alert: Alert, webhook_url: str = None):
        """Send alert to Slack webhook"""
        import os
        import requests
        
        webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL")
        if not webhook_url:
            logger.warning(
                "slack_webhook_not_configured",
                alert_id=alert.id,
            )
            return
        
        try:
            message = alert.to_slack_message()
            response = requests.post(webhook_url, json=message, timeout=5)
            
            if response.status_code != 200:
                logger.error(
                    "slack_send_failed",
                    alert_id=alert.id,
                    status=response.status_code,
                    response=response.text,
                )
        
        except Exception as e:
            logger.error(
                "slack_send_error",
                alert_id=alert.id,
                error=str(e),
            )


class EmailAlertHandler:
    """Send alerts via email"""
    
    @staticmethod
    def send_email(alert: Alert, recipient_email: str):
        """Send alert via email"""
        import smtplib
        from email.mime.text import MIMEText
        
        try:
            msg = MIMEText(
                f"Alert: {alert.title}\n\n{alert.description}\n\nValue: {alert.value}\nThreshold: {alert.threshold}"
            )
            msg["Subject"] = f"[{alert.severity.value.upper()}] {alert.title}"
            msg["From"] = "phishx-alerts@example.com"
            msg["To"] = recipient_email
            
            # Would need SMTP configuration
            logger.info(
                "email_alert_prepared",
                alert_id=alert.id,
                recipient=recipient_email,
            )
        
        except Exception as e:
            logger.error(
                "email_alert_failed",
                alert_id=alert.id,
                error=str(e),
            )


class PagerDutyAlertHandler:
    """Send alerts to PagerDuty"""
    
    @staticmethod
    def send_to_pagerduty(alert: Alert, integration_key: str):
        """Send alert to PagerDuty"""
        import os
        import requests
        
        integration_key = integration_key or os.getenv("PAGERDUTY_INTEGRATION_KEY")
        if not integration_key:
            logger.warning(
                "pagerduty_key_not_configured",
                alert_id=alert.id,
            )
            return
        
        try:
            payload = {
                "routing_key": integration_key,
                "event_action": "trigger",
                "dedup_key": alert.id,
                "payload": {
                    "summary": alert.title,
                    "severity": alert.severity.to_pagerduty_level(),
                    "source": alert.source.value,
                    "custom_details": {
                        "description": alert.description,
                        "value": alert.value,
                        "threshold": alert.threshold,
                        "context": alert.context,
                    }
                }
            }
            
            response = requests.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload,
                timeout=5
            )
            
            if response.status_code != 202:
                logger.error(
                    "pagerduty_send_failed",
                    alert_id=alert.id,
                    status=response.status_code,
                )
        
        except Exception as e:
            logger.error(
                "pagerduty_send_error",
                alert_id=alert.id,
                error=str(e),
            )
