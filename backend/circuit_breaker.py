"""
PhishX Circuit Breaker Implementation (Phase 2)

Implements failure detection and graceful degradation for external services.
Prevents cascading failures when upstream services become unavailable.

Patterns:
- Closed: Normal operation
- Open: Service unavailable, failing fast
- Half-open: Testing if service recovered
"""

import time
import threading
from typing import Callable, Any, Optional, Dict
from enum import Enum
from datetime import datetime, timedelta
import functools

from log_config import logger

# ========================================
# Circuit Breaker States
# ========================================

class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "CLOSED"           # Normal operation
    OPEN = "OPEN"              # Service unavailable
    HALF_OPEN = "HALF_OPEN"    # Testing recovery


# ========================================
# Circuit Breaker Implementation
# ========================================

class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    Protects against cascading failures by:
    1. Counting failures
    2. Opening circuit when threshold reached
    3. Failing fast to preserve resources
    4. Test recovery periodically
    5. Resuming normal operation after recovery
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: tuple = (Exception,),
        success_threshold: int = 2,
    ):
        """
        Initialize circuit breaker
        
        Args:
            name: Service name for logging
            failure_threshold: Failures before opening (default: 5)
            recovery_timeout: Seconds before trying recovery (default: 60)
            expected_exception: Exception types that count as failures
            success_threshold: Successes in half-open before closing (default: 2)
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.success_threshold = success_threshold
        
        # State tracking
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._opened_time: Optional[datetime] = None
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Metrics
        self._total_calls = 0
        self._successful_calls = 0
        self._failed_calls = 0
        self._rejected_calls = 0
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state"""
        with self._lock:
            return self._state
    
    @property
    def is_open(self) -> bool:
        """Check if circuit is open (failing fast)"""
        return self.state == CircuitState.OPEN
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker.
        
        Args:
            func: Callable to execute
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerOpen: If circuit is open
            Original exception: If function fails
        """
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    logger.info(
                        "circuit_breaker_half_open",
                        service=self.name,
                        state=self._state,
                    )
                else:
                    self._rejected_calls += 1
                    logger.warning(
                        "circuit_breaker_rejected_call",
                        service=self.name,
                        state="OPEN",
                    )
                    raise CircuitBreakerOpen(
                        f"Circuit breaker open for {self.name}"
                    )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if recovery timeout has passed"""
        if self._opened_time is None:
            return False
        
        elapsed = datetime.utcnow() - self._opened_time
        return elapsed.total_seconds() >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful call"""
        with self._lock:
            self._total_calls += 1
            self._successful_calls += 1
            
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                
                if self._success_count >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._last_failure_time = None
                    
                    logger.info(
                        "circuit_breaker_closed",
                        service=self.name,
                        state=CircuitState.CLOSED,
                    )
            
            elif self._state == CircuitState.CLOSED:
                self._failure_count = 0
    
    def _on_failure(self):
        """Handle failed call"""
        with self._lock:
            self._total_calls += 1
            self._failed_calls += 1
            self._failure_count += 1
            self._last_failure_time = datetime.utcnow()
            
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._opened_time = datetime.utcnow()
                
                logger.warning(
                    "circuit_breaker_open_half_open_failure",
                    service=self.name,
                    state=CircuitState.OPEN,
                )
            
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    self._opened_time = datetime.utcnow()
                    
                    logger.warning(
                        "circuit_breaker_open_threshold",
                        service=self.name,
                        state=CircuitState.OPEN,
                        failure_count=self._failure_count,
                    )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics"""
        with self._lock:
            total = self._total_calls
            success_rate = (
                (self._successful_calls / total * 100) if total > 0 else 0
            )
            
            return {
                "service": self.name,
                "state": self._state,
                "total_calls": self._total_calls,
                "successful_calls": self._successful_calls,
                "failed_calls": self._failed_calls,
                "rejected_calls": self._rejected_calls,
                "success_rate_percent": round(success_rate, 2),
                "failure_count": self._failure_count,
                "last_failure_time": (
                    self._last_failure_time.isoformat()
                    if self._last_failure_time else None
                ),
            }
    
    def reset(self):
        """Manually reset circuit breaker"""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None
            self._opened_time = None
            
            logger.info(
                "circuit_breaker_reset",
                service=self.name,
            )


# ========================================
# Circuit Breaker Exceptions
# ========================================

class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreakerTimeout(Exception):
    """Raised when circuit breaker operation times out"""
    pass


# ========================================
# Decorator-based Circuit Breaker
# ========================================

# Global circuit breaker registry
_breakers: Dict[str, CircuitBreaker] = {}
_breaker_lock = threading.Lock()


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    exceptions: tuple = (Exception,),
):
    """
    Decorator for circuit breaker protection.
    
    Usage:
        @circuit_breaker(
            name="external_api",
            failure_threshold=5,
            recovery_timeout=60
        )
        def call_external_api():
            ...
    """
    def decorator(func: Callable) -> Callable:
        # Create or reuse breaker
        with _breaker_lock:
            if name not in _breakers:
                _breakers[name] = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    expected_exception=exceptions,
                )
            breaker = _breakers[name]
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)
        
        # Attach breaker for metrics access
        wrapper.circuit_breaker = breaker
        return wrapper
    
    return decorator


# ========================================
# Fallback Handlers
# ========================================

class FallbackHandler:
    """Handles fallback behavior when services fail"""
    
    @staticmethod
    def nlp_fallback(subject: str, body: str, error: str = "") -> dict:
        """Fallback for NLP service failure"""
        logger.warning(
            "nlp_fallback_used",
            reason=error,
        )
        return {
            "text_ml_score": 0.0,
            "model_version": "fallback",
            "error": error,
        }
    
    @staticmethod
    def url_fallback(urls: list, error: str = "") -> dict:
        """Fallback for URL analyzer failure"""
        logger.warning(
            "url_fallback_used",
            url_count=len(urls),
            reason=error,
        )
        return {
            "score": 0.0,
            "signals": ["External URL service unavailable"],
            "error": error,
        }
    
    @staticmethod
    def clamav_fallback(file_content: bytes, error: str = "") -> dict:
        """Fallback for ClamAV failure"""
        logger.warning(
            "clamav_fallback_used",
            reason=error,
        )
        return {
            "infected": False,
            "threats": [],
            "error": error,
        }


# ========================================
# Utility Functions
# ========================================

def get_breaker(name: str) -> Optional[CircuitBreaker]:
    """Get circuit breaker by name"""
    with _breaker_lock:
        return _breakers.get(name)


def get_all_breakers() -> Dict[str, CircuitBreaker]:
    """Get all circuit breakers"""
    with _breaker_lock:
        return dict(_breakers)


def get_all_breaker_metrics() -> list:
    """Get metrics for all circuit breakers"""
    metrics = []
    for breaker in get_all_breakers().values():
        metrics.append(breaker.get_metrics())
    return metrics


def reset_breaker(name: str) -> bool:
    """Reset circuit breaker by name"""
    breaker = get_breaker(name)
    if breaker:
        breaker.reset()
        return True
    return False


def reset_all_breakers():
    """Reset all circuit breakers"""
    for breaker in get_all_breakers().values():
        breaker.reset()
