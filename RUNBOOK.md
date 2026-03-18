# PhishX Runbook — Operations & Incident Response

> **Version:** v0.1.0  
> **Last updated:** 2026-03-18  
> **On-call:** Add your contact details here

---

## 1. Service Overview

| Service | URL | Purpose |
|---------|-----|---------|
| Guardstone Console | https://staging.phishx.io | SOC analyst frontend |
| FastAPI Backend | https://staging.phishx.io/api/ | Phishing detection API |
| Grafana | http://localhost:3001 | Metrics dashboards |
| Prometheus | http://localhost:9090 | Metrics scraping |

**Health check endpoint:** `GET /health` — must return `{"status": "ok"}`

---

## 2. Deployment

### Standard deploy (Docker Compose)
```bash
git pull origin main
docker-compose -f docker-compose.yml -f docker-compose.staging.yml pull
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --remove-orphans
docker-compose ps          # verify all services are Up
curl -f https://staging.phishx.io/health
```

### Check service health after deploy
```bash
# All containers running?
docker-compose ps

# Any containers restarting?
docker ps --filter "status=restarting"

# Recent logs from API
docker-compose logs --tail=50 api

# Recent logs from frontend
docker-compose logs --tail=50 frontend
```

---

## 3. Rollback Procedure

### Step 1 — Identify the last stable commit
```bash
git log --oneline -10
# Find the last known-good commit hash (e.g. abc1234)
```

### Step 2 — Revert the deploy
```bash
# Option A: revert to a specific commit
git revert HEAD --no-edit
git push origin main

# Option B: hard reset to last known good (use with caution)
git reset --hard <last-good-commit-hash>
git push --force-with-lease origin main
```

### Step 3 — Redeploy the previous version
```bash
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --remove-orphans
sleep 10
curl -f https://staging.phishx.io/health || echo "HEALTH CHECK FAILED"
```

### Step 4 — Verify rollback
```bash
# Check API is responding
curl -s https://staging.phishx.io/health | python3 -m json.tool

# Check no containers are restarting
docker ps --filter "status=restarting"

# Tail logs for 60 seconds
docker-compose logs -f --tail=20 api
```

---

## 4. Database Rollback

### Check current migration state
```bash
docker-compose exec api python -c "from db import get_db; print('DB connected')"
```

### Rollback last migration (Alembic)
```bash
docker-compose exec api alembic downgrade -1
# Or to a specific revision:
docker-compose exec api alembic downgrade <revision_id>
```

### Emergency: restore from backup
```bash
# List available backups
ls -la /opt/phishx/backups/

# Restore latest backup
docker-compose stop api celery-worker-staging
docker-compose exec postgres pg_restore \
  -U phishx \
  -d phishx_staging \
  /backups/latest.dump
docker-compose start api celery-worker-staging
```

---

## 5. Common Incidents & Fixes

### API returning 500 errors
```bash
# Check logs
docker-compose logs --tail=100 api | grep ERROR

# Restart API only (no downtime to other services)
docker-compose restart api
sleep 5
curl -f https://staging.phishx.io/health
```

### Redis connection failure
```bash
docker-compose logs redis | tail -20
docker-compose restart redis
# Wait for redis to be ready
docker-compose exec redis redis-cli ping
# Then restart workers
docker-compose restart celery-worker-staging
```

### PostgreSQL connection failure
```bash
docker-compose logs postgres | tail -20
docker-compose exec postgres pg_isready -U phishx
# If unhealthy:
docker-compose restart postgres
sleep 10
docker-compose restart api celery-worker-staging
```

### Frontend not loading (Next.js)
```bash
docker-compose logs frontend | tail -30
docker-compose restart frontend
sleep 10
curl -f http://localhost:3000
```

### Nginx 502 Bad Gateway
```bash
# Check upstream services are healthy
curl -f http://localhost:8000/health   # API
curl -f http://localhost:3000          # Frontend
# Then reload Nginx config
docker-compose exec nginx nginx -t    # test config
docker-compose exec nginx nginx -s reload
```

### High memory/CPU
```bash
# Check resource usage
docker stats --no-stream

# Check which celery tasks are stuck
docker-compose exec api celery -A tasks inspect active

# Purge stuck tasks (use with caution)
docker-compose exec api celery -A tasks purge
```

---

## 6. Certificate Renewal (Staging)

Self-signed certs expire after 365 days. To renew:
```bash
cd /opt/phishx
bash nginx/generate-certs.sh
docker-compose exec nginx nginx -s reload
```

For production — use Certbot:
```bash
certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
```

---

## 7. Useful Commands Reference

```bash
# View all running services
docker-compose ps

# Follow logs for all services
docker-compose logs -f

# Check disk usage
df -h && docker system df

# Clean up old images/containers
docker system prune -f

# Restart entire stack
docker-compose -f docker-compose.yml -f docker-compose.staging.yml restart

# Stop entire stack
docker-compose -f docker-compose.yml -f docker-compose.staging.yml down

# Full rebuild (use after major changes)
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

---

## 8. Escalation

| Severity | Description | Response Time | Action |
|----------|-------------|---------------|--------|
| P1 — Critical | API down, data loss | 15 min | Page on-call engineer |
| P2 — High | Degraded performance, scan failures | 1 hour | Notify team channel |
| P3 — Medium | Non-critical feature broken | 4 hours | Create GitHub issue |
| P4 — Low | UI glitch, cosmetic bug | Next sprint | Backlog |

**On-call contacts:** _(add your team contacts here)_  
**Incident channel:** _(add your Slack/Teams channel here)_  
**Status page:** _(add your status page URL here)_

---

## 9. Post-Incident

After every P1/P2 incident, document:
1. What happened (timeline)
2. Root cause
3. How it was fixed
4. Prevention measures

Add to `docs/incidents/YYYY-MM-DD-title.md`

