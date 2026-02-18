"""
PhishX Prometheus Metrics (Phase 2)

Comprehensive metrics collection for monitoring:
- Request latency and throughput
- Email decision distribution
- External service performance
- Worker utilization
- Queue depth and processing time
"""

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Summary,
    CollectorRegistry,
)
import time
from functools import wraps
from typing import Callable, Any

from log_config import logger

# ========================================
# Prometheus Registry
# ========================================

# Use default registry for easy integration
registry = CollectorRegistry()

# ========================================
# API Metrics
# ========================================

# Request counters
api_requests_total = Counter(
    "phishx_api_requests_total",
    "Total API requests",
    ["endpoint", "method", "status"],
    registry=registry,
)

api_request_duration_seconds = Histogram(
    "phishx_api_request_duration_seconds",
    "API request duration in seconds",
    ["endpoint", "method"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=registry,
)

api_request_size_bytes = Summary(
    "phishx_api_request_size_bytes",
    "API request payload size in bytes",
    ["endpoint"],
    registry=registry,
)

api_response_size_bytes = Summary(
    "phishx_api_response_size_bytes",
    "API response payload size in bytes",
    ["endpoint"],
    registry=registry,
)

# ========================================
# Email Processing Metrics
# ========================================

email_decisions_total = Counter(
    "phishx_email_decisions_total",
    "Total email decisions made",
    ["category", "decision", "tenant"],
    registry=registry,
)

email_risk_score = Histogram(
    "phishx_email_risk_score",
    "Email risk score distribution",
    buckets=list(range(0, 101, 10)) + [100],
    registry=registry,
)

email_processing_duration_seconds = Histogram(
    "phishx_email_processing_duration_seconds",
    "Email processing duration in seconds",
    ["status"],  # success, timeout, error
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0),
    registry=registry,
)

email_processing_errors_total = Counter(
    "phishx_email_processing_errors_total",
    "Total email processing errors",
    ["error_type", "stage"],  # stage: nlp, url, attachment, risk_calc
    registry=registry,
)

# ========================================
# External Service Metrics
# ========================================

external_service_calls_total = Counter(
    "phishx_external_service_calls_total",
    "External service calls",
    ["service", "status"],  # service: nlp, url, clamav; status: success, failure, timeout
    registry=registry,
)

external_service_latency_seconds = Histogram(
    "phishx_external_service_latency_seconds",
    "External service latency",
    ["service"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0),
    registry=registry,
)

external_service_availability_percent = Gauge(
    "phishx_external_service_availability_percent",
    "External service availability percentage",
    ["service"],
    registry=registry,
)

# ========================================
# Queue & Worker Metrics
# ========================================

queue_depth_current = Gauge(
    "phishx_queue_depth_current",
    "Current queue depth",
    ["queue_name"],
    registry=registry,
)

queue_processing_time_seconds = Histogram(
    "phishx_queue_processing_time_seconds",
    "Time to process task from queue",
    ["queue_name"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0),
    registry=registry,
)

queue_tasks_total = Counter(
    "phishx_queue_tasks_total",
    "Total tasks processed",
    ["queue_name", "status"],  # status: success, failure, timeout
    registry=registry,
)

worker_active_tasks = Gauge(
    "phishx_worker_active_tasks",
    "Number of active worker tasks",
    ["worker_name"],
    registry=registry,
)

worker_task_duration_seconds = Histogram(
    "phishx_worker_task_duration_seconds",
    "Worker task execution time",
    ["worker_name"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0),
    registry=registry,
)

# ========================================
# Database Metrics
# ========================================

database_query_duration_seconds = Histogram(
    "phishx_database_query_duration_seconds",
    "Database query execution time",
    ["query_type"],  # select, insert, update, delete
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0),
    registry=registry,
)

database_connection_pool_size = Gauge(
    "phishx_database_connection_pool_size",
    "Database connection pool size",
    registry=registry,
)

database_connection_pool_available = Gauge(
    "phishx_database_connection_pool_available",
    "Available database connections",
    registry=registry,
)

database_errors_total = Counter(
    "phishx_database_errors_total",
    "Total database errors",
    ["error_type"],
    registry=registry,
)

# ========================================
# Cache Metrics
# ========================================

cache_hits_total = Counter(
    "phishx_cache_hits_total",
    "Total cache hits",
    ["cache_type"],  # redis, memory, blocklist
    registry=registry,
)

cache_misses_total = Counter(
    "phishx_cache_misses_total",
    "Total cache misses",
    ["cache_type"],
    registry=registry,
)

cache_size_bytes = Gauge(
    "phishx_cache_size_bytes",
    "Current cache size in bytes",
    ["cache_type"],
    registry=registry,
)

# ========================================
# Security Metrics
# ========================================

rate_limit_exceeded_total = Counter(
    "phishx_rate_limit_exceeded_total",
    "Rate limit exceeded incidents",
    ["limit_type"],  # ip, api_key, tenant
    registry=registry,
)

authentication_failures_total = Counter(
    "phishx_authentication_failures_total",
    "Total authentication failures",
    ["reason"],  # missing_key, invalid_key, expired_token
    registry=registry,
)

suspicious_request_detection_total = Counter(
    "phishx_suspicious_request_detection_total",
    "Suspicious request detections",
    ["detection_type"],  # missing_headers, low_header_count, etc
    registry=registry,
)

# ========================================
# Tenant Metrics
# ========================================

tenant_emails_processed_total = Counter(
    "phishx_tenant_emails_processed_total",
    "Emails processed per tenant",
    ["tenant_id"],
    registry=registry,
)

tenant_alerts_open_current = Gauge(
    "phishx_tenant_alerts_open_current",
    "Open alerts per tenant",
    ["tenant_id"],
    registry=registry,
)

# ========================================
# System Metrics
# ========================================

application_info = Counter(
    "phishx_application_info",
    "Application information",
    ["version", "environment"],
    registry=registry,
)

service_uptime_seconds = Counter(
    "phishx_service_uptime_seconds",
    "Service uptime in seconds",
    registry=registry,
)

# ========================================
# Middleware for Auto-Instrumentation
# ========================================

def track_request_metrics(endpoint: str, method: str):
    """Decorator for tracking API request metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "500"
            
            try:
                result = await func(*args, **kwargs)
                status = "200"
                return result
            except Exception as e:
                status = str(type(e).__name__)
                raise
            finally:
                duration = time.time() - start_time
                
                api_requests_total.labels(
                    endpoint=endpoint,
                    method=method,
                    status=status,
                ).inc()
                
                api_request_duration_seconds.labels(
                    endpoint=endpoint,
                    method=method,
                ).observe(duration)
        
        return wrapper
    return decorator


def track_email_metrics(func: Callable) -> Callable:
    """Decorator for tracking email processing metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            
            # Track decision
            if isinstance(result, dict):
                category = result.get('category', 'COLD')
                decision = result.get('decision', 'ALLOW')
                risk_score = result.get('risk_score', 0)
                tenant = result.get('tenant_id', 'unknown')
                
                email_decisions_total.labels(
                    category=category,
                    decision=decision,
                    tenant=tenant,
                ).inc()
                
                email_risk_score.observe(risk_score)
            
            duration = time.time() - start_time
            email_processing_duration_seconds.labels(
                status="success"
            ).observe(duration)
            
            return result
        
        except Exception as e:
            duration = time.time() - start_time
            email_processing_duration_seconds.labels(
                status="error"
            ).observe(duration)
            
            email_processing_errors_total.labels(
                error_type=type(e).__name__,
                stage="unknown",
            ).inc()
            
            raise
    
    return wrapper


def track_external_service(service_name: str):
    """Decorator for tracking external service calls"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                duration = time.time() - start_time
                external_service_calls_total.labels(
                    service=service_name,
                    status="success",
                ).inc()
                
                external_service_latency_seconds.labels(
                    service=service_name,
                ).observe(duration)
                
                return result
            
            except TimeoutError:
                external_service_calls_total.labels(
                    service=service_name,
                    status="timeout",
                ).inc()
                raise
            
            except Exception:
                external_service_calls_total.labels(
                    service=service_name,
                    status="failure",
                ).inc()
                raise
        
        return wrapper
    return decorator


# ========================================
# Metrics Utilities
# ========================================

def get_all_metrics() -> str:
    """Export all metrics in Prometheus format"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return generate_latest(registry).decode('utf-8')


def get_metric_summary() -> dict:
    """Get summary of key metrics"""
    # Note: In production, integrate with a proper metrics collector
    return {
        "status": "healthy",
        "metrics_available": True,
        "export_path": "/metrics",
    }


def record_service_health(service_name: str, is_healthy: bool, message: str = ""):
    """Record service health status"""
    availability = 100.0 if is_healthy else 0.0
    
    external_service_availability_percent.labels(
        service=service_name,
    ).set(availability)
    
    logger.info(
        "service_health_recorded",
        service=service_name,
        healthy=is_healthy,
        message=message,
    )
