"""
PhishX Test Configuration & Fixtures
Backend Developer: AI Co-worker
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="module")
def client():
    """FastAPI test client with mocked dependencies."""
    with patch("db.get_db") as mock_db, \
         patch("tasks.process_email") as mock_task, \
         patch("rate_limiter.limiter") as mock_limiter:

        mock_db.return_value = MagicMock()
        mock_task.delay = MagicMock(return_value=MagicMock(id="test-task-id"))

        from app_new import app
        with TestClient(app) as c:
            yield c


@pytest.fixture
def valid_jwt_headers():
    """Headers with a valid JWT token for authenticated requests."""
    return {"Authorization": "Bearer test-valid-token"}


@pytest.fixture
def expired_jwt_headers():
    """Headers with an expired JWT token."""
    return {"Authorization": "Bearer test-expired-token"}


@pytest.fixture
def sample_email_payload():
    return {
        "sender": "attacker@phish-domain.xyz",
        "recipient": "victim@company.com",
        "subject": "Urgent: Verify your account",
        "body": "Click here immediately: http://malicious-link.xyz/verify",
        "headers": {}
    }


@pytest.fixture
def sample_batch_urls():
    return {"urls": [f"http://test-url-{i}.com" for i in range(5)]}
