"""
PhishX Message Queue Configuration (Redis-backed)

Handles async task processing for email analysis pipeline.
Decouples ingestion from processing for better scalability.
"""

import os
from celery import Celery
from kombu import Queue, Exchange
from datetime import timedelta

# ========================================
# Celery Configuration
# ========================================

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

app = Celery(
    "PhishX",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

# ========================================
# Queue Setup
# ========================================

default_exchange = Exchange("phishx", type="direct", durable=True)

app.conf.task_queues = (
    Queue(
        "emails",
        exchange=default_exchange,
        routing_key="email.process",
        durable=True,
        queue_arguments={"x-max-priority": 10},
    ),
    Queue(
        "high_priority",
        exchange=default_exchange,
        routing_key="email.priority",
        durable=True,
        queue_arguments={"x-max-priority": 10},
    ),
    Queue(
        "enrichment",
        exchange=default_exchange,
        routing_key="email.enrich",
        durable=True,
    ),
    Queue(
        "enforcement",
        exchange=default_exchange,
        routing_key="email.enforce",
        durable=True,
    ),
)

# ========================================
# Task Configuration
# ========================================

app.conf.task_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.result_serializer = "json"
app.conf.timezone = "UTC"
app.conf.enable_utc = True

# Task timeouts and retries
app.conf.task_soft_time_limit = 30  # seconds
app.conf.task_time_limit = 60  # seconds
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1  # Process one task at a time

# Retry policy for failed tasks
app.conf.task_autoretry_for = (Exception,)
app.conf.task_max_retries = 3
app.conf.task_default_retry_delay = 60  # seconds

# ========================================
# Result Backend Configuration
# ========================================

app.conf.result_expires = timedelta(hours=1)  # Keep results for 1 hour
app.conf.result_backend_transport_options = {
    "master_name": "mymaster",
    "socket_connect_timeout": 5,
    "socket_timeout": 5,
    "retry_on_timeout": True,
}

# ========================================
# Task Routes
# ========================================

app.conf.task_routes = {
    "tasks.process_email": {"queue": "emails"},
    "tasks.enrich_email": {"queue": "enrichment"},
    "tasks.enforce_decision": {"queue": "enforcement"},
    "tasks.high_priority_email": {"queue": "high_priority"},
}

# ========================================
# Periodic Tasks (Scheduled)
# ========================================

from celery.schedules import crontab

app.conf.beat_schedule = {
    "cleanup-expired-alerts": {
        "task": "tasks.cleanup_expired_alerts",
        "schedule": crontab(hour=1, minute=0),  # Daily at 1 AM
    },
    "sync-threat-intel": {
        "task": "tasks.sync_threat_intelligence",
        "schedule": crontab(hour="*/6"),  # Every 6 hours
    },
}

# ========================================
# Utility Functions
# ========================================

def get_queue_stats():
    """Get current queue depth statistics"""
    from redis import Redis
    
    redis_client = Redis.from_url(REDIS_URL)
    stats = {}
    
    for queue_name in ["emails", "high_priority", "enrichment", "enforcement"]:
        queue_key = f"celery:{queue_name}"
        depth = redis_client.llen(queue_key)
        stats[queue_name] = depth
    
    return stats

def clear_failed_tasks():
    """Clear failed tasks from broker"""
    from redis import Redis
    
    redis_client = Redis.from_url(REDIS_URL)
    # Implementation would depend on your failure handling strategy
    pass
