# PhishX — AI-Powered Phishing Detection Platform

PhishX is an enterprise-grade phishing detection platform for SOC analysts and security teams.
It analyses URLs and email content using trained ML models to classify threats in real time.
Analysts operate through **Guardstone Console** — a Next.js dashboard surfacing risk scores,
verdicts, and historical scan reports.

---

## Quick Start

**Prerequisites:** Node.js 18+, Python 3.11+, Docker + Docker Compose

```bash
git clone https://github.com/sunilblinkoninfra-cyber/PhishX.git
cd PhishX
cp .env.example .env                         # fill in required secrets
cd frontend/guardstone-console && npm ci && cd ../..
pip install -r backend/requirements.txt
docker-compose up --build
```

| Service    | URL                      |
|------------|--------------------------|
| Console    | http://localhost:3000    |
| API        | http://localhost:8000    |
| Grafana    | http://localhost:3001    |
| Prometheus | http://localhost:9090    |

---

## Architecture

**Layer 1 — Guardstone Console** (Next.js 14 + TypeScript)
SOC analyst UI: JWT auth, URL/email scan submission, real-time risk visualisation, report history. Deployed to Vercel.

**Layer 2 — FastAPI Backend** (Python 3.11)
REST API with Pydantic validation, async Celery task workers, ML phishing inference pipeline, rate limiting, circuit breaker, anomaly detection. Exposes `/metrics` for Prometheus.

**Layer 3 — Shared Services + Observability**
Python service modules in `services/`. Helm + Kubernetes manifests in `services/deployment/`.
Prometheus scrapes metrics. Grafana dashboards pre-configured via `grafana_dashboards.json`.

---

## API Reference

| Method | Endpoint         | Description                                      |
|--------|------------------|--------------------------------------------------|
| POST   | `/ingest`        | Submit email/URL for phishing analysis           |
| POST   | `/scan/batch`    | Submit up to 1000 URLs for async batch scan      |
| GET    | `/reports/{id}`  | Retrieve completed scan report by task ID        |
| GET    | `/health`        | Service status, model version, component health  |
| GET    | `/metrics`       | Prometheus metrics scrape endpoint               |

---

## Testing

```bash
# Backend (pytest)
cd backend
pytest tests/ --cov=. --cov-report=term-missing

# Frontend (Jest + RTL)
cd frontend/guardstone-console
npm run test:coverage

# E2E (Playwright)
npm run test:e2e
```

Coverage targets: Backend ≥ 60% · Frontend ≥ 50%

---

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and PR to `main`:

1. **Lint** — flake8 (backend) + ESLint + TypeScript check (frontend)
2. **Test** — pytest with coverage + Jest with coverage
3. **Build** — Docker image build
4. **Security** — pip-audit + npm audit

---

## Deployment

**Docker Compose (local/staging):**
```bash
./deploy.sh          # Linux/macOS
./deploy.ps1         # Windows
```

**Kubernetes (production):**
```bash
helm install phishx services/deployment/helm/
kubectl apply -f services/deployment/k8s/
```

---

## Contributing

Branch naming: `feature/description` · `fix/issue` · `chore/task`

PR checklist:
- [ ] Tests written and passing
- [ ] Coverage targets met
- [ ] No lint errors
- [ ] `.env.example` updated if new env vars added

PRs without tests for new functionality will not be merged.

---

## Versioning

Current version: **v0.1.0** — see [CHANGELOG.md](./CHANGELOG.md)

```bash
git tag -a v0.1.0 -m "PhishX v0.1.0 — initial release"
git push origin v0.1.0
```
