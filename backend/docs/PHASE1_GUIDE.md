# PhishX Phase 1 Implementation Guide

## Overview

This guide covers the Phase 1 implementation of PhishX, including:
- ✅ Redis message queue setup
- ✅ Comprehensive input validation
- ✅ Rate limiting (IP, API key, tenant)
- ✅ Structured logging
- ✅ Database performance indexes
- ✅ Docker Compose orchestration
- ✅ Async task processing

## Pre-requisites

- Docker & Docker Compose (v1.29+)
- Python 3.11+
- PostgreSQL 13+ (if running locally)
- Redis 6+ (if running locally)

## Quick Start (Docker Compose)

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env

# Key changes needed:
# - API_KEY: Set a strong API key
# - SECRET_KEY: Set a strong secret
# - DATABASE_URL: Verify database connection
# - REDIS_URL: Verify Redis connection
```

### 2. Build & Start Services

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Verify service status
docker-compose ps
```

Expected output:
```
NAME                      STATUS
phishx-postgres           healthy
phishx-redis              healthy
phishx-clamav             healthy
phishx-api                healthy
phishx-celery-priority    running
phishx-celery-enrichment  running
phishx-celery-enforcement running
phishx-celery-beat        running
```

### 3. Setup Database

```bash
# Run migrations
docker compose exec phishx-api python migration.py up

# Check database
docker compose exec phishx-postgres psql -U phishx -d phishx_db -c "\dt"
```

### 4. Verify Health

```bash
# Check API health
curl -X GET http://localhost:8000/health

# Expected response:
# {
#   "status": "ok",
#   "version": "1.0.0",
#   "components": {
#     "database": "healthy",
#     "redis": "healthy"
#   }
# }
```

### 5. Check Queue Status

```bash
# Get queue statistics (requires API key)
curl -X GET http://localhost:8000/queue/status \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## API Usage Examples

### Email Ingestion (Async)

```bash
curl -X POST http://localhost:8000/ingest/email \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Urgent Action Required",
    "sender": "user@example.com",
    "body": "Please verify your account immediately",
    "urls": ["https://example.com/verify"],
    "priority": "normal"
  }'

# Response (immediate):
# {
#   "email_id": "550e8400-e29b-41d4-a716-446655440001",
#   "risk_score": 0,
#   "category": "COLD",
#   "decision": "ALLOW",
#   "findings": {
#     "status": "processing",
#     "task_id": "celery-task-id"
#   },
#   "timestamp": "2026-02-17T12:00:00Z"
# }
```

### SMTP Enforcement

```bash
curl -X POST http://localhost:8000/enforce/smtp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "mail_from": "sender@example.com",
    "body": "Email content",
    "urls": [],
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Get SOC Alerts

```bash
curl -X GET 'http://localhost:8000/soc/alerts?status=OPEN&limit=50' \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000"
```

## Service Documentation

### API Gateway (`api` service)

**Port**: 8000
**Container**: phishx-api
**URL**: http://localhost:8000

Key endpoints:
- `GET /health` - Health check
- `GET /queue/status` - Queue statistics
- `POST /ingest/email` - Email ingestion (async)
- `POST /enforce/smtp` - SMTP enforcement
- `POST /enforce/graph` - Graph API enforcement
- `GET /soc/alerts` - SOC dashboard alerts
- `POST /soc/alert/{id}/action` - Record SOC action

### Message Queue (Redis)

**Container**: phishx-redis
**URL**: redis://:redis_secure_password@localhost:6379/0
**CLI**: `redis-cli -a redis_secure_password`

Databases:
- 0: Cache & main store
- 1: Celery broker
- 2: Task results

Key commands:
```bash
# Monitor queue
docker compose exec phishx-redis redis-cli -a redis_secure_password MONITOR

# Check queue depth
docker compose exec phishx-redis redis-cli -a redis_secure_password LLEN celery:emails

# Check task results
docker compose exec phishx-redis redis-cli -a redis_secure_password KEYS "celery-task-*"

# Clear all queues (careful!)
docker compose exec phishx-redis redis-cli -a redis_secure_password FLUSHDB
```

### Database (PostgreSQL)

**Container**: phishx-postgres
**Port**: 5432
**User**: phishx
**Password**: phishx_secure_password
**Database**: phishx_db

Key tables:
- `email_decisions` - Email risk assessments
- `soc_alerts` - Security alerts
- `audit_log` - Immutable audit trail
- `tenant_policies` - Risk policies per tenant
- `blocklists` - Blocked senders/domains/URLs

Connect:
```bash
# Via docker-compose
docker compose exec phishx-postgres psql -U phishx -d phishx_db

# Via psql on host
psql -h localhost -U phishx -d phishx_db
```

### Celery Workers

Three worker types handle different queues:

1. **Priority Worker** (`celery-worker-priority`)
   - Queues: `high_priority`, `emails`
   - Concurrency: 4 workers
   - Processes main email analysis pipeline
   
2. **Enrichment Worker** (`celery-worker-enrichment`)
   - Queue: `enrichment`
   - Concurrency: 2 workers
   - Runs NLP and URL analysis
   
3. **Enforcement Worker** (`celery-worker-enforcement`)
   - Queue: `enforcement`
   - Concurrency: 2 workers
   - Executes SMTP rejects and quarantines

### Celery Beat (Scheduler)

**Container**: phishx-celery-beat
**Schedule**: Cron-like format

Scheduled tasks:
- `cleanup_expired_alerts` - Daily at 1 AM (removes resolved alerts >90 days)
- `sync_threat_intelligence` - Every 6 hours (updates threat feeds)

View logs:
```bash
docker compose logs phishx-celery-beat -f
```

## Monitoring & Debugging

### View Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f phishx-api

# Celery workers
docker compose logs -f phishx-celery-priority

# Structured JSON logs
docker compose logs phishx-api | jq '.'
```

### Development Tools

Enable development containers:
```bash
# Start with debug profile
docker compose --profile debug up -d

# Redis Commander (http://localhost:8081)
# Shows all Redis keys and structures

# PgAdmin (http://localhost:5050)
# PostgreSQL web UI
```

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000" \
  http://localhost:8000/health

# Load test email ingest (k6)
k6 run tests/load_test.js
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker compose logs phishx-api

# Verify environment variables
docker compose config | grep REDIS_URL

# Verify port availability
lsof -i :8000
```

### Database Connection Issues

```bash
# Check PostgreSQL is healthy
docker compose exec phishx-postgres pg_isready -U phishx

# Check DATABASE_URL format
# Should be: postgresql://user:password@host:port/dbname

# Run migrations manually
docker compose exec phishx-api python -c "from db import get_db; get_db()"
```

### Redis Connection Issues

```bash
# Check Redis is healthy
docker compose exec phishx-redis redis-cli ping

# Check authentication
docker compose exec phishx-redis redis-cli -a redis_secure_password ping

# Monitor connections
docker compose exec phishx-redis redis-cli -a redis_secure_password CLIENT LIST
```

### Celery Tasks Not Processing

```bash
# Check worker status
docker compose logs phishx-celery-priority

# Monitor task queue
docker compose exec phishx-redis redis-cli -a redis_secure_password LLEN celery:emails

# Inspect active tasks
docker compose exec phishx-api celery -A tasks inspect active

# Check for dead letter queue
docker compose exec phishx-redis redis-cli -a redis_secure_password KEYS "*dead*"
```

## Local Development (No Docker)

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Setup PostgreSQL locally
createdb phishx_db -U postgres
psql -U postgres -d phishx_db < schema.sql

# Start Redis (separate terminal)
redis-server
```

### Run Services

```bash
# Terminal 1: API
python -m uvicorn app_new:app --reload

# Terminal 2: Priority Worker
celery -A tasks worker -Q high_priority,emails -l info

# Terminal 3: Enrichment Worker
celery -A tasks worker -Q enrichment -l info

# Terminal 4: Enforcement Worker
celery -A tasks worker -Q enforcement -l info

# Terminal 5: Beat Scheduler
celery -A tasks beat -l info
```

## Deployment Checklist

- [ ] Update `.env` with production secrets
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Change default PostgreSQL password
- [ ] Change default Redis password
- [ ] Update `API_KEY` to secure value
- [ ] Update `SECRET_KEY` to secure value
- [ ] Enable HTTPS (setup reverse proxy with nginx)
- [ ] Configure proper CORS_ORIGINS
- [ ] Setup log aggregation (ELK/Loki)
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure database backups
- [ ] Implement secrets management (Vault)
- [ ] Setup rate limiting per tenant
- [ ] Configure threat intelligence feeds
- [ ] Document runbooks for on-call

## Next Steps (Phase 2)

After Phase 1 stabilizes:
- [ ] Circuit breakers for external services
- [ ] Async call timeouts & retries
- [ ] Prometheus metrics & Grafana dashboards
- [ ] Health check improvements
- [ ] Graceful degradation patterns
- [ ] Enhanced error recovery

## Support

For issues or questions:
1. Check logs: `docker compose logs SERVICE_NAME`
2. Review this guide's troubleshooting section
3. Check database state in psql
4. Monitor Redis with redis-cli
5. Inspect Celery tasks

---

**Phase 1 Status**: ✅ Complete
**Last Updated**: 2026-02-17
**Next Phase**: Phase 2 - Resilience & Circuit Breakers
