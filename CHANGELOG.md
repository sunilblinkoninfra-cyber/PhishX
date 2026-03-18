# Changelog

All notable changes to PhishX are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added — AI Co-worker Implementation (2026-03-18)
- `backend/tests/` — full pytest test suite (conftest, scan API tests, ML scanner tests)
- `frontend/guardstone-console/__tests__/` — RTL component tests for PhishingResultCard and ScanInput
- `frontend/guardstone-console/e2e/scan-flow.spec.ts` — Playwright E2E scan workflow test
- `.github/workflows/ci.yml` — full CI/CD pipeline (lint, test, build, security audit)
- `CHANGELOG.md` — this file

---

## [0.1.0] — 2026-03-18

### Added
- **Guardstone Console** — Next.js 14 + TypeScript SOC analyst dashboard
  - Real-time phishing scan submission and result visualisation
  - JWT-authenticated analyst sessions
  - Prometheus metrics display via Recharts
- **FastAPI Backend** — Python async API with Celery task workers
  - Email/URL ingestion endpoint with Pydantic validation
  - ML-based phishing classification pipeline (app_new.py + tasks.py)
  - Rate limiting (SlowAPI), JWT auth, circuit breaker, anomaly detection
  - Structured JSON logging (structlog)
- **ML Phishing Scanner** — trained classifier integrated into backend inference
- **Shared Services Layer** — Python service modules in `services/`
- **Observability Stack** — Prometheus metrics + pre-built Grafana dashboards

### Infrastructure
- `docker-compose.yml` — orchestrates backend, frontend, Redis, Prometheus, Grafana
- `Dockerfile` + `.dockerignore` — containerised backend build
- Helm charts + Kubernetes manifests under `services/deployment/`
- `deploy.sh` / `deploy.ps1` — cross-platform deployment scripts
- `setup_phase1.sh` / `setup_phase1.bat` — environment bootstrap
- `.env.example` — all required environment variables documented

### Security
- JWT token auth with refresh flow
- IP-based and API-key rate limiting
- Request signing verification
- DDoS protection middleware

---

[Unreleased]: https://github.com/sunilblinkoninfra-cyber/PhishX/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sunilblinkoninfra-cyber/PhishX/releases/tag/v0.1.0
