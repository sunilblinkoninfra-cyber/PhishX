# PhishX Quick Reference Card

## Project Renaming
```
OLD: Phishing Detection Tool / PhishGuardAI
NEW: PhishX - Enterprise Phishing Detection Platform
```

## Directory Structure (Phase 1)

```
phishing-detection-tool/
├── 📄 app_new.py                    ← NEW: Main async FastAPI app
├── 📄 queue.py                      ← NEW: Redis/Celery config
├── 📄 tasks.py                      ← NEW: Async task definitions
├── 📄 validators.py                 ← NEW: Pydantic models
├── 📄 rate_limiter.py              ← NEW: Rate limiting logic
├── 📄 log_config.py                ← NEW: Structured logging
├── 📄 migration.py                 ← NEW: Database migrations
├── 📄 .env.example                 ← NEW: Config template
│
├── 📁 scanner/                      [existing - used by async tasks]
├── 📁 models/                       [existing - ML models loaded by tasks]
├── 📁 services/                     [existing - utility functions]
├── 📁 adapters/                     [existing - SMTP/Graph integration]
├── 📁 logs/                         [existing - will be created]
│
├── 📦 docker-compose.yml            ← UPDATED: Full orchestration
├── 📦 requirements.txt              ← UPDATED: New dependencies
├── 📦 schema.sql                    [existing - used by migration.py]
│
├── 📚 PHASE1_GUIDE.md              ← NEW: Setup & operations
├── 📚 ARCHITECTURE_PHASE1.md        ← NEW: Technical design
├── 📚 PHASE1_COMPLETE.md           ← NEW: Implementation summary
│
└── 🔧 setup_phase1.sh              ← NEW: Linux/Mac setup
   setup_phase1.bat              ← NEW: Windows setup
```

## Key Concepts

### 1. API Request → Queue → Worker Processing

```python
# Client sends email
curl -X POST /ingest/email \
  -H "Authorization: Bearer API_KEY" \
  -H "X-Tenant-ID: 550e8400..."

# FastAPI (app_new.py)
@app.post("/ingest/email")
async def ingest_email(payload: EmailIngestRequest):
    task = process_email.apply_async(  # Queue it!
        args=(email_id, subject, sender, urls, tenant_id, priority)
    )
    return {"email_id": email_id, "task_id": task.id}  # Return immediately!

# Celery Worker (tasks.py) - runs async
@celery_app.task
def process_email(email_id, subject, sender, urls, tenant_id, priority):
    nlp_result = enrich_nlp(subject, body)  # Call NLP
    url_result = enrich_urls(urls)          # Call URL analyzer
    risk_score = calculate_risk(nlp_result, url_result)
    persist_decision(email_id, risk_score)
```

### 2. Rate Limiting (3 Levels)

```python
# Level 1: Per IP
100 requests/minute per IP (e.g., 192.168.1.1)

# Level 2: Per API Key
10,000 requests/hour per API key (abc123...)

# Level 3: Per Tenant
1,000,000 emails/day per tenant (550e8400...)

# If ANY limit exceeded → 429 Too Many Requests
```

### 3. Validation Pipeline

```
Request → 
  Email format check → 
  URL SSRF check → 
  Attachment size check → 
  DDoS pattern check → 
  Tenant UUID check → 
  Accept or Reject (422)
```

### 4. Structured Logging

```json
{
  "timestamp": "2026-02-17T12:00:00Z",
  "service": "PhishX",
  "event": "email_decision",
  "email_id": "550e8400-...",
  "risk_score": 78,
  "category": "WARM"
}
```

---

## Common Commands

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Run migrations
docker-compose exec phishx-api python migration.py up

# Access database
docker-compose exec phishx-postgres psql -U phishx -d phishx_db

# Access Redis
docker-compose exec phishx-redis redis-cli -a redis_secure_password
```

### Development (No Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Start API
python -m uvicorn app_new:app --reload

# Start workers (separate terminal)
celery -A tasks worker -l info

# Start scheduler (separate terminal)
celery -A tasks beat -l info
```

---

## API Endpoints (Phase 1)

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---|
| `/health` | GET | Service health check | ❌ No |
| `/queue/status` | GET | Queue statistics | ✅ Yes |
| `/ingest/email` | POST | Queue email for analysis | ✅ Yes |
| `/enforce/smtp` | POST | SMTP enforcement | ✅ Yes |
| `/enforce/graph` | POST | Graph API enforcement | ✅ Yes |
| `/soc/alerts` | GET | Get SOC alerts | ✅ Yes |
| `/soc/alert/{id}/action` | POST | Record SOC action | ✅ Yes |

---

## Configuration (.env)

```bash
# Critical (change these!)
API_KEY=your-secret-key-here
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql://phishx:password@postgres:5432/phishx_db

# Message Queue
REDIS_URL=redis://:password@redis:6379/0
CELERY_BROKER_URL=redis://:password@redis:6379/1
CELERY_RESULT_BACKEND=redis://:password@redis:6379/2

# Services
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
NLP_SERVICE_URL=http://nlp:8001/predict

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_OUTPUT=both
```

---

## Database Tables (Key)

| Table | Purpose | Key Columns |
|-------|---------|---|
| `email_decisions` | Risk assessments | id, tenant_id, risk_score, category, created_at |
| `soc_alerts` | Action items | id, tenant_id, status, created_at |
| `audit_log` | Compliance | id, entity_type, action, created_at |
| `tenant_policies` | Risk rules | tenant_id, cold_threshold, warm_threshold |
| `blocklists` | Blocked items | tenant_id, block_type, value |

---

## Performance Targets (Phase 1)

| Metric | Target |
|--------|--------|
| API response time | < 100ms |
| Email processing latency | 300-2000ms (async) |
| Queue processing lag | < 1 minute |
| Throughput (single instance) | 400+ emails/sec |
| Throughput (full cluster) | 10,000+ emails/sec |

---

## Scaling Checklist for Production

- [ ] Change API_KEY and SECRET_KEY to strong values
- [ ] Change PostgreSQL password
- [ ] Change Redis password
- [ ] Set ENVIRONMENT=production
- [ ] Configure CORS_ORIGINS for your domains
- [ ] Setup log aggregation (ELK/Loki)
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Setup database backups
- [ ] Configure TLS/HTTPS (nginx reverse proxy)
- [ ] Test load with `ab` or `k6`
- [ ] Document runbooks for on-call
- [ ] Setup alerting for service failures

---

## Troubleshooting Quick Links

| Issue | Check |
|-------|-------|
| API not responding | `curl http://localhost:8000/health` |
| Database issues | `docker-compose logs phishx-postgres` |
| Queue growing | `docker-compose exec phishx-redis redis-cli LLEN celery:emails` |
| Workers crashed | `docker-compose restart phishx-celery-priority` |
| Memory leak | Check worker logs for leaks, restart workers |

---

## Important Files to Know

| File | What It Does |
|------|---|
| `app_new.py` | FastAPI routes & orchestration |
| `tasks.py` | Background job definitions |
| `queue.py` | Celery & Redis configuration |
| `validators.py` | Input validation rules |
| `migration.py` | Database schema setup |
| `log_config.py` | Logging configuration |
| `rate_limiter.py` | Rate limiting logic |
| `PHASE1_GUIDE.md` | How to run it |
| `ARCHITECTURE_PHASE1.md` | How it works |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Celery** | Python task queue (runs jobs in background) |
| **Redis** | In-memory data store (cache + message broker) |
| **Pydantic** | Data validation library (checks inputs) |
| **FastAPI** | Web framework (HTTP API) |
| **Structured Logging** | Logs as JSON (easier to parse) |
| **Rate Limiting** | Limiting requests from users/IPs |
| **SSRF** | Server-Side Request Forgery (security attack) |
| **Tenant** | Customer organization (data isolation) |
| **Async** | Non-blocking tasks (scalable) |
| **Queue** | Message buffer (reliable delivery) |
| **Worker** | Process that handles queued tasks |
| **Celery Beat** | Task scheduler (cron-like) |

---

## Next Phase (Phase 2)

What's coming:
- [ ] Circuit breakers (handle service failures gracefully)
- [ ] Prometheus metrics (track performance)
- [ ] Grafana dashboards (visualize metrics)
- [ ] JWT tokens (time-limited auth)
- [ ] Request signing (HMAC)

---

## Quick Links

- **Setup Guide**: `PHASE1_GUIDE.md`
- **Architecture**: `ARCHITECTURE_PHASE1.md`
- **Completion Summary**: `PHASE1_COMPLETE.md`
- **Config Template**: `.env.example`
- **Source Code**: `app_new.py`, `tasks.py`, `validators.py`

---

**Last Updated**: February 17, 2026  
**Phase Status**: ✅ Phase 1 Complete  
**Next**: Phase 2 - Resilience & Monitoring
