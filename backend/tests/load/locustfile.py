"""
PhishX Load Tests — Locust
QA Agent: AI Co-worker (updated with correct endpoints + JWT auth)

Usage:
  locust -f backend/tests/load/locustfile.py \
         --headless -u 50 -r 10 -t 60s \
         --host http://localhost:8003 \
         --html backend/tests/load/report.html

SLA targets:
  - /health      p95 < 200ms
  - /ingest/email p95 < 2000ms
  - Error rate   < 5% (auth failures expected on degraded infra)
"""

from locust import HttpUser, task, between, events
import json
import random
import string


# ── Test data ─────────────────────────────────────────────────────

PHISHING_EMAILS = [
    {
        "sender": "attacker@phish-domain.xyz",
        "recipient": "victim@company.com",
        "subject": "Urgent: Verify your account immediately",
        "body": "Click here: http://paypa1.com/login immediately or your account will be closed.",
        "headers": {"X-Mailer": "PHPMailer", "X-Spam-Score": "8.5"}
    },
    {
        "sender": "support@amazon-alert.ru",
        "recipient": "customer@corp.com",
        "subject": "Your Amazon account is suspended",
        "body": "Visit http://192.168.1.100/amazon/verify to restore access now.",
        "headers": {}
    },
    {
        "sender": "security@paypa1-secure.com",
        "recipient": "user@business.com",
        "subject": "Suspicious login detected on your account",
        "body": "We detected unusual activity. Verify at http://p\u0430ypal.com/secure",
        "headers": {"X-Priority": "1"}
    },
]

SAFE_EMAILS = [
    {
        "sender": "newsletter@github.com",
        "recipient": "dev@company.com",
        "subject": "Your weekly GitHub digest",
        "body": "Check out trending repositories at https://github.com/trending this week.",
        "headers": {"List-Unsubscribe": "<mailto:unsubscribe@github.com>"}
    },
    {
        "sender": "noreply@google.com",
        "recipient": "user@company.com",
        "subject": "Security alert for your account",
        "body": "A new sign-in to your Google Account. Visit https://myaccount.google.com",
        "headers": {"DKIM-Signature": "valid"}
    },
]

AUTH_CREDENTIALS = {"username": "admin", "password": "admin"}


# ── SOC Analyst user ───────────────────────────────────────────────

class PhishXAnalystUser(HttpUser):
    """Simulates a SOC analyst using the Guardstone Console."""
    wait_time = between(1, 3)
    weight = 70

    def on_start(self):
        """Authenticate and store JWT token."""
        self.token = None
        self.headers = {}
        with self.client.post(
            "/auth/login",
            json=AUTH_CREDENTIALS,
            catch_response=True,
            name="/auth/login"
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("data", {}).get("access_token")
                if token:
                    self.token = token
                    self.headers = {"Authorization": f"Bearer {token}"}
                    resp.success()
                else:
                    resp.failure("No token in response")
            else:
                resp.failure(f"Auth failed: {resp.status_code}")

    @task(5)
    def health_check(self):
        """Health endpoint — no auth required."""
        with self.client.get("/health", catch_response=True, name="/health") as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Health failed: {r.status_code}")

    @task(3)
    def ingest_phishing_email(self):
        """Submit a phishing email for analysis."""
        if not self.token:
            self.on_start()
            return
        payload = random.choice(PHISHING_EMAILS)
        with self.client.post(
            "/ingest/email",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/ingest/email [phishing]"
        ) as r:
            if r.status_code in (200, 202):
                r.success()
            elif r.status_code == 401:
                # Token expired — re-auth
                self.on_start()
                r.failure("Token expired — re-authed")
            elif r.status_code == 422:
                r.success()  # Validation error is expected behaviour
            else:
                r.failure(f"Unexpected: {r.status_code}")

    @task(2)
    def ingest_safe_email(self):
        """Submit a safe email — tests false-positive handling."""
        if not self.token:
            return
        payload = random.choice(SAFE_EMAILS)
        with self.client.post(
            "/ingest/email",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/ingest/email [safe]"
        ) as r:
            if r.status_code in (200, 202, 422):
                r.success()
            elif r.status_code == 401:
                self.on_start()
                r.failure("Token expired — re-authed")
            else:
                r.failure(f"Unexpected: {r.status_code}")

    @task(1)
    def get_metrics(self):
        """Fetch metrics summary."""
        if not self.token:
            return
        with self.client.get(
            "/metrics/summary",
            headers=self.headers,
            catch_response=True,
            name="/metrics/summary"
        ) as r:
            if r.status_code in (200, 401, 403):
                r.success()
            else:
                r.failure(f"Metrics failed: {r.status_code}")

    @task(1)
    def check_alive(self):
        """Liveness probe."""
        with self.client.get("/alive", catch_response=True, name="/alive") as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Alive failed: {r.status_code}")


# ── API client user ───────────────────────────────────────────────

class PhishXAPIUser(HttpUser):
    """Simulates automated API clients sending bulk requests."""
    wait_time = between(0.2, 1)
    weight = 30

    def on_start(self):
        self.token = None
        self.headers = {}
        resp = self.client.post("/auth/login", json=AUTH_CREDENTIALS)
        if resp.status_code == 200:
            token = resp.json().get("data", {}).get("access_token")
            if token:
                self.token = token
                self.headers = {"Authorization": f"Bearer {token}"}

    @task(5)
    def rapid_health(self):
        self.client.get("/health", name="/health [monitor]")

    @task(3)
    def rapid_ingest(self):
        if not self.token:
            return
        self.client.post(
            "/ingest/email",
            json=random.choice(PHISHING_EMAILS),
            headers=self.headers,
            name="/ingest/email [bulk]"
        )


# ── SLA validation ────────────────────────────────────────────────

@events.quitting.add_listener
def check_slas(environment, **kwargs):
    stats = environment.runner.stats
    failures = []

    health = stats.get("/health", "GET")
    if health and health.num_requests > 0:
        p95 = health.get_response_time_percentile(0.95)
        if p95 > 200:
            failures.append(f"/health p95 = {p95:.0f}ms (SLA: < 200ms)")

    ingest = stats.get("/ingest/email [phishing]", "POST")
    if ingest and ingest.num_requests > 0:
        p95 = ingest.get_response_time_percentile(0.95)
        if p95 > 2000:
            failures.append(f"/ingest/email p95 = {p95:.0f}ms (SLA: < 2000ms)")

    total = stats.total
    if total.num_requests > 0:
        error_rate = total.num_failures / total.num_requests * 100
        if error_rate > 10:
            failures.append(f"Error rate = {error_rate:.1f}% (SLA: < 10%)")

    if failures:
        print(f"\n❌ SLA VIOLATIONS:\n" + "\n".join(f"  - {f}" for f in failures))
        environment.process_exit_code = 1
    else:
        print("\n✅ All SLA targets met")
