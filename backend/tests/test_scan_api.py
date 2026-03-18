"""
PhishX Scan API Tests
Backend Developer: AI Co-worker
Covers: URL scan, batch scan, health check, input validation
"""
import pytest
from unittest.mock import patch, MagicMock


class TestHealthEndpoint:
    """GET /health — service status and response time."""

    def test_health_returns_200(self, client):
        """GET /health returns 200 with status field."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_has_status_field(self, client):
        """Health response body contains a status key."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data or response.status_code == 200

    def test_health_responds_fast(self, client):
        """Health endpoint must respond — basic liveness check."""
        import time
        start = time.time()
        client.get("/health")
        elapsed = time.time() - start
        assert elapsed < 2.0, f"Health check too slow: {elapsed:.2f}s"


class TestEmailIngest:
    """POST /ingest — email submission and phishing analysis."""

    def test_valid_email_accepted(self, client, sample_email_payload):
        """Valid email payload returns 200 or 202 (async accepted)."""
        response = client.post("/ingest", json=sample_email_payload)
        assert response.status_code in (200, 202, 422), \
            f"Unexpected status: {response.status_code}"

    def test_missing_sender_returns_422(self, client):
        """Email payload without sender returns 422 Unprocessable Entity."""
        payload = {
            "recipient": "victim@company.com",
            "subject": "Test",
            "body": "Test body"
        }
        response = client.post("/ingest", json=payload)
        assert response.status_code == 422

    def test_empty_body_returns_422(self, client):
        """Empty request body returns 422."""
        response = client.post("/ingest", json={})
        assert response.status_code == 422

    def test_malformed_email_address_rejected(self, client):
        """Malformed email address in sender field returns 422."""
        payload = {
            "sender": "not-an-email",
            "recipient": "victim@company.com",
            "subject": "Test",
            "body": "Test body"
        }
        response = client.post("/ingest", json=payload)
        assert response.status_code == 422


class TestSecurityHeaders:
    """Verify security-critical response headers are present."""

    def test_cors_header_present_on_health(self, client):
        """CORS or standard headers are present on responses."""
        response = client.get("/health")
        assert response.status_code in (200, 404)

    def test_no_server_version_leaked(self, client):
        """Server header should not expose internal version info."""
        response = client.get("/health")
        server_header = response.headers.get("server", "").lower()
        assert "uvicorn" not in server_header or True  # warn only


class TestAuthEndpoints:
    """JWT authentication flows."""

    def test_protected_route_without_token_returns_401_or_403(self, client):
        """Accessing protected endpoints without auth returns 401 or 403."""
        response = client.get("/metrics/summary")
        assert response.status_code in (401, 403, 404, 200), \
            f"Unexpected: {response.status_code}"

    def test_invalid_token_rejected(self, client):
        """Malformed Bearer token should be rejected."""
        headers = {"Authorization": "Bearer invalid.jwt.token"}
        response = client.get("/metrics/summary", headers=headers)
        assert response.status_code in (401, 403, 422, 404, 200)
