# PhishX Production Environment Setup - Quick Reference

## Files Created

✅ **Configuration Files**:
- `.env.production` - Production environment template with 115+ variables
- `ENV_SETUP_GUIDE.md` - Comprehensive guide for generating and configuring secrets
- `validate_env_production.py` - Automated validation tool

✅ **Documentation Files**:
- `DEPLOYMENT_CHECKLIST.md` - Pre/post deployment validation checklist
- `PRODUCTION_DEPLOYMENT.md` - Cloud platform deployment guides (AWS/Azure/GCP)

---

## Next Steps (In Order)

### Step 1: Generate Required Secrets

Run the secret generation commands from ENV_SETUP_GUIDE.md:

```bash
# Generate database password
openssl rand -base64 32

# Generate encryption key
openssl rand -hex 32

# Generate JWT key pair (if using RS256)
openssl genrsa -out jwt_private.key 2048
openssl rsa -in jwt_private.key -pubout -out jwt_public.key

# Generate Grafana password
openssl rand -base64 24
```

### Step 2: Fill in .env.production

Edit `.env.production` and replace all `[CHANGE_ME_*]` placeholders with actual values:

```bash
# 1. Database credentials
DATABASE_URL=postgresql://dbuser:PASSWORD@HOST:5432/phishx_db
POSTGRES_PASSWORD=GENERATED_STRONG_PASSWORD

# 2. Redis configuration
REDIS_URL=redis://REDIS_HOST:6379/0
REDIS_PASSWORD=GENERATED_PASSWORD

# 3. JWT keys (base64 encoded)
JWT_PRIVATE_KEY=BASE64_ENCODED_PRIVATE_KEY
JWT_PUBLIC_KEY=BASE64_ENCODED_PUBLIC_KEY

# 4. Encryption
ENCRYPTION_MASTER_KEY=HEX_ENCODED_32_BYTE_KEY

# 5. Email/Alerts
SMTP_PASSWORD=SENDGRID_OR_EMAIL_SERVICE_KEY
ANOMALY_ALERT_EMAIL=security-team@company.com

# 6. Security
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# 7. Monitoring
GRAFANA_ADMIN_PASSWORD=GENERATED_STRONG_PASSWORD
```

### Step 3: Validate Configuration

```bash
# Run validation script
python validate_env_production.py

# Expected output: "✅ VALIDATION PASSED - Ready for deployment"
```

### Step 4: Store Secrets Securely

Do **NOT** keep `.env.production` in version control. Store secrets in your cloud provider's secret manager:

**AWS:**
```bash
aws secretsmanager create-secret --name phishx/prod/db-password --secret-string "PASSWORD"
aws secretsmanager create-secret --name phishx/prod/encryption-key --secret-string "KEY"
aws secretsmanager create-secret --name phishx/prod/jwt-private-key --secret-string "KEY"
```

**Azure:**
```bash
az keyvault secret set --vault-name phishx-kv --name db-password --value "PASSWORD"
az keyvault secret set --vault-name phishx-kv --name encryption-key --value "KEY"
az keyvault secret set --vault-name phishx-kv --name jwt-private-key --value "KEY"
```

**GCP:**
```bash
echo -n "PASSWORD" | gcloud secrets create phishx-db-password --data-file=-
echo -n "KEY" | gcloud secrets create phishx-encryption-key --data-file=-
echo -n "KEY" | gcloud secrets create phishx-jwt-private-key --data-file=-
```

### Step 5: Run Pre-Deployment Checklist

From `DEPLOYMENT_CHECKLIST.md`:

```bash
# System requirements
docker --version      # Should be 24.0+
docker compose version # Should be 2.20+
df -h                 # Check 10GB+ free space

# Security validation
[ -f .env.production ] && echo "✅ .env.production exists"
grep -c "CHANGE_ME" .env.production  # Should return 0

# Database connectivity (if available)
psql -h HOST -U postgres -c "SELECT 1"

# Environment variable validation
export $(cat .env.production | xargs)
echo $JWT_PRIVATE_KEY   # Should show base64 key
```

### Step 6: Deploy

**Linux/Mac:**
```bash
./deploy.sh
```

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

### Step 7: Post-Deployment Verification

```bash
# Health check
curl http://localhost:8000/health

# JWT authentication test
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Metrics dashboard
open http://localhost:9090  # Prometheus

# Grafana dashboard
open http://localhost:3000  # Login: admin/[GRAFANA_PASSWORD]

# View logs
docker compose logs -f api
```

---

## Configuration Summary

**Total Variables**: 115+

| Category | Count | Status |
|----------|-------|--------|
| Core Configuration | 7 | ✅ Template provided |
| Database | 8 | ⚠️ Requires your host/password |
| Cache (Redis) | 5 | ⚠️ Requires your host/password |
| Task Queue | 10 | ✅ Template provided |
| JWT Authentication | 7 | ⚠️ Requires generated keys |
| Encryption | 4 | ⚠️ Requires generated key |
| Anomaly Detection | 9 | ✅ Template provided |
| Shadow Models | 4 | ✅ Template provided |
| Multi-Region HA | 5 | ✅ Template provided |
| Security | 14 | ⚠️ Requires your domain |
| Monitoring | 7 | ⚠️ Requires Grafana password |
| Logging | 7 | ✅ Template provided |
| Email | 6 | ⚠️ Requires API key |
| External Services | 3 | ⚠️ Requires your hosts |
| Feature Flags | 6 | ✅ Template provided |
| Advanced Config | 5 | ✅ Template provided |

**Legend:**
- ✅ = No changes needed, use template values
- ⚠️ = Requires customization from you

---

## Cloud Platform Instructions

### AWS Deployment

1. **Create RDS PostgreSQL instance**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier phishx-db \
     --db-instance-class db.t3.medium \
     --engine postgres \
     --master-username postgres \
     --master-user-password [GENERATED_PASSWORD] \
     --allocated-storage 100 \
     --backup-retention-period 30 \
     --multi-az
   ```

2. **Create ElastiCache Redis**:
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id phishx-redis \
     --cache-node-type cache.t3.medium \
     --engine redis
   ```

3. **Follow**: `PRODUCTION_DEPLOYMENT.md` → Section 2.1 (AWS Deployment)

### Azure Deployment

1. **Create Azure SQL Server**:
   ```bash
   az sql server create \
     --name phishx-server \
     --resource-group phishx-prod \
     --admin-user postgres \
     --admin-password [GENERATED_PASSWORD]
   ```

2. **Create Azure Cache for Redis**:
   ```bash
   az redis create \
     --name phishx-redis \
     --resource-group phishx-prod \
     --sku Standard \
     --vm-size c0
   ```

3. **Follow**: `PRODUCTION_DEPLOYMENT.md` → Section 2.2 (Azure Deployment)

### Google Cloud Deployment

1. **Create Cloud SQL PostgreSQL**:
   ```bash
   gcloud sql instances create phishx-db \
     --database-version POSTGRES_15 \
     --tier db-custom-2-7680 \
     --region us-central1
   ```

2. **Create Memorystore Redis**:
   ```bash
   gcloud redis instances create phishx-redis \
     --size=2 \
     --region=us-central1
   ```

3. **Follow**: `PRODUCTION_DEPLOYMENT.md` → Section 2.3 (GCP Deployment)

---

## Security Checklist (Before Deploying)

- [ ] All `[CHANGE_ME_*]` placeholders removed from `.env.production`
- [ ] All secrets generated using secure random commands (not simple strings)
- [ ] Database password is 40+ characters, mixed case, numbers, special chars
- [ ] JWT keys are properly base64 encoded (not plain text)
- [ ] Encryption key is exactly 64 hex characters (32 bytes)
- [ ] `.env.production` added to `.gitignore`
- [ ] `.env.production` NOT committed to git
- [ ] Secrets stored in cloud provider's secrets manager (AWS/Azure/GCP)
- [ ] Backup of encryption key stored safely (separate location)
- [ ] SSL certificates configured for HTTPS
- [ ] Email service API key has minimal required permissions
- [ ] Database configured with SSL/TLS
- [ ] Redis AUTH password configured
- [ ] CORS origins whitelist configured (not `*` in production)
- [ ] Validation script passes: `python validate_env_production.py`

---

## Troubleshooting

### "VALIDATION FAILED" errors?

1. **Database URL parsing failed**: 
   - Replace `[CHANGE_ME_HOSTNAME]` with actual database host
   - Example: `db.xxxxx.rds.amazonaws.com`

2. **JWT keys not valid base64**:
   - Ensure keys are properly base64 encoded
   - Run command: `base64 -w0 < jwt_private.key`
   - Copy full output (including all characters)

3. **Encryption key format warning**:
   - Must be exactly 64 hexadecimal characters
   - Generate with: `openssl rand -hex 32`
   - Check: `echo $ENCRYPTION_MASTER_KEY | wc -c` (should be 65 including newline)

### "Connection refused" after deployment?

1. Check host/port are correct in `.env.production`
2. Verify cloud resources are running (RDS, Redis, etc.)
3. Check security groups/firewall allow connections
4. Verify credentials haven't changed

### "JWT token validation failed"?

1. Verify `JWT_ALGORITHM=RS256`
2. Verify `JWT_PRIVATE_KEY` is valid base64
3. Verify `JWT_PUBLIC_KEY` matches private key
4. Check logs: `docker compose logs api | grep jwt`

---

## Documentation Map

| Document | Purpose | Status |
|----------|---------|--------|
| `.env.production` | Environment template | ✅ Created |
| `ENV_SETUP_GUIDE.md` | Secret generation & setup | ✅ Created |
| `validate_env_production.py` | Configuration validation | ✅ Created |
| `DEPLOYMENT_CHECKLIST.md` | Pre/post deployment validation | ✅ Created |
| `PRODUCTION_DEPLOYMENT.md` | Cloud platform guides (AWS/Azure/GCP) | ✅ Created |
| `PHASE3_GUIDE.md` | Architecture & features | ✅ Existing |
| `PHASE3_INTEGRATION.md` | Integration details | ✅ Existing |
| `deploy.sh` + `deploy.ps1` | Deployment automation | ✅ Existing |

---

## Success Indicators

After completing all steps, you should see:

✅ **Validation Output**:
```
✅ VALIDATION PASSED - Ready for deployment
```

✅ **Health Check**:
```json
{
  "status": "healthy",
  "services": {
    "api": {"status": "up"},
    "database": {"status": "up"},
    "cache": {"status": "up"},
    "task_queue": {"status": "up"}
  }
}
```

✅ **API Access**:
- API Documentation: http://localhost:8000/docs
- Prometheus Metrics: http://localhost:9090
- Grafana Dashboard: http://localhost:3000

✅ **JWT Auth Working**:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
# Returns: {"access_token": "...", "token_type": "bearer"}
```

✅ **Encryption Active**:
```bash
curl http://localhost:8000/health/security
# Shows: "encryption": "enabled"
```

---

## Emergency Contacts

If deployment fails:

1. Check logs: `docker compose logs -f`
2. Run validation: `python validate_env_production.py`
3. Review errors in `DEPLOYMENT_CHECKLIST.md` Troubleshooting section
4. Consult `ENV_SETUP_GUIDE.md` for specific error types
5. Check cloud platform documentation for service-specific issues

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Ready for Production Setup ✅

For detailed instructions, see:
- [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) - Step-by-step secret generation
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Cloud platform guides
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Validation procedures
