"""
PhishX Load Tests — Locust
QA Agent: AI Co-worker

Usage:
  # Headless CI run (100 users, 10 spawn/s, 60s)
  locust -f backend/tests/load/locustfile.py \
         --headless -u 100 -r 10 -t 60s \
         --host http://localhost:8000 \
         --html backend/tests/load/report.html

  # Interactive UI
  locust -f backend/tests/load/locustfile.py --host http://localhost:8000

SLA targets (fail CI if exceeded):
  - /health p95 < 200ms
  - /ingest p95 < 2000ms
  - Error rate < 1%
"""

from locust import HttpUser, task, between, events
from locust.runners import MasterRunner
import json
import random
import string


# ── Realistic test data ───────────────────────────────────────────

PHISHING_URLS = [
    "http://paypa1.com/login/secure",
    "http://192.168.1.100/banking/verify",
    "http://amazon-security-alert.xyz/account",
    "http://google.com.phishing-domain.ru/signin",
    "http://update-your-account-now.tk/verify",
]

SAFE_URLS = [
    "https://google.com",
    "https://github.com",
    "https://stackoverflow.com",
    "https://python.org",
    "https://docs.fastapi.tiangolo.com",
]

SAMPLE_SENDERS = [
    "attacker@phish-domain.xyz",
    "support@paypa1-secure.com",
    "noreply@amazon-alerts.ru",
    "security@bank0famerica.net",
]

SAMPLE_SUBJECTS = [
    "Urgent: Your account has been compromised",
    "Verify your identity immediately",
    "Suspicious login detected — action required",
    "Your package could not be delivered",
]


def random_body(length=200):
    return "".join(random.choices(string.ascii_letters + " ", k=length))


# ── User behaviour: normal SOC analyst ───────────────────────────

class PhishXAnalystUser(HttpUser):
    """Simulates a SOC analyst using the Guardstone Console."""
    wait_time = between(1, 3)
    weight = 70  # 70% of traffic is normal analyst usage

    def on_start(self):
        """Authenticate before running tasks."""
        # Try auth — gracefully handle if endpoint differs
        self.client.post("/auth/login", json={
            "username": "analyst@phishx.io",
            "password": "test_password"
        }, catch_response=True)

    @task(5)
    def health_check(self):
        """Health check — most frequent, very fast."""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(3)
    def ingest_phishing_email(self):
        """Submit a suspicious email for analysis."""
        payload = {
            "sender": random.choice(SAMPLE_SENDERS),
            "recipient": "victim@company.com",
            "subject": random.choice(SAMPLE_SUBJECTS),
            "body": f"Click here: {random.choice(PHISHING_URLS)} {random_body(100)}",
            "headers": {"X-Mailer": "PHPMailer", "X-Spam-Score": "8.5"}
        }
        with self.client.post(
            "/ingest",
            json=payload,
            catch_response=True,
            name="/ingest [phishing]"
        ) as response:
            if response.status_code in (200, 202, 422):
                response.success()
            else:
                response.failure(f"Unexpected: {response.status_code}")

    @task(2)
    def ingest_safe_email(self):
        """Submit a benign email — tests false-positive handling."""
        payload = {
            "sender": "newsletter@trusted-company.com",
            "recipient": "analyst@company.com",
            "subject": "Monthly security digest",
            "body": f"This month in security: {random.choice(SAFE_URLS)}",
            "headers": {}
        }
        with self.client.post(
            "/ingest",
            json=payload,
            catch_response=True,
            name="/ingest [safe]"
        ) as response:
            if response.status_code in (200, 202, 422):
                response.success()
            else:
                response.failure(f"Unexpected: {response.status_code}")

    @task(1)
    def get_metrics_summary(self):
        """Fetch Prometheus metrics summary."""
        with self.client.get(
            "/metrics/summary",
            catch_response=True,
            name="/metrics/summary"
        ) as response:
            if response.status_code in (200, 401, 403, 404):
                response.success()
            else:
                response.failure(f"Metrics failed: {response.status_code}")


# ── User behaviour: API integration (automated scanners) ─────────

class PhishXAPIUser(HttpUser):
    """Simulates automated API clients sending bulk scan requests."""
    wait_time = between(0.1, 0.5)
    weight = 30  # 30% of traffic is API client usage

    @task(8)
    def rapid_health_checks(self):
        """Automated monitoring pinging health endpoint."""
        self.client.get("/health", name="/health [monitor]")

    @task(2)
    def batch_ingest(self):
        """Simulate an API client sending multiple emails rapidly."""
        for _ in range(3):
            self.client.post("/ingest", json={
                "sender": random.choice(SAMPLE_SENDERS),
                "recipient": f"user{random.randint(1,1000)}@corp.com",
                "subject": random.choice(SAMPLE_SUBJECTS),
                "body": random_body(300),
                "headers": {}
            }, catch_response=True, name="/ingest [batch]")


# ── SLA validation at end of test ────────────────────────────────

@events.quitting.add_listener
def check_slas(environment, **kwargs):
    """Fail the load test if SLA targets are breached."""
    stats = environment.runner.stats

    failures = []

    # Check /health p95 < 200ms
    health_stats = stats.get("/health", "GET")
    if health_stats and health_stats.get_response_time_percentile(0.95) > 200:
        failures.append(
            f"/health p95 = {health_stats.get_response_time_percentile(0.95):.0f}ms (limit: 200ms)"
        )

    # Check /ingest p95 < 2000ms
    ingest_stats = stats.get("/ingest [phishing]", "POST")
    if ingest_stats and ingest_stats.get_response_time_percentile(0.95) > 2000:
        failures.append(
            f"/ingest p95 = {ingest_stats.get_response_time_percentile(0.95):.0f}ms (limit: 2000ms)"
        )

    # Check overall error rate < 1%
    total = stats.total
    if total.num_requests > 0:
        error_rate = total.num_failures / total.num_requests * 100
        if error_rate > 1.0:
            failures.append(f"Error rate = {error_rate:.2f}% (limit: 1%)")

    if failures:
        print(f"\n❌ SLA VIOLATIONS:\n" + "\n".join(f"  - {f}" for f in failures))
        environment.process_exit_code = 1
    else:
        print("\n✅ All SLA targets met")
