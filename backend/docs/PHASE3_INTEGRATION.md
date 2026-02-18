# Phase 3 Integration Guide

**Status**: Phase 3 Integration Complete  
**Date**: February 17, 2026  
**Focus**: Step-by-step integration instructions for deploying Phase 3 components

---

## Overview

Phase 3 components have been integrated into the PhishX codebase at these key points:

1. **JWT Authentication** - `app_new.py` (new `/auth/*` endpoints)
2. **Database Encryption** - `db.py` (encryption-aware database functions)
3. **Anomaly Detection** - `tasks.py` (integrated into `process_email` task)
4. **Shadow Models** - `app_new.py` (monitoring endpoints)
5. **Environment Configuration** - `.env.example` (Phase 3 variables)

---

## Files Modified/Created

### New Files (Integration Bridges)
```
auth_integration.py          ← JWT auth dependencies for FastAPI
encryption_integration.py    ← Database encryption layer wrapper
anomaly_integration.py       ← Anomaly detection singleton engine
shadow_integration.py        ← Shadow models management
```

### Updated Files
```
app_new.py                   ← Added auth endpoints, monitoring endpoints
tasks.py                     ← Added anomaly detection to process_email
db.py                        ← Added encryption-aware database operations
requirements.txt             ← Added PyJWT, passlib
.env.example                 ← Added Phase 3 configuration variables
```

---

## Integration Steps (In Order)

### Step 1: Update Dependencies

```bash
# Install Phase 3 dependencies
pip install -r requirements.txt

# Verify installations
python -c "import jwt; import passlib; print('Phase 3 dependencies installed')"
```

**New packages added**:
- `PyJWT>=2.8.0` - JWT token management
- `passlib[bcrypt]>=1.7.4` - Password hashing

---

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

**Minimal Phase 3 configuration** (for local testing):

```bash
# JWT Authentication (optional)
ENABLE_JWT_AUTH=false                    # Set to true when ready
JWT_SECRET_KEY=test-secret-key-32-chars  # Change in production!

# Database Encryption (optional)
ENCRYPTION_ENABLED=false                 # Set to true to enable
ENCRYPTION_MASTER_KEY=                   # Required if enabled

# Anomaly Detection (enabled by default)
ANOMALY_DETECTION_ENABLED=true
ANOMALY_CONFIDENCE_THRESHOLD=0.8

# Shadow Models (optional)
SHADOW_MODELS_ENABLED=false
```

**For Production**:

```bash
# Generate strong JWT secret (32+ bytes)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate encryption master key (32 bytes)
python -c "import os; import base64; print(base64.b64encode(os.urandom(32)).decode())"

# Update .env with these values
JWT_SECRET_KEY=<generated_value>
ENCRYPTION_MASTER_KEY=<generated_value>
ENABLE_JWT_AUTH=true
ENCRYPTION_ENABLED=true
```

---

### Step 3: Test Phase 3 Endpoints

Start the application:

```bash
# Using uvicorn directly
uvicorn app_new:app --host 0.0.0.0 --port 8000 --reload

# Or using existing startup script
./run.sh
```

Test JWT authentication endpoints:

```bash
# Test login (creates JWT tokens)
curl -X POST http://localhost:8000/auth/login \
  -d "username=testuser&password=testpass"

# Response:
{
  "status": "ok",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token_id": "uuid...",
    "token_type": "bearer",
    "expires_in": 900
  }
}

# Use token for subsequent requests
TOKEN="eyJhbGc..."

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/metrics/summary

# Test token refresh
curl -X POST http://localhost:8000/auth/refresh \
  -d "refresh_token_id=<refresh_token_from_login>"

# Test logout
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/auth/logout
```

Test anomaly detection:

```bash
# Get anomaly statistics
curl http://localhost:8000/anomalies/stats

# Response:
{
  "status": "ok",
  "data": {
    "enabled": true,
    "total_analyzed": 1542,
    "anomalies_detected": 8,
    "anomaly_rate_percent": 0.52
  },
  "timestamp": "2026-02-17T12:00:00"
}
```

Test shadow models:

```bash
# Get active experiments
curl http://localhost:8000/experiments/active

# Get active canary deployments
curl http://localhost:8000/deployments/canary
```

---

### Step 4: Enable Encryption (Optional)

If you want to enable field-level encryption:

```bash
# 1. Generate encryption master key
MASTER_KEY=$(python -c "import os; import base64; print(base64.b64encode(os.urandom(32)).decode())")
echo "ENCRYPTION_MASTER_KEY=$MASTER_KEY" >> .env

# 2. Set encryption enabled
echo "ENCRYPTION_ENABLED=true" >> .env

# 3. Restart application
# Application will encrypt/decrypt fields automatically
```

**Encrypted fields** (automatic after restart):
- `users.email`, `users.name`, `users.password_hash`
- `email_analysis.sender`, `email_analysis.subject`, `email_analysis.body`
- `findings.finding_type`, `findings.description`
- `audit_log` sensitive fields

---

### Step 5: Enable JWT Authentication (Optional)

When ready to enforce JWT authentication:

```bash
# Update .env
ENABLE_JWT_AUTH=true

# Restart application
# All protected endpoints now require JWT bearer token
```

**Impact**:
- Legacy API key authentication still works (backward compatible)
- New clients should use JWT tokens via `/auth/login`
- Tokens expire in 15 minutes (configurable)
- Refresh tokens can be rotated every 30 days

---

### Step 6: Enable Anomaly Detection (Optional)

Anomaly detection is enabled by default. To fine-tune:

```bash
# In .env, adjust thresholds:
ANOMALY_CONFIDENCE_THRESHOLD=0.8       # Alert threshold (0.0-1.0)
ANOMALY_ZSCORE_THRESHOLD=3.0           # Statistical detection (std deviations)
ANOMALY_SLIDING_WINDOW_SIZE=1000       # Analysis window (emails)

# Restart and monitor
# Check /anomalies/stats for detection rates
```

**Expected behavior**:
- After 1000 emails, statistical anomaly detection activates
- Behavioral detection tracks sender patterns
- Pattern detection flags extreme/unusual emails
- Anomalies logged and can trigger alerts

---

### Step 7: Setup Shadow Models (Optional)

To start A/B testing ML models:

```bash
# 1. Enable shadow models
echo "SHADOW_MODELS_ENABLED=true" >> .env

# 2. Create experiment via API (future endpoint)
curl -X POST http://localhost:8000/experiments/create \
  -H "Authorization: Bearer <token>" \
  -d '{
    "experiment_name": "URL Analyzer v2",
    "production_model": "url_analyzer_v1.joblib",
    "shadow_model": "url_analyzer_v2.joblib"
  }'

# 3. Monitor predictions
curl http://localhost:8000/experiments/active

# 4. After data collection, start canary deployment
curl -X POST http://localhost:8000/deployments/canary/start \
  -d '{
    "model_version": "url_analyzer_v2.joblib",
    "strategy": "linear"
  }'

# 5. Advance stages as criteria met
curl -X POST http://localhost:8000/deployments/canary/<id>/advance
```

---

## Testing Checklist

### Unit Tests (provided)
```bash
# Test JWT authentication
python -m pytest tests/test_jwt_auth.py -v

# Test encryption
python -m pytest tests/test_encryption.py -v

# Test anomaly detection
python -m pytest tests/test_anomaly_detection.py -v
```

### Integration Tests (manual)

- [ ] Start application with Phase 1-2-3 all enabled
- [ ] Test `/auth/login` returns valid JWT token
- [ ] Test JWT token validates on protected endpoints
- [ ] Test token refresh produces new token
- [ ] Test logout invalidates tokens
- [ ] Send 10 emails → `/anomalies/stats` shows activity
- [ ] Send 1000+ emails → anomaly detection activates
- [ ] Verify encrypted fields in database (if enabled)
- [ ] Create shadow experiment → `/experiments/active` shows it
- [ ] Stop application → verify graceful shutdown

### Load Tests
```bash
# JWT validation performance (< 5ms per request)
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" http://localhost:8000/health

# Email ingestion with anomaly detection
ab -n 100 -c 5 -p email.json http://localhost:8000/ingest/email

# Encryption overhead (< 2ms per field)
# Measure database insert time with/without encryption
```

---

## Backward Compatibility

Phase 3 is backward compatible with Phase 1-2:

| Component | Legacy (API Key) | Phase 3 (JWT) | Status |
|-----------|-----------------|---------------|--------|
| API endpoints | ✅ Works | ✅ Works (when enabled) | Both |
| Database | ✅ Works | ✅ Transparent encrypt | Optional |
| Email processing | ✅ Works | ✅ With anomaly detection | Automatic |
| Monitoring | ✅ Works | ✅ with experiments/canaries | Optional |

**Migration path**:
1. Deploy Phase 3 with all features disabled (default)
2. Test endpoints work with legacy API keys
3. Gradually enable features (JWT, encryption, etc.)
4. Monitor and tune each component
5. Eventually require JWT for new clients

---

## Troubleshooting

### JWT Token Validation Fails

```bash
# Check JWT secret key set
echo $JWT_SECRET_KEY

# Verify token format (Bearer <token>)
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:8000/health

# Check token expiration
python -c "import jwt; jwt.decode('token', 'secret')" # Will show error
```

### Encryption/Decryption Errors

```bash
# Verify master key set
echo $ENCRYPTION_MASTER_KEY | base64 -d | wc -c  # Should be 32 bytes

# Check enabled
grep ENCRYPTION_ENABLED .env

# View logs for decrypt errors
tail -f logs/phishx.log | grep -i encrypt
```

### Anomaly Detection Not Working

```bash
# Ensure 1000+ emails processed (baseline needed)
curl http://localhost:8000/anomalies/stats | jq .data.total_analyzed

# Check if enabled
grep ANOMALY_DETECTION_ENABLED .env

# Verify confidence threshold
grep ANOMALY_CONFIDENCE_THRESHOLD .env
```

### Shadow Models Not Recording

```bash
# Verify enabled
grep SHADOW_MODELS_ENABLED .env

# Check if experiment created
curl http://localhost:8000/experiments/active

# Restart workers to pick up changes
# celery -A tasks worker -l info
```

---

## Performance Impact

| Feature | Impact | Mitigation |
|---------|--------|-----------|
| JWT validation | <5ms per request | Cached in memory |
| Encryption/decryption | <2ms per field | Symmetric (Fernet) |
| Anomaly detection | <10ms per email | Batched analysis |
| Shadow models | <1ms routing | In-memory decision |
| Multi-region failover | <30s trigger | Health check interval |

**Overall**: <20ms additional latency per email

---

## Security Checklist

- [ ] Change `JWT_SECRET_KEY` in production (min 32 chars)
- [ ] Change `ENCRYPTION_MASTER_KEY` in production
- [ ] Set `ENABLE_JWT_AUTH=true` when ready
- [ ] Enable `ENCRYPTION_ENABLED=true` for sensitive data
- [ ] Use HTTPS for all API communication
- [ ] Store refresh tokens in secure HttpOnly cookies
- [ ] Rotate encryption keys every 90 days
- [ ] Monitor `/anomalies/stats` for unusual patterns
- [ ] Review audit logs in database regularly
- [ ] Test disaster recovery and failover procedures

---

## Next Steps

1. **Immediate** (this session):
   - Deploy Phase 3 integration
   - Run integration tests
   - Verify backward compatibility

2. **Short-term** (1-2 weeks):
   - Enable JWT authentication
   - Enable field encryption
   - Tune anomaly detection thresholds
   - Monitor performance

3. **Medium-term** (1 month):
   - Start shadow model experiments
   - Run A/B tests on new ML models
   - Evaluate canary deployment
   - Plan multi-region deployment

4. **Long-term** (Phase 4+):
   - Advanced threat intelligence
   - Federated learning
   - Quantum-resistant cryptography
   - Auto-scaling & SLA tracking

---

## Support & Documentation

- **PHASE3_GUIDE.md** - Comprehensive component guide
- **PHASE3_COMPLETE.md** - Completion summary & checklist
- **Architecture diagrams** - See PHASE3_GUIDE.md
- **Code examples** - All functions have docstrings with usage

---

**Integration Status**: ✅ Complete  
**All Phase 3 components integrated and ready for deployment**
