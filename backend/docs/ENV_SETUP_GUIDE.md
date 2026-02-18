# Environment Configuration Guide for Production

This guide walks through setting up `.env.production` securely for PhishX production deployment.

## Overview

The `.env.production` file contains **35+ critical configuration variables** including database credentials, encryption keys, and JWT secrets. Handle this file with extreme care.

### Security Principles

1. **Never commit `.env.production` to git** - Use `.gitignore`
2. **Use secrets manager instead** - AWS Secrets Manager, Azure Key Vault, Google Secret Manager
3. **Generate strong values** - Follow commands provided below
4. **Rotate quarterly** - Security best practice
5. **Principle of least privilege** - Only give apps access to secrets they need

---

## Part 1: Generate Required Secrets

### 1.1 JWT Key Pair (for RS256 - Recommended)

Generate RSA 2048-bit key pair for JWT signing:

```bash
# Generate private key
openssl genrsa -out jwt_private.key 2048

# Extract public key
openssl rsa -in jwt_private.key -pubout -out jwt_public.key

# Convert to base64 for .env (private key)
cat jwt_private.key | base64 -w0 > jwt_private.b64
# Copy contents of jwt_private.b64 to JWT_PRIVATE_KEY in .env.production

# Convert to base64 for .env (public key)
cat jwt_public.key | base64 -w0 > jwt_public.b64
# Copy contents of jwt_public.b64 to JWT_PUBLIC_KEY in .env.production

# Cleanup
shred -u jwt_private.b64 jwt_public.b64 jwt_public.key
```

**Windows PowerShell Alternative:**

```powershell
# Using openssl (if installed via Git Bash or WSL)
# Or use online generator: https://jwtsecret.com/generate

# Manual method using Python
python -c "
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import base64

# Generate key pair
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)
public_key = private_key.public_key()

# Serialize to PEM
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Convert to base64
print('=== JWT_PRIVATE_KEY ===')
print(base64.b64encode(private_pem).decode())
print()
print('=== JWT_PUBLIC_KEY ===')
print(base64.b64encode(public_pem).decode())
"
```

### 1.2 Database Password

Generate a strong PostgreSQL password (40+ characters, mixed case, numbers, special):

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))

# Python (any OS)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Web tool: https://generate-password.com (40 chars, mixed, numbers, special)
```

Requirements for PostgreSQL:
- ✅ At least 40 characters
- ✅ Mixed case letters (a-z, A-Z)
- ✅ Numbers (0-9)
- ✅ Special characters (!@#$%^&*)
- ✅ No quotes or backslashes (PostgreSQL parsing issues)

Store this in:
- `.env.production` → `POSTGRES_PASSWORD`
- Cloud Secrets Manager → `phishx/prod/db-password`

### 1.3 Encryption Master Key

Generate encryption key for field-level encryption:

```bash
# Linux/Mac
openssl rand -hex 32

# Python (any OS)
python -c "import secrets; print(secrets.token_hex(32))"

# Windows PowerShell
$key = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$bytes = New-Object 'byte[]' 32
$key.GetBytes($bytes)
[BitConverter]::ToString($bytes) -replace '-', ''
```

Result should be 64 hexadecimal characters (32 bytes).

Store this in:
- `.env.production` → `ENCRYPTION_MASTER_KEY`
- Cloud Secrets Manager → `phishx/prod/encryption-key`

### 1.4 JWT Secret Key (if using HS256)

Only needed if using `JWT_ALGORITHM=HS256` (not recommended for production):

```bash
# Generate 40+ character secret
openssl rand -hex 32

# Minimum requirement: 32 bytes (64 hex characters)
```

### 1.5 SendGrid API Key (or equivalent email service)

Get from SendGrid dashboard:

1. Log in to SendGrid → Settings → API Keys
2. Create new API Key with "Restricted Access"
3. Grant permissions: Mail Send
4. Copy the key (shown only once!)

Store this in:
- `.env.production` → `SMTP_PASSWORD`
- Cloud Secrets Manager → `phishx/prod/sendgrid-key`

### 1.6 Redis Password (if using AUTH)

Generate strong password for Redis:

```bash
openssl rand -base64 32
```

Store this in:
- `.env.production` → `REDIS_PASSWORD`
- Cloud Secrets Manager → `phishx/prod/redis-password`

### 1.7 Grafana Admin Password

Generate password for Grafana dashboard access:

```bash
openssl rand -base64 24
```

Store this in:
- `.env.production` → `GRAFANA_ADMIN_PASSWORD`
- Cloud Secrets Manager → `phishx/prod/grafana-admin-password`

---

## Part 2: Platform-Specific Setup

### 2.1 AWS (Recommended)

#### Store secrets in AWS Secrets Manager

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure  # Requires AWS Access Key ID and Secret Access Key

# Create database password secret
aws secretsmanager create-secret \
  --name phishx/prod/db-password \
  --description "PhishX production database password" \
  --secret-string "$(openssl rand -base64 32)"

# Create JWT private key secret
aws secretsmanager create-secret \
  --name phishx/prod/jwt-private-key \
  --description "PhishX JWT private key" \
  --secret-string "$(base64 -w0 < jwt_private.key)"

# Create encryption key secret
aws secretsmanager create-secret \
  --name phishx/prod/encryption-key \
  --description "PhishX field-level encryption key" \
  --secret-string "$(openssl rand -hex 32)"

# Create SendGrid API key secret
aws secretsmanager create-secret \
  --name phishx/prod/sendgrid-key \
  --description "SendGrid API key" \
  --secret-string "SG.your-actual-sendgrid-key"

# List all secrets
aws secretsmanager list-secrets --filters Key=name,Values=phishx
```

#### Retrieve secrets in deployment script

```bash
#!/bin/bash
# get-secrets.sh

export POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id phishx/prod/db-password \
  --query SecretString \
  --output text)

export JWT_PRIVATE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id phishx/prod/jwt-private-key \
  --query SecretString \
  --output text)

export ENCRYPTION_MASTER_KEY=$(aws secretsmanager get-secret-value \
  --secret-id phishx/prod/encryption-key \
  --query SecretString \
  --output text)

export SMTP_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id phishx/prod/sendgrid-key \
  --query SecretString \
  --output text)

# Export DATABASE_URL (construct from components)
DB_USER=$(aws secretsmanager get-secret-value \
  --secret-id phishx/prod/db-user \
  --query SecretString --output text)
  
export DATABASE_URL="postgresql://$DB_USER:$POSTGRES_PASSWORD@phishx-db.xxxxx.rds.amazonaws.com:5432/phishx_db"

# Load into .env.production
cat > .env.production << EOF
DATABASE_URL=$DATABASE_URL
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY
ENCRYPTION_MASTER_KEY=$ENCRYPTION_MASTER_KEY
SMTP_PASSWORD=$SMTP_PASSWORD
# ... other non-secret values
EOF

echo "✅ Secrets loaded from AWS Secrets Manager"
```

### 2.2 Azure Key Vault

#### Store secrets in Azure Key Vault

```bash
# Install Azure CLI
pip install azure-cli

# Login
az login

# Create Key Vault (if not exists)
az keyvault create \
  --name phishx-kv \
  --resource-group phishx-prod \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name phishx-kv \
  --name db-password \
  --value "$(openssl rand -base64 32)"

az keyvault secret set \
  --vault-name phishx-kv \
  --name jwt-private-key \
  --value "$(base64 -w0 < jwt_private.key)"

az keyvault secret set \
  --vault-name phishx-kv \
  --name encryption-key \
  --value "$(openssl rand -hex 32)"

# List all secrets
az keyvault secret list --vault-name phishx-kv
```

#### Retrieve secrets in deployment script

```bash
#!/bin/bash
# get-secrets-azure.sh

export POSTGRES_PASSWORD=$(az keyvault secret show \
  --vault-name phishx-kv \
  --name db-password \
  --query value -o tsv)

export JWT_PRIVATE_KEY=$(az keyvault secret show \
  --vault-name phishx-kv \
  --name jwt-private-key \
  --query value -o tsv)

export ENCRYPTION_MASTER_KEY=$(az keyvault secret show \
  --vault-name phishx-kv \
  --name encryption-key \
  --query value -o tsv)

echo "✅ Secrets loaded from Azure Key Vault"
```

### 2.3 Google Cloud Secret Manager

#### Store secrets in Google Cloud

```bash
# Install Google Cloud CLI
pip install google-cloud-secret-manager

# Authenticate
gcloud auth login

# Create secrets
echo -n "$(openssl rand -base64 32)" | gcloud secrets create phishx-db-password --data-file=-

echo -n "$(base64 -w0 < jwt_private.key)" | gcloud secrets create phishx-jwt-private-key --data-file=-

echo -n "$(openssl rand -hex 32)" | gcloud secrets create phishx-encryption-key --data-file=-

# List all secrets
gcloud secrets list --filter="labels.project=phishx"
```

#### Retrieve secrets in deployment script

```bash
#!/bin/bash
# get-secrets-gcp.sh

export POSTGRES_PASSWORD=$(gcloud secrets versions access latest --secret="phishx-db-password")

export JWT_PRIVATE_KEY=$(gcloud secrets versions access latest --secret="phishx-jwt-private-key")

export ENCRYPTION_MASTER_KEY=$(gcloud secrets versions access latest --secret="phishx-encryption-key")

echo "✅ Secrets loaded from Google Cloud Secret Manager"
```

---

## Part 3: Fill in .env.production

### Step-by-step completion:

#### 1. **Database Configuration**

```bash
# Check your RDS/Azure SQL/Cloud SQL endpoint
# AWS RDS: phishx-db.xxxxx.rds.amazonaws.com
# Azure: phishx-db.postgres.database.azure.com
# GCP: cloudsql-proxy connection

# Fill in:
DATABASE_URL=postgresql://dbuser:GENERATED_PASSWORD@YOUR_HOST:5432/phishx_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[PASTE_GENERATED_DB_PASSWORD]
```

#### 2. **Cache Configuration**

```bash
# AWS ElastiCache endpoint: phishx-redis.xxxxx.ng.0001.use1.cache.amazonaws.com
# Azure Cache for Redis endpoint: phishx-redis.redis.cache.windows.net

REDIS_URL=redis://YOUR_REDIS_HOST:6379/0
REDIS_PASSWORD=[PASTE_GENERATED_REDIS_PASSWORD]
```

#### 3. **JWT Authentication**

```bash
# If using RS256 (recommended):
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY=[PASTE_BASE64_PRIVATE_KEY]
JWT_PUBLIC_KEY=[PASTE_BASE64_PUBLIC_KEY]

# If using HS256:
JWT_ALGORITHM=HS256
JWT_SECRET_KEY=[PASTE_GENERATED_SECRET_40_CHARS]
```

#### 4. **Encryption**

```bash
ENCRYPTION_ENABLED=true
ENCRYPTION_MASTER_KEY=[PASTE_GENERATED_HEX_KEY_64_CHARS]
```

#### 5. **Email Configuration**

```bash
SMTP_PASSWORD=[PASTE_SENDGRID_API_KEY]
ANOMALY_ALERT_EMAIL=security-team@your-company.com
```

#### 6. **Security & CORS**

```bash
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com
```

#### 7. **Monitoring**

```bash
GRAFANA_ADMIN_PASSWORD=[PASTE_GENERATED_GRAFANA_PASSWORD]
```

---

## Part 4: Validation

### 4.1 Syntax Check

```bash
# Python check for syntax errors
python -c "
import dotenv
config = dotenv.dotenv_values('.env.production')
print(f'✅ Loaded {len(config)} environment variables')
"
```

### 4.2 Required Variables Check

```bash
# Verify all critical variables are set
python << 'EOF'
import os
from dotenv import load_dotenv

load_dotenv('.env.production')

required_vars = [
    'DATABASE_URL',
    'POSTGRES_PASSWORD',
    'REDIS_URL',
    'ENCRYPTION_MASTER_KEY',
    'JWT_PRIVATE_KEY' if os.getenv('JWT_ALGORITHM') == 'RS256' else 'JWT_SECRET_KEY',
    'SMTP_PASSWORD',
    'GRAFANA_ADMIN_PASSWORD',
]

missing = []
for var in required_vars:
    if not os.getenv(var):
        missing.append(var)

if missing:
    print(f"❌ Missing variables: {', '.join(missing)}")
else:
    print(f"✅ All required variables set!")
    
# Check values are not placeholders
placeholders = [
    'CHANGE_ME',
    '[', 
    'YOUR_',
]
for var in required_vars:
    value = os.getenv(var, '')
    if any(p in value for p in placeholders):
        print(f"⚠️  {var} still contains placeholder values")
EOF
```

### 4.3 Run Full Validation

```bash
# Use the included validation script
python validate_phase3.py

# Check for specific Phase 3 features
curl http://localhost:8000/health/security
curl http://localhost:8000/anomalies/stats
curl http://localhost:8000/health/regions
```

---

## Part 5: Security Best Practices

### 5.1 Before Deployment

- [ ] Remove all `[CHANGE_ME_*]` placeholders
- [ ] File permissions are restrictive: `chmod 600 .env.production`
- [ ] `.env.production` is in `.gitignore`
- [ ] All secrets are stored in Secrets Manager (not in code)
- [ ] Backup encryption key is stored safely (separate location)
- [ ] JWT key pair is backed up offline
- [ ] Database is configured with SSL/TLS
- [ ] Redis is configured with AUTH password
- [ ] Email service API key has minimal required permissions
- [ ] All passwords are 40+ characters and complex

### 5.2 After Deployment

- [ ] Run health check: `curl http://localhost:8000/health`
- [ ] Verify encryption active: `curl http://localhost:8000/health/security`
- [ ] Check JWT auth working: POST `/auth/login` succeeds
- [ ] Verify database encrypted: `curl http://localhost:8000/security/encryption-status`
- [ ] Monitor logs for errors: `docker compose logs -f api`
- [ ] Alert email receives test message
- [ ] Grafana dashboard shows metrics
- [ ] Anomaly detection working: `curl http://localhost:8000/anomalies/stats`

### 5.3 Secret Rotation Schedule

**Monthly:**
- Check for compromised credentials
- Review audit logs

**Quarterly:**
- Rotate JWT keys (if RS256)
- Rotate database password
- Rotate Redis password
- Rotate API keys

**Annually:**
- Rotate encryption master key (with re-encryption)
- Review and update security policies
- Penetration testing (recommended)

### 5.4 Emergency Procedures

**If database password leaked:**
```bash
# 1. Create new password
NEW_PASS=$(openssl rand -base64 32)

# 2. Update in RDS/Azure/GCP
# AWS: aws rds modify-db-instance --db-instance-identifier phishx-db --master-user-password $NEW_PASS
# Azure: az postgres server update --admin-password $NEW_PASS
# GCP: gcloud sql users set-password postgres --instance=phishx-db --password=$NEW_PASS

# 3. Update in Secrets Manager
aws secretsmanager update-secret --secret-id phishx/prod/db-password --secret-string $NEW_PASS

# 4. Restart application
docker compose restart api
```

**If JWT private key leaked:**
```bash
# 1. Generate new key pair immediately
openssl genrsa -out jwt_private_new.key 2048

# 2. Update in Secrets Manager
aws secretsmanager update-secret --secret-id phishx/prod/jwt-private-key --secret-string "$(base64 -w0 < jwt_private_new.key)"

# 3. Update .env.production and deploy immediately

# 4. Invalidate all issued tokens (optional if short expiry)
```

---

## Part 6: Development vs Production

### Quick Comparison

| Setting | Development | Production |
|---------|------------|-----------|
| `ENVIRONMENT` | `development` | `production` |
| `DEBUG` | `true` | `false` |
| `LOG_LEVEL` | `DEBUG` | `info` |
| `JWT_ALGORITHM` | `HS256` | `RS256` |
| `ENCRYPTION_ENABLED` | `false` | `true` |
| `ENABLE_JWT_AUTH` | `false` | `true` |
| `WORKERS` | `4` | `8+` |
| `DB_POOL_SIZE` | `5` | `20` |
| `ENABLE_CIRCUIT_BREAKERS` | `false` | `true` |
| `ENABLE_HTTPS` | `false` | `true` |

---

## Part 7: Troubleshooting

### Issue: "Invalid database password"

```bash
# Check password doesn't have special parsing issue
# PostgreSQL URL encoding requites: @ → %40, : → %3A, etc.
# Solution: Use psycopg2-style DSN or fix URL encoding
```

### Issue: "JWT token validation failed"

```bash
# Check JWT_PRIVATE_KEY is properly base64 encoded
python -c "import base64; base64.b64decode('$JWT_PRIVATE_KEY')" 

# Verify key pair matches
openssl pkey -in jwt_private.key -pubout | openssl pkey -pubin -text
```

### Issue: "Encryption master key invalid"

```bash
# Check key is exactly 64 hex characters (32 bytes)
echo $ENCRYPTION_MASTER_KEY | wc -c  # Should be 65 (64 + newline)

# Verify key is valid hex
echo $ENCRYPTION_MASTER_KEY | grep -E '^[0-9a-fA-F]{64}$'
```

### Issue: "Redis connection refused"

```bash
# Check Redis URL is correct
redis-cli -h $REDIS_HOST -p 6379 ping

# If using AUTH, verify password
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD ping
```

---

## Quick Start Script

Save as `setup-prod-env.sh`:

```bash
#!/bin/bash
# One-command production environment setup

set -e

echo "🔐 PhishX Production Environment Setup"
echo "======================================"

# Generate all secrets
echo "📝 Generating secrets..."
DB_PASS=$(openssl rand -base64 32)
JWT_KEY=$(openssl rand -hex 32)
ENC_KEY=$(openssl rand -hex 32)
REDIS_PASS=$(openssl rand -base64 32)
GRAFANA_PASS=$(openssl rand -base64 24)

# Generate JWT key pair
openssl genrsa -out jwt_private.key 2048 2>/dev/null
JWT_PRIV=$(base64 -w0 < jwt_private.key)
JWT_PUB=$(openssl rsa -in jwt_private.key -pubout 2>/dev/null | base64 -w0)

# Create .env.production
cat > .env.production << EOF
ENVIRONMENT=production
DEBUG=false
PORT=8000
WORKERS=8

# Secrets (GENERATED - store in Secrets Manager)
DATABASE_URL=postgresql://postgres:$DB_PASS@[YOUR_HOST]:5432/phishx_db
POSTGRES_PASSWORD=$DB_PASS
REDIS_URL=redis://[YOUR_HOST]:6379/0
REDIS_PASSWORD=$REDIS_PASS
JWT_PRIVATE_KEY=$JWT_PRIV
JWT_PUBLIC_KEY=$JWT_PUB
ENCRYPTION_MASTER_KEY=$ENC_KEY
GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASS
SMTP_PASSWORD=[YOUR_SENDGRID_KEY]

# Other settings
ENABLE_JWT_AUTH=true
JWT_ALGORITHM=RS256
ENCRYPTION_ENABLED=true
ANOMALY_DETECTION_ENABLED=true
CORS_ORIGINS=https://your-domain.com
ENABLE_HTTPS=true

# ... additional config from template
EOF

echo "✅ Generated .env.production"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Store secrets in AWS Secrets Manager / Azure Key Vault / GCP Secret Manager"
echo "2. Update [YOUR_HOST] placeholders in .env.production"
echo "3. Update CORS_ORIGINS and SMTP_PASSWORD"
echo "4. Run: python validate_phase3.py"
echo "5. Deploy: ./deploy.sh (Linux) or deploy.ps1 (Windows)"
echo ""
echo "Secrets generated (save to Secrets Manager):"
echo "DATABASE_PASSWORD: $DB_PASS"
echo "REDIS_PASSWORD: $REDIS_PASS"
echo "GRAFANA_PASSWORD: $GRAFANA_PASS"
echo ""

# Cleanup sensitive files
rm -f jwt_private.key
```

Run it:
```bash
chmod +x setup-prod-env.sh
./setup-prod-env.sh
```

---

**Need help?** Check:
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-deployment validation
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Cloud platform guides
- [PHASE3_GUIDE.md](PHASE3_GUIDE.md) - Architecture and configuration details

**Last Updated**: February 2026  
**Status**: Production Ready ✅
