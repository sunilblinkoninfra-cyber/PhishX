# PhishX Phase 3 - Advanced Security & High Availability Guide

**Phase 3 Focus**: JWT Authentication, Database Encryption, Anomaly Detection, Shadow Models, Multi-Region High Availability

## Table of Contents

1. [Phase 3 Architecture Overview](#phase-3-architecture-overview)
2. [JWT Authentication System](#jwt-authentication-system)
3. [Database Field Encryption](#database-field-encryption)
4. [Anomaly Detection Engine](#anomaly-detection-engine)
5. [Shadow Models & A/B Testing](#shadow-models--ab-testing)
6. [Multi-Region Failover](#multi-region-failover)
7. [Implementation Guide](#implementation-guide)
8. [Operations & Monitoring](#operations--monitoring)

---

## Phase 3 Architecture Overview

Phase 3 transforms PhishX into an enterprise-grade platform with:
- **Advanced Security**: JWT authentication with token rotation, field-level encryption
- **Intelligent Detection**: ML-based anomaly detection alongside production models
- **Safe Deployment**: Shadow models and canary rollouts for zero-impact testing
- **Global Resilience**: Multi-region failover with automatic traffic rerouting

```
Multi-Region Architecture:
┌─────────────────────────────────────────────┐
│        Global Traffic Router                │
│  (Route to best region: latency/health)    │
└──────────┬──────────────┬──────────────────┘
           │              │
    ┌──────▼─────┐  ┌────▼──────┐
    │ US-EAST-1  │  │ EU-WEST-1 │
    │  (Primary) │  │(Secondary)│
    ├────────────┤  ├───────────┤
    │ ┌────────┐ │  │┌────────┐ │
    │ │  JWT   │ │  ││  JWT   │ │
    │ ├────────┤ │  │├────────┤ │
    │ │ Encrypt│ │  ││Encrypt │ │
    │ ├────────┤ │  │├────────┤ │
    │ │ Anomaly│ │  ││Anomaly │ │
    │ └────────┘ │  │└────────┘ │
    └────────────┘  └───────────┘
           ▲              ▲
           │              │
      ┌────┴──────────────┴───┐
      │ Cross-Region          │
      │ Replication & Sync    │
      └───────────────────────┘
```

---

## JWT Authentication System

### File: `jwt_auth.py` (550+ lines)

**Purpose**: Replace simple API keys with stateful JWT tokens featuring token refresh, revocation, and RBAC.

### Components

#### 1. Token Models
```python
from jwt_auth import TokenPayload, RefreshToken

# Token payload contains
payload = {
    "sub": "user_id",           # Subject
    "tenant_id": "org_uuid",    # Tenant isolation
    "role": "admin|soc_analyst|api_client|readonly",
    "scopes": ["read", "write", "admin", "email_ingest", "enforce", "soc"],
    "iat": 1708187445,          # Issued at
    "exp": 1708188345,          # Expiration (15 min default)
    "iss": "phishx",            # Issuer
    "aud": "phishx-api",        # Audience
    "jti": "uuid",              # JWT ID (for revocation)
    "refresh_token_id": "uuid"  # Associated refresh token
}
```

#### 2. User Roles & Permissions

```python
UserRole.ADMIN          → [READ, WRITE, ADMIN]
UserRole.SOC_ANALYST    → [READ, WRITE, SOC]
UserRole.API_CLIENT     → [READ, WRITE, EMAIL_INGEST, ENFORCE]
UserRole.READONLY       → [READ]
```

### Usage - Generate Tokens

```python
from jwt_auth import JWTTokenManager, UserRole, TokenScope

# Generate access token
access_token = JWTTokenManager.generate_access_token(
    user_id="user_123",
    tenant_id="org_uuid",
    role=UserRole.API_CLIENT,
    scopes=[TokenScope.EMAIL_INGEST, TokenScope.ENFORCE]
)

# Generate refresh token (long-lived)
refresh_token_id = JWTTokenManager.generate_refresh_token(
    user_id="user_123",
    tenant_id="org_uuid"
)

# Client stores: access_token, refresh_token_id
```

### Usage - Validate Tokens

```python
# Validate token
payload = JWTTokenManager.validate_token(access_token)

if payload:
    print(f"User: {payload.user_id}")
    print(f"Tenant: {payload.tenant_id}")
    print(f"Scopes: {payload.scopes}")
else:
    # Invalid or expired
    pass
```

### Usage - Refresh Tokens

```python
# When access token expires, use refresh token
new_access_token = JWTTokenManager.refresh_access_token(
    refresh_token_id=old_refresh_token_id,
    user_id="user_123",
    tenant_id="org_uuid"
)

# Refresh tokens are rotated: old one revoked, new one issued
```

### Usage - Check Permissions

```python
from jwt_auth import AuthorizationManager, TokenScope

# Check if user has specific scope
if AuthorizationManager.has_scope(payload, TokenScope.WRITE):
    # Allow write operation
    pass

# Check if user is admin
if AuthorizationManager.is_admin(payload):
    # Allow admin operations
    pass

# Check tenant ownership
if AuthorizationManager.is_tenant_owner(payload, resource_tenant_id):
    # Allow access to resource
    pass
```

### Configuration

```bash
# .env
JWT_ALGORITHM=HS256              # HS256 or RS256 (use RS256 in production)
JWT_SECRET_KEY=your-secret-key   # For HS256
JWT_PUBLIC_KEY=your-public-key   # For RS256 (optional)
JWT_ACCESS_TOKEN_EXPIRE=15       # Minutes (15 min default)
JWT_REFRESH_TOKEN_EXPIRE=30      # Days (30 days default)
```

### Security Features

1. **Token Expiration**: Access tokens expire in 15 minutes
2. **Refresh Token Rotation**: Old refresh tokens revoked on use
3. **Token Revocation List**: In-memory (Redis in production)
4. **JTI Tracking**: JWT ID for audit logging
5. **Tenant Isolation**: Token-based tenant separation
6. **RBAC**: Role-based access control with scopes

---

## Database Field Encryption

### File: `db_encryption.py` (450+ lines)

**Purpose**: Encrypt sensitive fields (PII, findings) at rest using Fernet (symmetric encryption).

### Encrypted Fields

```
users.email              → Encrypted (PII)
users.name              → Encrypted (PII)
users.password_hash     → Encrypted (Credentials)

email_analysis.sender   → Encrypted (PII)
email_analysis.subject  → Encrypted (Sensitive content)
email_analysis.body     → Encrypted (Sensitive content)

findings.finding_type   → Encrypted (Classification)
findings.description    → Encrypted (Analysis details)

audit_log.action_details    → Encrypted (Sensitive access)
audit_log.ip_address        → Encrypted (PII)
```

### Usage - Transparent Encryption

```python
from db_encryption import DatabaseEncryptionLayer, EncryptionConfig

# Enable encryption
EncryptionConfig.ENCRYPTION_ENABLED = True
EncryptionConfig.MASTER_KEY = "your-master-key"

# Encrypt a database row before INSERT
row = {
    "email_id": "uuid",
    "sender": "attacker@evil.com",
    "subject": "Phishing attempt",
    "body": "Click here...",
    "risk_score": 92
}

encrypted_row = DatabaseEncryptionLayer.encrypt_row("email_analysis", row)
# Stores:
# sender: "v1:encrypted_bytes..."
# subject: "v1:encrypted_bytes..."
# body: "v1:encrypted_bytes..."
# risk_score: 92  (Not encrypted, needed for filtering)

# Decrypt a database row after SELECT
decrypted_row = DatabaseEncryptionLayer.decrypt_row("email_analysis", db_row)
# Automatically decrypts sensitive fields
```

### PII Detection & Masking

```python
from db_encryption import PIIDetector

# Detect PII in text
pii_found = PIIDetector.detect_pii(email_body)
# Returns: {"email": ["attacker@evil.com"], "phone": ["555-1234"], ...}

# Mask PII for logging
masked_text = PIIDetector.mask_pii(email_body)
# Returns: "Click here to update your XXXXXXX account"
```

### Key Rotation

```python
from db_encryption import KeyRotationManager

# Rotate encryption master key
KeyRotationManager.rotate_key(new_master_key)

# Get rotation history
history = KeyRotationManager.get_rotation_history()
# Returns: [{timestamp, old_key_hash, new_key_hash}, ...]
```

### Configuration

```bash
# .env
ENCRYPTION_ENABLED=true
ENCRYPTION_MASTER_KEY=your-32-byte-key-base64-encoded
KEY_ROTATION_INTERVAL=90  # Days
```

### Security Considerations

1. **Algorithm**: Fernet (AES-128 + HMAC)
2. **Salt**: PBKDF2 with 100,000 iterations
3. **Key Derivation**: SHA256-based KDF
4. **At-Rest Encryption**: Yes
5. **In-Transit**: HTTPS (separate from this system)
6. **Queryability**: Non-encrypted fields (risk_score, decision) used for queries/filtering

---

## Anomaly Detection Engine

### File: `anomaly_detection.py` (400+ lines)

**Purpose**: ML-based anomaly detection for unusual email patterns, sender behavior, and risk outliers.

### Detection Methods

#### 1. **Statistical Anomaly Detection**

```python
from anomaly_detection import StatisticalAnomalyDetector

detector = StatisticalAnomalyDetector()

# Add samples
detector.add_sample({"risk_score": 45, "url_count": 3, ...})

# Detect anomalies
features = EmailFeatures.extract(new_email)
anomaly = detector.detect(features)

if anomaly:
    print(f"Anomaly detected: {anomaly.anomaly_type}")
    print(f"Confidence: {anomaly.confidence:.2%}")
    print(f"Method: {anomaly.detection_method}")
    print(f"Details: {anomaly.details}")
```

**Methods**:
- **Z-Score**: Flag values > 3 standard deviations from mean
- **Interquartile Range**: Flag values outside Q1±1.5×IQR bounds

#### 2. **Behavioral Anomaly Detection**

```python
from anomaly_detection import BehavioralAnomalyDetector

behavior_detector = BehavioralAnomalyDetector()

# Track sender
behavior_detector.track_sender("trusted@acme.com", email_data)

# Detect behavior changes
anomaly = behavior_detector.detect_sender_anomaly(
    sender="trusted@acme.com",
    current_risk=85  # Normally this sender has risk < 30
)

# Detect new sender spike
anomaly = behavior_detector.detect_new_sender_anomaly(
    recipient="user@org.com",
    sender="stranger@new-domain.com"
)
```

#### 3. **Pattern-Based Detection**

```python
from anomaly_detection import PatternAnomalyDetector

anomaly = PatternAnomalyDetector.detect_high_risk_patterns(email_data)
# Detects:
# - Extreme risk scores (>85)
# - Excessive URLs (>10)
# - Excessive attachments (>5)
```

### Composite Engine

```python
from anomaly_detection import AnomalyDetectionEngine

engine = AnomalyDetectionEngine()

# Comprehensive analysis
result = engine.analyze(email_data)

if result:
    # Log anomaly for investigation
    logger.warning(f"Anomaly: {result.anomaly_type} ({result.confidence:.0%})")
    
    # Could trigger additional checks or notifications
    if result.confidence > 0.9:
        send_soc_alert(result)

# Get statistics
stats = engine.get_statistics()
# {total_analyzed: 10000, anomalies_detected: 45, anomaly_rate_percent: 0.45}
```

### Configuration

```python
AnomalyConfig.CONTAMINATION_RATE = 0.05          # 5% anomalies expected
AnomalyConfig.ZSCORE_THRESHOLD = 3.0             # 3 std devs
AnomalyConfig.SLIDING_WINDOW_SIZE = 1000         # Track last 1000 emails
AnomalyConfig.RISK_SCORE_ANOMALY_THRESHOLD = 85
AnomalyConfig.URL_COUNT_ANOMALY_THRESHOLD = 10
```

---

## Shadow Models & A/B Testing

### File: `shadow_models.py` (450+ lines)

**Purpose**: Safely test new ML models without impacting production using shadow models, canary deployments, and statistical significance testing.

### Shadow Model Experiments

```python
from shadow_models import ShadowModelManager

# Create experiment
experiment = ShadowModelManager.create_experiment(
    experiment_name="URL Analyzer v2 Evaluation",
    production_model="url_analyzer_v1",
    shadow_model="url_analyzer_v2"
)

# As emails are processed:
ShadowModelManager.record_predictions(
    experiment_id=experiment.experiment_id,
    email_id="email_123",
    production_prediction={"decision": "allow", "risk_score": 25},
    shadow_prediction={"decision": "allow", "risk_score": 28}
)

# After collecting data:
ShadowModelManager.complete_experiment(
    experiment_id=experiment.experiment_id,
    production_accuracy=0.945,
    shadow_accuracy=0.952
)

# Results show:
# - Agreement rate: 98.5%
# - Disagreement cases logged for review
# - Accuracy improvement: +0.7%
```

### Canary Deployments

```python
from shadow_models import CanaryDeploymentManager

# Start canary deployment
canary = CanaryDeploymentManager.start_canary_deployment(
    model_version="url_analyzer_v2",
    strategy="linear",  # 10% -> 20% -> ... -> 100%
    hypothesis="v2 should have higher accuracy"
)

# Monitor and advance stages
while canary.traffic_percentage < 100:
    time.sleep(3600)  # Wait 1 hour
    
    # Check metrics
    if check_success_criteria(canary):
        CanaryDeploymentManager.advance_canary_stage(canary.deployment_id)
    else:
        CanaryDeploymentManager.rollback_canary(canary.deployment_id)
        break
```

**Deployment Strategies**:
- **LINEAR**: 10% → 20% → 30% ... 100%
- **EXPONENTIAL**: 10% → 20% → 40% → 80% → 100%
- **MANUAL**: Manual control at each stage

### Traffic Routing to Models

```python
from shadow_models import ModelRouter

# Decide which model to use
model_version = ModelRouter.decide_model_version(
    shadow_experiment=active_experiment,
    canary_deployment=active_canary
)

# Get predictions
result = ModelRouter.get_predictions(
    email_data=email_data,
    production_model_fn=production_model.predict,
    shadow_model_fn=shadow_model.predict if active_experiment else None
)
```

### Statistical Significance Testing

```python
from shadow_models import StatisticalTesting

# Chi-square test
is_significant, p_value = StatisticalTesting.chi_square_test(
    model_a_predictions=prod_predictions,
    model_b_predictions=shadow_predictions,
    alpha=0.05
)

# Confidence interval
lower, upper = StatisticalTesting.calculate_confidence_interval(
    accuracy=0.952,
    sample_size=10000,
    confidence_level=0.95
)
# Accuracy: 95.2% (±0.5%)
```

---

## Multi-Region Failover

### File: `multi_region.py` (500+ lines)

**Purpose**: Global deployment with automatic failover, traffic routing, and disaster recovery.

### Region Registration

```python
from multi_region import MultiRegionManager, FailoverStrategy

# Register regions
us_east = MultiRegionManager.register_region(
    region_id="us-east-1",
    region_name="US East 1",
    api_endpoint="https://api-us-east.phishx.com",
    database_endpoint="postgresql://us-east.db",
    cache_endpoint="redis://us-east.cache",
    is_primary=True
)

eu_west = MultiRegionManager.register_region(
    region_id="eu-west-1",
    region_name="EU West 1",
    api_endpoint="https://api-eu-west.phishx.com",
    database_endpoint="postgresql://eu-west.db",
    cache_endpoint="redis://eu-west.cache",
    is_primary=False
)

# Create failover pair
pair = MultiRegionManager.pair_regions(
    primary_region_id="us-east-1",
    secondary_region_id="eu-west-1",
    strategy=FailoverStrategy.ACTIVE_PASSIVE
)
```

### Health Checks & Failover

```python
from multi_region import MultiRegionManager

# Continuous health checking
while True:
    for pair in MultiRegionManager.region_pairs:
        if MultiRegionManager.check_failover_conditions(pair):
            # Primary is unhealthy, failover to secondary
            MultiRegionManager.trigger_failover(pair)
            
            # Notify team
            send_alert("Failover triggered to EU-WEST-1")
        
        elif pair.is_failed_over:
            # Check if primary recovered
            if MultiRegionManager.trigger_failback(pair):
                # Primary recovered, failback
                send_alert("Failback to US-EAST-1 completed")
    
    time.sleep(30)
```

### Traffic Routing

```python
from multi_region import GlobalTrafficRouter

# Route incoming request to best region
region_id = GlobalTrafficRouter.route_request(
    email_data=email_data,
    user_region="eu-west-1"  # Prefer user's region
)

# Forward request to region's API endpoint
api_endpoint = MultiRegionManager.regions[region_id].api_endpoint
response = requests.post(f"{api_endpoint}/ingest/email", json=email_data)
```

### Data Replication

```python
from multi_region import CrossRegionReplication

# Start replication
CrossRegionReplication.start_replication("us-east-1", "eu-west-1")

# Monitor replication
status = CrossRegionReplication.get_replication_status()
# {
#     "us-east-1→eu-west-1": {
#         "status": "replicating",
#         "lag_ms": 2345,
#         "items_replicated": 98765
#     }
# }
```

### Disaster Recovery

```python
from multi_region import DisasterRecovery

# Create recovery point
DisasterRecovery.create_recovery_point(
    region_id="us-east-1",
    backup_location="s3://backups/us-east-1/2026-02-17/",
    description="Daily backup before maintenance"
)

# In case of disaster
if catastrophic_failure_detected():
    DisasterRecovery.restore_from_backup(
        region_id="us-east-1",
        recovery_point_timestamp="2026-02-17T00:00:00Z"
    )
```

---

## Implementation Guide

### Step 1: Integrate JWT Authentication

Update `app_new.py`:
```python
from jwt_auth import JWTTokenManager, AuthorizationManager

# Replace API key authentication with JWT
async def authenticate_request(authorization: str = Header(...)) -> TokenPayload:
    token = authorization.replace("Bearer ", "")
    payload = JWTTokenManager.validate_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload

# Add login endpoint
@app.post("/auth/login")
async def login(username: str, password: str):
    # Verify credentials (implement actual auth)
    access_token = JWTTokenManager.generate_access_token(...)
    refresh_token_id = JWTTokenManager.generate_refresh_token(...)
    
    return {
        "access_token": access_token,
        "refresh_token_id": refresh_token_id,
        "token_type": "bearer",
        "expires_in": 900  # 15 minutes
    }

# Add token refresh endpoint
@app.post("/auth/refresh")
async def refresh_token(refresh_token_id: str):
    new_token = JWTTokenManager.refresh_access_token(...)
    return {"access_token": new_token}
```

### Step 2: Enable Database Encryption

Update database layer:
```python
from db_encryption import DatabaseEncryptionLayer

# Before INSERT
def insert_email_analysis(email_data):
    encrypted = DatabaseEncryptionLayer.encrypt_row("email_analysis", email_data)
    db.insert("email_analysis", encrypted)

# After SELECT
def get_email_analysis(email_id):
    row = db.query("SELECT * FROM email_analysis WHERE id = %s", email_id)
    return DatabaseEncryptionLayer.decrypt_row("email_analysis", row)
```

### Step 3: Enable Anomaly Detection

Update task processing:
```python
from anomaly_detection import AnomalyDetectionEngine

engine = AnomalyDetectionEngine()

@shared_task
def process_email(email_id, ...):
    # Existing processing...
    
    # Check for anomalies
    anomaly = engine.analyze(email_data)
    if anomaly and anomaly.confidence > 0.8:
        logger.warning(f"Anomalous email detected: {anomaly.anomaly_type}")
        # Could escalate to SOC or apply stricter rules
```

### Step 4: Deploy Shadow Models

```python
from shadow_models import ShadowModelManager, CanaryDeploymentManager

# Create shadow experiment for new NLP model
experiment = ShadowModelManager.create_experiment(
    "NLP Model v2 Evaluation",
    "nlp_v1.joblib",
    "nlp_v2.joblib"
)

# Start canary deployment after experiment completes
if experiment.accuracy_improvement > 0.5:
    canary = CanaryDeploymentManager.start_canary_deployment(
        "nlp_v2.joblib",
        strategy="linear"
    )
```

### Step 5: Configure Multi-Region

```python
from multi_region import MultiRegionManager

# Initialize regions during startup
def setup_multi_region():
    MultiRegionManager.register_region(...)
    MultiRegionManager.register_region(...)
    MultiRegionManager.pair_regions(...)
    
    # Start health check loop
    asyncio.create_task(health_check_loop())

async def health_check_loop():
    while True:
        for pair in MultiRegionManager.region_pairs:
            if MultiRegionManager.check_failover_conditions(pair):
                MultiRegionManager.trigger_failover(pair)
        
        await asyncio.sleep(30)
```

---

## Operations & Monitoring

### JWT Token Audit

```bash
# View token audit log
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/auth/audit-log

# Revoke all user tokens (logout)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/auth/revoke-all
```

### Encryption Metrics

```bash
# Check encryption status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/encryption/metrics

# Expected response:
{
  "total_encryptions": 50000,
  "total_decryptions": 50000,
  "total_operations": 100000,
  "encryption_errors": 0,
  "decryption_errors": 0,
  "error_rate_percent": 0.0
}
```

### Anomaly Statistics

```bash
# Get anomaly detection stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/anomalies/stats

# Expected response:
{
  "total_analyzed": 100000,
  "anomalies_detected": 500,
  "anomaly_rate_percent": 0.5
}
```

### Shadow Model Experiments

```bash
# List active experiments
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/experiments/active

# Get experiment results
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/experiments/{experiment_id}/results
```

### Multi-Region Status

```bash
# Check region status
curl http://localhost:8000/regions/status

{
  "regions": {
    "us-east-1": {
      "name": "US East 1",
      "status": "healthy",
      "latency_ms": 12.5,
      "rps": 8500
    },
    "eu-west-1": {
      "name": "EU West 1",
      "status": "healthy",
      "latency_ms": 45.2,
      "rps": 1200
    }
  },
  "pairs": [{
    "primary": "us-east-1",
    "secondary": "eu-west-1",
    "strategy": "active_passive",
    "is_failed_over": false
  }]
}
```

---

## Performance Targets Phase 3

| Metric | Target | Details |
|--------|--------|---------|
| JWT Validation Latency | <5ms | Token validation and scope checking |
| Encryption/Decryption | <2ms | Per field |
| Anomaly Detection | <10ms | Full analysis |
| Shadow Model Routing | <1ms | Decision making |
| Multi-Region Failover | <30s | Complete failover + traffic reroute |
| Failback Time | <5min | Once primary recovered |

---

## Security Checklist

- [ ] JWT_SECRET_KEY set to strong value (production use RS256)
- [ ] Encryption master key securely stored (use KMS)
- [ ] Refresh tokens stored securely (HttpOnly cookies)
- [ ] Token revocation list backed by Redis (production)
- [ ] PII fields identified and encrypted
- [ ] Anomaly detection tuned for your traffic pattern
- [ ] Shadow models tested on non-production data first
- [ ] Multi-region replication lag monitored
- [ ] Disaster recovery points tested monthly
- [ ] All sensitive endpoints require HTTPS

---

## Next Steps (Phase 4+)

- Advanced threat intelligence integration
- Federated learning for collaborative security
- Quantum-resistant cryptography
- Advanced fraud ring detection
- Customer-specific ML models

---

**Last Updated**: February 17, 2026  
**Version**: Phase 3.0 (Advanced Security & Reliability)
