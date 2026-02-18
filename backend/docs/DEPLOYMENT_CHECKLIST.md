# PhishX Deployment Checklist

## Pre-Deployment Verification (Critical)

### ✅ System Requirements

- [ ] **Docker**: Version 24.0+ installed
  ```bash
  docker --version  # Should be Docker 24.x.x or higher
  ```

- [ ] **Docker Compose**: Version 2.20+ installed
  ```bash
  docker compose version  # Should be Docker Compose 2.20.x or higher
  ```

- [ ] **Disk Space**: Minimum 10GB free
  ```bash
  df -h  # Check available space
  ```

- [ ] **Memory**: Minimum 4GB RAM available
  ```bash
  free -h  # Linux/Mac
  Get-ComputerInfo | Select-Object CSTotalPhysicalMemory  # Windows (PowerShell)
  ```

- [ ] **Ports Available**: 8000, 5432, 6379, 9090, 3000
  ```bash
  # Linux/Mac
  lsof -i :8000 :5432 :6379 :9090 :3000
  
  # Windows (PowerShell)
  Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort
  ```

### 🔐 Security Configuration (CRITICAL)

- [ ] **JWT Secret Key**: Generated and stored securely
  ```bash
  # Generate a strong secret key
  openssl rand -hex 32
  
  # Store in .env as JWT_SECRET_KEY=<generated-key>
  ```

- [ ] **.env File Exists**: In project root directory
  ```bash
  ls -la .env  # Linux/Mac
  dir .env     # Windows
  ```

- [ ] **Encryption Master Key**: Generated if encryption enabled
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  
  # Store in .env as ENCRYPTION_MASTER_KEY=<generated-key>
  ```

- [ ] **Database Password**: Changed from default
  ```bash
  # In .env, ensure:
  # POSTGRES_PASSWORD != "postgres"
  # POSTGRES_PASSWORD != "changeme"
  ```

- [ ] **No Secrets in Git**: Verify .gitignore contains .env
  ```bash
  grep "^\.env" .gitignore
  ```

- [ ] **API Key Security**: Enable JWT authentication in production
  ```bash
  # In .env set:
  # ENABLE_JWT_AUTH=true
  ```

### 📋 Configuration Validation

- [ ] **Environment File Complete**:
  ```bash
  # Check all required variables present
  grep -E "^[A-Z_]+" .env | wc -l  # Should have 40+ variables
  ```

- [ ] **Database Configuration**:
  ```bash
  # Verify in .env:
  POSTGRES_DB=phishx_db
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=<strong-password>
  DATABASE_URL=postgresql://user:password@postgres:5432/phishx_db
  ```

- [ ] **Redis Configuration**:
  ```bash
  # Verify in .env:
  REDIS_URL=redis://redis:6379
  REDIS_TASK_QUEUE=phishx:tasks
  ```

- [ ] **Phase 3 Features Configured**:
  - [ ] JWT Authentication (ENABLE_JWT_AUTH=true/false)
  - [ ] Database Encryption (ENCRYPTION_ENABLED=true/false)
  - [ ] Anomaly Detection (ANOMALY_DETECTION_ENABLED=true/false)
  - [ ] Shadow Models (SHADOW_MODELS_ENABLED=true/false)
  - [ ] Multi-Region HA (MULTI_REGION_ENABLED=true/false)

### 📦 Code Quality Verification

- [ ] **All Phase 3 Files Present**:
  ```bash
  # Core modules
  [ -f app_new.py ] && echo "✅ app_new.py"
  [ -f jwt_auth.py ] && echo "✅ jwt_auth.py"
  [ -f db_encryption.py ] && echo "✅ db_encryption.py"
  [ -f anomaly_detection.py ] && echo "✅ anomaly_detection.py"
  [ -f shadow_models.py ] && echo "✅ shadow_models.py"
  [ -f multi_region.py ] && echo "✅ multi_region.py"
  
  # Integration bridges
  [ -f auth_integration.py ] && echo "✅ auth_integration.py"
  [ -f encryption_integration.py ] && echo "✅ encryption_integration.py"
  [ -f anomaly_integration.py ] && echo "✅ anomaly_integration.py"
  [ -f shadow_integration.py ] && echo "✅ shadow_integration.py"
  ```

- [ ] **Run Syntax Validation**:
  ```bash
  python -m py_compile app_new.py jwt_auth.py db_encryption.py \
    anomaly_detection.py shadow_models.py multi_region.py \
    auth_integration.py encryption_integration.py \
    anomaly_integration.py shadow_integration.py
  ```

- [ ] **Validate Phase 3 Integration** (if validate_phase3.py exists):
  ```bash
  python validate_phase3.py
  ```

- [ ] **Check Dependencies**:
  ```bash
  pip install -r requirements.txt --dry-run
  ```

---

## Deployment Execution

### Step 1: Initialize Docker Environment

```bash
# Linux/Mac
./deploy.sh

# Windows (PowerShell)
.\deploy.ps1
```

### Step 2: Verify Docker Services

```bash
# Check all services running
docker compose ps

# Should show all services as "running":
# - phishx-api (1/1)
# - postgres (running)
# - redis (running)
# - clamav (running)
# - prometheus (running)
# - grafana (running)
# - celery-worker-1-4 services (running)
# - beat-scheduler (running)
```

### Step 3: Database Initialization

```bash
# Apply migrations
docker compose exec api python -c "from db import init_db; init_db()"

# Verify schema
docker compose exec postgres psql -U postgres -d phishx_db -c "\dt"
```

### Step 4: Service Health Checks

```bash
# API Health
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-XX-XX...",
#   "version": "1.0.0",
#   "services": {...}
# }

# PostgreSQL Health
curl http://localhost:8000/health | jq '.services.database'

# Redis Health
curl http://localhost:8000/health | jq '.services.cache'

# Task Queue Health
curl http://localhost:8000/health | jq '.services.task_queue'
```

### Step 5: Authentication Test (if JWT enabled)

```bash
# Create test user
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Expected response contains: access_token, refresh_token, token_type
```

### Step 6: Monitor Dashboard Access

```bash
# API Documentation
http://localhost:8000/docs

# Prometheus Metrics (40+ metrics)
http://localhost:9090

# Grafana Dashboards (6 dashboards)
http://localhost:3000
# Default credentials: admin / admin

# Task Queue Monitor
http://localhost:5555  # Flower (if enabled)
```

---

## Post-Deployment Validation

### ✅ Functional Testing

- [ ] **API Endpoint Tests**:
  ```bash
  # Verify 35+ endpoints responding
  curl http://localhost:8000/api/v1/ping
  curl http://localhost:8000/health
  curl http://localhost:8000/metrics
  ```

- [ ] **Task Processing**:
  ```bash
  # Submit test email
  curl -X POST http://localhost:8000/api/v1/analyze \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com"}'
  
  # Verify Celery worker processes it
  docker compose logs celery-worker-1
  ```

- [ ] **Database Operations**:
  ```bash
  # Check if data is being stored
  docker compose exec postgres psql -U postgres -d phishx_db \
    -c "SELECT COUNT(*) FROM emails;"
  ```

### 📊 Monitoring & Metrics

- [ ] **Prometheus Scraping**: Verify metrics are collected
  ```bash
  curl http://localhost:9090/api/v1/query?query=up
  ```

- [ ] **Grafana Dashboard**: Access and verify data displays
  ```bash
  # Navigate to http://localhost:3000
  # Default login: admin / admin
  # Verify 6 dashboards have data
  ```

- [ ] **Anomaly Detection Active** (if enabled):
  ```bash
  curl http://localhost:8000/anomalies/stats
  
  # Should return statistics about detected anomalies
  ```

### 🔍 Log Verification

- [ ] **API Logs**: No errors on startup
  ```bash
  docker compose logs api | grep -i error
  ```

- [ ] **Worker Logs**: All 4 Celery workers running
  ```bash
  docker compose logs | grep "celery" | grep -i "ready"
  ```

- [ ] **Database Logs**: No connection errors
  ```bash
  docker compose logs postgres | grep -i "error"
  ```

### 🔐 Security Verification (Critical)

- [ ] **HTTPS Ready** (for production):
  ```bash
  # Ensure SSL certificates present for:
  # - API endpoint
  # - Grafana interface
  # - Database connection
  ```

- [ ] **Encryption Status** (if enabled):
  ```bash
  curl http://localhost:8000/security/encryption-status
  ```

- [ ] **JWT Token Validation** (if enabled):
  ```bash
  # Obtain token
  TOKEN=$(curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin"}' \
    | jq -r '.access_token')
  
  # Use token to access protected endpoint
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/protected-endpoint
  ```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Identify process using port
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Stop the process or use different port in .env
EXTERNAL_API_PORT=8001
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Verify credentials in .env
echo $DATABASE_URL

# Test connection
docker compose exec postgres psql -U postgres -c "\l"
```

### Issue: Redis Connection Failed

```bash
# Check Redis logs
docker compose logs redis

# Test connection
docker compose exec redis redis-cli ping
```

### Issue: Celery Workers Not Processing

```bash
# Check worker logs
docker compose logs celery-worker-1

# Restart workers
docker compose restart celery-worker-1 celery-worker-2 celery-worker-3 celery-worker-4

# Verify Redis connectivity
docker compose exec redis redis-cli PING
```

### Issue: JWT Authentication Not Working

```bash
# Verify JWT_SECRET_KEY is set
echo $JWT_SECRET_KEY

# Check authentication logs
docker compose logs api | grep -i "auth\|jwt"

# Test token generation
docker compose exec api python -c "from auth_integration import create_jwt_tokens; print(create_jwt_tokens('admin'))"
```

---

## Production Deployment Considerations

### For AWS EC2

```bash
# 1. Create security group allowing ports: 8000 (API), 5432 (DB), 9090 (Prometheus), 3000 (Grafana)
# 2. Use RDS for PostgreSQL (managed database)
# 3. Use ElastiCache for Redis (managed cache)
# 4. Use CloudWatch for monitoring instead of Prometheus/Grafana
# 5. Enable SSL/TLS on API with ACM certificate
# 6. Use Secrets Manager for JWT_SECRET_KEY and database passwords
```

### For Render

```bash
# 1. Deploy as Web Service with Docker
# 2. Attach PostgreSQL plugin
# 3. Attach Redis plugin
# 4. Set all .env variables in Environment tab
# 5. Enable auto-redeploy from GitHub
# 6. Set up health check: GET /health
```

### For Azure Container Instances

```bash
# 1. Push images to Azure Container Registry
# 2. Deploy as Container Group
# 3. Use Azure Database for PostgreSQL
# 4. Use Azure Cache for Redis
# 5. Configure Application Gateway for TLS
```

### For Google Cloud Run (Serverless)

```bash
# Note: This is app best suited for traditional container deployments
# If required:
# 1. Deploy to Cloud Run (limits: 60-min max request time, 4GB RAM max)
# 2. Use Cloud SQL PostgreSQL (but slower via proxy)
# 3. Use Memorystore for Redis
# 4. Consider splitting into separate services for better scaling
```

---

## Rollback Procedure

If deployment fails after services start:

```bash
# 1. Stop all services
docker compose down

# 2. Verify data persistence (volumes should be intact)
docker volume ls | grep phishx

# 3. Restore from backup (if database only affected)
docker compose exec postgres pg_restore -d phishx_db /backups/latest.sql

# 4. Restart with previous working image version
git revert <commit-hash>  # Revert to last working commit
./deploy.sh              # Redeploy

# 5. Verify services healthy
docker compose ps
curl http://localhost:8000/health
```

---

## Sign-Off Checklist

- [ ] All pre-deployment checks passed
- [ ] Security configuration validated
- [ ] Docker services running and healthy
- [ ] Database initialized and accessible
- [ ] All tests passing
- [ ] Monitoring dashboards showing data
- [ ] No error logs in any service
- [ ] Team notified of deployment
- [ ] Backup verified
- [ ] Rollback plan confirmed
- [ ] **Ready for Production** ✅

---

## Contact & Support

For deployment issues:
1. Check logs: `docker compose logs -f`
2. Review [PHASE3_GUIDE.md](PHASE3_GUIDE.md) for architecture details
3. Review [PHASE3_INTEGRATION.md](PHASE3_INTEGRATION.md) for integration steps
4. Check Docker health: `docker compose ps`
5. Validate Phase 3: `python validate_phase3.py`

**Last Updated**: 2024
**Version**: 1.0.0
**Deployment Status**: Ready for Production ✅
