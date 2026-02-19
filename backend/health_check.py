"""
PhishX Enhanced Health Checks (Phase 2)

Deep health monitoring including:
- Component dependency checks
- Queue depth monitoring
- Database performance
- External service availability
- Worker status
- Resource utilization
"""

import os
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import psycopg2
from redis import Redis
import requests

from log_config import logger
from circuit_breaker import get_all_breaker_metrics

DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "1"))
REDIS_SOCKET_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", "2"))

# ========================================
# Health Status Enums
# ========================================

class HealthStatus(str, Enum):
    """Health check status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ComponentType(str, Enum):
    """Component types"""
    DATABASE = "database"
    CACHE = "cache"
    QUEUE = "queue"
    WORKER = "worker"
    EXTERNAL_SERVICE = "external_service"


# ========================================
# Component Health Check
# ========================================

class ComponentHealthCheck:
    """Check health of a single component"""
    
    @staticmethod
    def check_database() -> Dict[str, Any]:
        """Check PostgreSQL database health"""
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "reason": "DATABASE_URL not configured",
                }
            
            conn = psycopg2.connect(
                database_url,
                connect_timeout=DB_CONNECT_TIMEOUT,
            )
            cur = conn.cursor()
            
            # Check connection
            cur.execute("SELECT 1")
            
            # Check table existence
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            table_count = cur.fetchone()[0]
            
            # Check query performance
            start = datetime.utcnow()
            cur.execute("SELECT COUNT(*) FROM email_decisions")
            query_time = (datetime.utcnow() - start).total_seconds()
            
            cur.close()
            conn.close()
            
            status = HealthStatus.HEALTHY
            if query_time > 1.0:
                status = HealthStatus.DEGRADED
            
            return {
                "status": status,
                "type": ComponentType.DATABASE,
                "tables": table_count,
                "query_latency_seconds": round(query_time, 3),
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error("database_health_check_failed", error=str(e))
            return {
                "status": HealthStatus.UNHEALTHY,
                "type": ComponentType.DATABASE,
                "error": str(e),
            }
    
    @staticmethod
    def check_redis() -> Dict[str, Any]:
        """Check Redis cache health"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            client = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=REDIS_SOCKET_TIMEOUT,
                socket_timeout=REDIS_SOCKET_TIMEOUT,
            )
            
            # Check connectivity
            start = datetime.utcnow()
            client.ping()
            ping_time = (datetime.utcnow() - start).total_seconds()
            
            # Check memory
            info = client.info('memory')
            memory_used = info.get('used_memory_human', 'unknown')
            memory_peak = info.get('used_memory_peak_human', 'unknown')
            
            # Check key count
            key_count = client.dbsize()
            
            status = HealthStatus.HEALTHY
            if ping_time > 0.1:
                status = HealthStatus.DEGRADED
            
            return {
                "status": status,
                "type": ComponentType.CACHE,
                "ping_latency_seconds": round(ping_time, 4),
                "memory_used": memory_used,
                "memory_peak": memory_peak,
                "key_count": key_count,
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error("redis_health_check_failed", error=str(e))
            return {
                "status": HealthStatus.UNHEALTHY,
                "type": ComponentType.CACHE,
                "error": str(e),
            }
    
    @staticmethod
    def check_job_queue() -> Dict[str, Any]:
        """Check message queue health"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            client = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=REDIS_SOCKET_TIMEOUT,
                socket_timeout=REDIS_SOCKET_TIMEOUT,
            )
            
            queues = {
                "emails": "celery:emails",
                "high_priority": "celery:high_priority",
                "enrichment": "celery:enrichment",
                "enforcement": "celery:enforcement",
            }
            
            queue_depths = {}
            total_depth = 0
            
            for name, key in queues.items():
                depth = client.llen(key)
                queue_depths[name] = depth
                total_depth += depth
            
            status = HealthStatus.HEALTHY
            if total_depth > 10000:
                status = HealthStatus.DEGRADED
            elif total_depth > 50000:
                status = HealthStatus.UNHEALTHY
            
            return {
                "status": status,
                "type": ComponentType.QUEUE,
                "total_depth": total_depth,
                "queue_depths": queue_depths,
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error("queue_health_check_failed", error=str(e))
            return {
                "status": HealthStatus.UNHEALTHY,
                "type": ComponentType.QUEUE,
                "error": str(e),
            }
    
    @staticmethod
    def check_external_services() -> Dict[str, Any]:
        """Check external service availability"""
        services = {}
        overall_status = HealthStatus.HEALTHY
        
        # Check NLP service
        nlp_url = os.getenv("NLP_SERVICE_URL")
        if nlp_url:
            try:
                start = datetime.utcnow()
                response = requests.get(
                    nlp_url.replace("/predict", "/health"),
                    timeout=2,
                )
                latency = (datetime.utcnow() - start).total_seconds()
                
                status = HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.UNHEALTHY
                services["nlp"] = {
                    "status": status,
                    "latency_seconds": round(latency, 3),
                    "url": nlp_url,
                }
                
                if status != HealthStatus.HEALTHY:
                    overall_status = HealthStatus.DEGRADED
            
            except Exception as e:
                services["nlp"] = {
                    "status": HealthStatus.UNHEALTHY,
                    "error": str(e),
                    "url": nlp_url,
                }
                overall_status = HealthStatus.DEGRADED
        
        # Check ClamAV (antivirus)
        try:
            clamav_host = os.getenv("CLAMAV_HOST", "localhost")
            clamav_port = int(os.getenv("CLAMAV_PORT", "3310"))
            
            # Try to connect
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((clamav_host, clamav_port))
            sock.close()
            
            status = HealthStatus.HEALTHY if result == 0 else HealthStatus.UNHEALTHY
            services["clamav"] = {
                "status": status,
                "host": clamav_host,
                "port": clamav_port,
            }
            
            if status != HealthStatus.HEALTHY:
                overall_status = HealthStatus.DEGRADED
        
        except Exception as e:
            services["clamav"] = {
                "status": HealthStatus.UNHEALTHY,
                "error": str(e),
            }
            overall_status = HealthStatus.DEGRADED
        
        return {
            "overall_status": overall_status,
            "type": ComponentType.EXTERNAL_SERVICE,
            "services": services,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    @staticmethod
    def check_circuit_breakers() -> Dict[str, Any]:
        """Check circuit breaker status"""
        try:
            breaker_metrics = get_all_breaker_metrics()
            
            breakers_status = {}
            any_open = False
            
            for metric in breaker_metrics:
                service = metric.get("service")
                state = metric.get("state")
                success_rate = metric.get("success_rate_percent", 0)
                
                breakers_status[service] = {
                    "state": state,
                    "success_rate_percent": success_rate,
                    "total_calls": metric.get("total_calls"),
                    "failed_calls": metric.get("failed_calls"),
                }
                
                if state == "OPEN":
                    any_open = True
            
            status = HealthStatus.DEGRADED if any_open else HealthStatus.HEALTHY
            
            return {
                "status": status,
                "breakers": breakers_status,
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error("circuit_breaker_health_check_failed", error=str(e))
            return {
                "status": HealthStatus.HEALTHY,  # Non-critical
                "error": str(e),
            }


# ========================================
# System Health Aggregator
# ========================================

class SystemHealthCheck:
    """Aggregate health of entire system"""
    
    @staticmethod
    def get_full_health() -> Dict[str, Any]:
        """Get comprehensive system health"""
        components = {
            "database": ComponentHealthCheck.check_database(),
            "cache": ComponentHealthCheck.check_redis(),
            "queue": ComponentHealthCheck.check_job_queue(),
            "external_services": ComponentHealthCheck.check_external_services(),
            "circuit_breakers": ComponentHealthCheck.check_circuit_breakers(),
        }
        
        # Aggregate status
        statuses = [
            c.get("status") for c in components.values()
            if isinstance(c.get("status"), str)
        ]
        
        # Overall determination
        if HealthStatus.UNHEALTHY in statuses:
            overall_status = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Critical checks
        critical_issues = []
        if components["database"]["status"] == HealthStatus.UNHEALTHY:
            critical_issues.append("Database is unavailable")
        if components["cache"]["status"] == HealthStatus.UNHEALTHY:
            critical_issues.append("Cache (Redis) is unavailable")
        if components["queue"]["status"] == HealthStatus.UNHEALTHY:
            critical_issues.append("Job queue is unavailable")
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "components": components,
            "critical_issues": critical_issues,
            "ready": overall_status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED),
        }
    
    @staticmethod
    def get_readiness() -> Dict[str, Any]:
        """Kubernetes-style readiness probe"""
        health = SystemHealthCheck.get_full_health()
        
        return {
            "ready": health["ready"],
            "status": health["status"],
            "timestamp": health["timestamp"],
            "issues": health.get("critical_issues", []),
        }
    
    @staticmethod
    def get_liveness() -> Dict[str, Any]:
        """Kubernetes-style liveness probe"""
        # Simpler than readiness - just check if process is running
        return {
            "alive": True,
            "timestamp": datetime.utcnow().isoformat(),
        }


# ========================================
# Quick Health Checks (Light)
# ========================================

def quick_health_check() -> Dict[str, Any]:
    """Quick health check (minimal overhead)"""
    try:
        # Just check DB + Redis ping
        db_ok = ComponentHealthCheck.check_database()["status"] != HealthStatus.UNHEALTHY
        cache_ok = ComponentHealthCheck.check_redis()["status"] != HealthStatus.UNHEALTHY
        
        status = HealthStatus.HEALTHY if (db_ok and cache_ok) else HealthStatus.UNHEALTHY
        
        return {
            "status": status,
            "database": db_ok,
            "cache": cache_ok,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    except Exception as e:
        logger.error("quick_health_check_failed", error=str(e))
        return {
            "status": HealthStatus.UNHEALTHY,
            "error": str(e),
        }
