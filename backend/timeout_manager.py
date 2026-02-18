"""
PhishX Timeout Management (Phase 2)

Comprehensive timeout handling for:
- External service calls
- Database queries
- Task execution
- Queue processing
- API requests
"""

import signal
import asyncio
import time
import threading
from functools import wraps
from typing import Callable, Any, Optional
from contextlib import asynccontextmanager

from log_config import logger

# ========================================
# Timeout Configuration
# ========================================

class TimeoutConfig:
    """Centralized timeout configuration"""
    
    # External service timeouts
    NLP_SERVICE_TIMEOUT = 5  # seconds
    URL_ANALYZER_TIMEOUT = 5
    CLAMAV_TIMEOUT = 10
    
    # Database timeouts
    DATABASE_QUERY_TIMEOUT = 10  # seconds
    DATABASE_CONNECTION_TIMEOUT = 3
    
    # Task timeouts (Celery)
    TASK_SOFT_TIMEOUT = 30  # seconds (warning)
    TASK_HARD_TIMEOUT = 60  # seconds (kill)
    
    # API request timeout
    API_REQUEST_TIMEOUT = 30  # seconds
    
    # Queue operation timeout
    QUEUE_OPERATION_TIMEOUT = 5  # seconds
    
    @classmethod
    def get_timeout(cls, operation_type: str) -> int:
        """Get timeout for operation type"""
        timeouts = {
            "nlp": cls.NLP_SERVICE_TIMEOUT,
            "url_analyzer": cls.URL_ANALYZER_TIMEOUT,
            "clamav": cls.CLAMAV_TIMEOUT,
            "database_query": cls.DATABASE_QUERY_TIMEOUT,
            "database_connection": cls.DATABASE_CONNECTION_TIMEOUT,
            "task": cls.TASK_SOFT_TIMEOUT,
            "api_request": cls.API_REQUEST_TIMEOUT,
            "queue": cls.QUEUE_OPERATION_TIMEOUT,
        }
        return timeouts.get(operation_type, 5)


# ========================================
# Async Timeout Wrapper
# ========================================

class TimeoutError(Exception):
    """Raised when operation exceeds timeout"""
    pass


@asynccontextmanager
async def async_timeout(timeout_seconds: float, operation: str = "operation"):
    """
    Async context manager for timeout handling.
    
    Usage:
        async with async_timeout(5, "nlp_service"):
            result = await nlp_service.predict(text)
    """
    async def timeout_handler():
        await asyncio.sleep(timeout_seconds)
        raise TimeoutError(f"{operation} exceeded {timeout_seconds}s timeout")
    
    task = None
    try:
        # Create timeout task
        task = asyncio.create_task(timeout_handler())
        yield
    except TimeoutError:
        logger.warning(
            "async_operation_timeout",
            operation=operation,
            timeout_seconds=timeout_seconds,
        )
        raise
    finally:
        if task:
            task.cancel()


# ========================================
# Sync Timeout Wrapper
# ========================================

def _timeout_handler(signum, frame):
    """Signal handler for timeout"""
    raise TimeoutError("Operation exceeded timeout")


class SyncTimeout:
    """Synchronous timeout context manager"""
    
    def __init__(self, timeout_seconds: float, operation: str = "operation"):
        self.timeout_seconds = timeout_seconds
        self.operation = operation
        self.original_handler = None
    
    def __enter__(self):
        # Set signal handler
        self.original_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(int(self.timeout_seconds))
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cancel alarm
        signal.alarm(0)
        signal.signal(signal.SIGALRM, self.original_handler)
        
        if exc_type is TimeoutError:
            logger.warning(
                "sync_operation_timeout",
                operation=self.operation,
                timeout_seconds=self.timeout_seconds,
            )


# ========================================
# Decorator-based Timeout
# ========================================

def with_timeout(timeout_seconds: float, operation: str = ""):
    """
    Decorator for timeout protection.
    
    Usage:
        @with_timeout(5, "nlp_service")
        def call_nlp_service(text):
            ...
    """
    def decorator(func: Callable) -> Callable:
        op_name = operation or func.__name__
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                # For now, just warn if timeout is reached
                # In production, use signal handlers or multiprocessing
                result = func(*args, **kwargs)
                
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    logger.warning(
                        "operation_exceeded_timeout_threshold",
                        operation=op_name,
                        timeout_seconds=timeout_seconds,
                        elapsed_seconds=round(elapsed, 2),
                    )
                
                return result
            
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(
                    "operation_failed_with_timeout",
                    operation=op_name,
                    error=str(e),
                    elapsed_seconds=round(elapsed, 2),
                )
                raise
        
        return wrapper
    
    return decorator


# ========================================
# Requests Timeout Wrapper
# ========================================

class RequestWithTimeout:
    """Wrapper for requests library with timeout"""
    
    @staticmethod
    def get(url: str, timeout: float = 5, **kwargs) -> dict:
        """GET request with timeout"""
        import requests
        
        try:
            start_time = time.time()
            response = requests.get(url, timeout=timeout, **kwargs)
            elapsed = time.time() - start_time
            
            logger.debug(
                "http_get_completed",
                url=url,
                status=response.status_code,
                elapsed_seconds=round(elapsed, 3),
            )
            
            return response
        
        except requests.exceptions.Timeout:
            logger.warning(
                "http_get_timeout",
                url=url,
                timeout_seconds=timeout,
            )
            raise TimeoutError(f"GET {url} exceeded {timeout}s timeout")
        
        except Exception as e:
            logger.error(
                "http_get_failed",
                url=url,
                error=str(e),
            )
            raise
    
    @staticmethod
    def post(url: str, timeout: float = 5, **kwargs) -> dict:
        """POST request with timeout"""
        import requests
        
        try:
            start_time = time.time()
            response = requests.post(url, timeout=timeout, **kwargs)
            elapsed = time.time() - start_time
            
            logger.debug(
                "http_post_completed",
                url=url,
                status=response.status_code,
                elapsed_seconds=round(elapsed, 3),
            )
            
            return response
        
        except requests.exceptions.Timeout:
            logger.warning(
                "http_post_timeout",
                url=url,
                timeout_seconds=timeout,
            )
            raise TimeoutError(f"POST {url} exceeded {timeout}s timeout")
        
        except Exception as e:
            logger.error(
                "http_post_failed",
                url=url,
                error=str(e),
            )
            raise


# ========================================
# Database Query Timeout
# ========================================

class DatabaseQueryTimeout:
    """Database query execution with timeout"""
    
    @staticmethod
    def execute(cursor, query: str, params: tuple = (), timeout: float = 10):
        """Execute query with timeout"""
        import psycopg2
        
        try:
            start_time = time.time()
            
            # Set statement timeout (PostgreSQL)
            cursor.execute(f"SET statement_timeout = {int(timeout * 1000)}")
            
            cursor.execute(query, params)
            
            elapsed = time.time() - start_time
            
            logger.debug(
                "database_query_executed",
                query=query[:100],  # First 100 chars
                elapsed_seconds=round(elapsed, 3),
            )
            
            return cursor
        
        except psycopg2.extensions.QueryCanceledError:
            logger.warning(
                "database_query_timeout",
                query=query[:100],
                timeout_seconds=timeout,
            )
            raise TimeoutError(f"Query exceeded {timeout}s timeout")
        
        except Exception as e:
            logger.error(
                "database_query_failed",
                query=query[:100],
                error=str(e),
            )
            raise


# ========================================
# Task Timeout Management
# ========================================

class TaskTimeoutManager:
    """Manage task execution timeouts"""
    
    @staticmethod
    def configure_celery_timeouts(app):
        """Configure Celery with appropriate timeouts"""
        app.conf.task_soft_time_limit = TimeoutConfig.TASK_SOFT_TIMEOUT
        app.conf.task_time_limit = TimeoutConfig.TASK_HARD_TIMEOUT
        app.conf.task_acks_late = True
        
        logger.info(
            "celery_timeouts_configured",
            soft_timeout=TimeoutConfig.TASK_SOFT_TIMEOUT,
            hard_timeout=TimeoutConfig.TASK_HARD_TIMEOUT,
        )
    
    @staticmethod
    def handle_timeout_exception(exc):
        """Handle task timeout exceptions"""
        logger.error(
            "task_timeout_exceeded",
            error=str(exc),
            type=type(exc).__name__,
        )
        
        # Could implement recovery logic here
        # E.g., cleanup, notifications, etc.


# ========================================
# Timeout Monitoring & Metrics
# ========================================

class TimeoutMetrics:
    """Track timeout metrics"""
    
    timeouts_by_operation = {}
    timeout_lock = threading.Lock()
    
    @classmethod
    def record_timeout(cls, operation: str, timeout_seconds: float):
        """Record a timeout occurrence"""
        with cls.timeout_lock:
            if operation not in cls.timeouts_by_operation:
                cls.timeouts_by_operation[operation] = []
            
            cls.timeouts_by_operation[operation].append({
                "timestamp": time.time(),
                "timeout_seconds": timeout_seconds,
            })
        
        logger.warning(
            "timeout_recorded",
            operation=operation,
            timeout_seconds=timeout_seconds,
        )
    
    @classmethod
    def get_timeout_stats(cls) -> dict:
        """Get timeout statistics"""
        with cls.timeout_lock:
            stats = {}
            for operation, timeouts in cls.timeouts_by_operation.items():
                stats[operation] = {
                    "count": len(timeouts),
                    "last_timeout": timeouts[-1]["timestamp"] if timeouts else None,
                }
            return stats


# ========================================
# Utility Functions
# ========================================

def set_operation_timeout(operation_type: str) -> int:
    """Get and set timeout for operation type"""
    timeout = TimeoutConfig.get_timeout(operation_type)
    logger.debug(
        "operation_timeout_set",
        operation=operation_type,
        timeout_seconds=timeout,
    )
    return timeout


def is_timeout_exceeded(start_time: float, timeout_seconds: float) -> bool:
    """Check if timeout has been exceeded"""
    elapsed = time.time() - start_time
    return elapsed > timeout_seconds


def get_remaining_timeout(start_time: float, timeout_seconds: float) -> float:
    """Get remaining timeout"""
    elapsed = time.time() - start_time
    remaining = timeout_seconds - elapsed
    return max(0, remaining)
