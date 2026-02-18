# Phishing Detection Tool Monorepo

Repository is organized into three primary areas:

## 1. `frontend/`
- `frontend/guardstone-console/`: Next.js SOC/analyst frontend

## 2. `backend/`
- Python API, async workers, ML scanners, models, templates, runtime artifacts
- Key files:
  - `backend/app_new.py`
  - `backend/tasks.py`
  - `backend/requirements.txt`
  - `backend/schema.sql`
  - `backend/docs/` (project documentation and phase guides)

## 3. `services/`
- Shared service-layer modules (`services/*.py`)
- Deployment manifests grouped under:
  - `services/deployment/helm/`
  - `services/deployment/k8s/`

## Root-level operational files
- `docker-compose.yml` (orchestration)
- `Dockerfile` (backend image)
- `Procfile.txt` (PaaS web command)
- `deploy.sh`, `deploy.ps1`, `setup_phase1.sh`, `setup_phase1.bat`

## Notes
- Environment files remain at root (`.env`, `.env.example`, `.env.production`).
- Legacy empty folder `guardstone-console/` may still appear at root if Windows has an open directory lock.
