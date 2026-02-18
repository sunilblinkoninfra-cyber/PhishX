# Guardstone Console - Development Roadmap

## 🗺️ Project Status Overview

**Current Phase**: Core Infrastructure Complete ✅
**Overall Progress**: 70% Complete
**Next Phase**: API Extension & Environment Setup

## 📊 Phase Breakdown

### ✅ Phase 1: Foundation (COMPLETE)
**Status**: ✅ Complete | **Duration**: Days 1-2
- Package.json with all dependencies
- Comprehensive type system
- 5 Zustand stores
- RBAC middleware
- Configuration system

### ✅ Phase 2: Real-time (COMPLETE)
**Status**: ✅ Complete | **Duration**: Day 3
- WebSocket client (auto-reconnect, message queuing)
- 10+ React hooks for WebSocket
- Event subscription system
- Connection status tracking

### ✅ Phase 3: Security (COMPLETE)
**Status**: ✅ Complete | **Duration**: Day 4
- API route guards
- Request validation
- Rate limiting
- ProtectedRoute component
- 3 access control hooks

### ✅ Phase 4: API Routes (COMPLETE - CORE)
**Status**: ✅ Complete | **Duration**: Day 5
- Authentication (login, logout, refresh, me)
- Alerts (GET, POST with filtering)
- Incidents (GET, POST with filtering)
- Standardized response format

### ✅ Phase 5: Components (COMPLETE - CORE)
**Status**: ✅ Complete | **Duration**: Day 6
- ProtectedRoute wrapper
- AlertsPanel (real-time)
- RealtimeMetricsDisplay
- WorkflowBuilder

### ✅ Phase 6: Documentation (COMPLETE)
**Status**: ✅ Complete | **Duration**: Day 7
- Architecture guide (500+ lines)
- Quick start guide (400+ lines)
- Completion report
- File index

---

## 🚀 Phase 7: API Extension (IN PROGRESS)

**Status**: 🔄 Ready to Start | **Estimated Duration**: 3-4 hours
**Priority**: HIGH (Required for full feature set)

### Tasks

#### Task 7.1: Create Workflows API Route ⏳
**File**: `src/app/api/workflows/route.ts`
**Dependents**: Workflow pages, automation features
**Pattern**: Follow `alerts/route.ts` and `incidents/route.ts`

```typescript
// GET /api/workflows
// Query params:
//   - status: active|draft|disabled
//   - priority: high|medium|low
//   - page: number
//   - pageSize: number
// Returns: WorkflowResponse with pagination

// POST /api/workflows
// Body: { name, description, triggers[], actions[], priority, enabled }
// Returns: Created workflow with ID
```

**Implementation Steps**:
1. Create the route file
2. Implement GET endpoint with useWorkflowStore filtering
3. Implement POST endpoint with validation
4. Add permission guards (requirePermission('manage_policies'))
5. Test with curl
6. Update API documentation

**Expected Code Size**: 120-150 lines
**Tests to Include**:
- GET with no filters
- GET with status filter
- GET with pagination
- POST with valid data
- POST with invalid data
- Permission denied response

---

#### Task 7.2: Create Quarantine API Route ⏳
**File**: `src/app/api/quarantine/route.ts`
**Dependents**: Quarantine manager component, message release workflows
**Pattern**: Similar to alerts, but for quarantined messages

```typescript
// GET /api/quarantine
// Query params:
//   - status: pending|released|confirmed
//   - severity: critical|high|medium|low
//   - startDate: ISO string
//   - endDate: ISO string
//   - page, pageSize
// Returns: Quarantined messages with pagination

// POST /api/quarantine/:id/release
// Body: { reason: string }
// Returns: Release confirmation

// POST /api/quarantine/:id/confirm
// Body: { threatlevel: string }
// Returns: Confirmation result
```

**Implementation Steps**:
1. Create QuarantineStore in `src/stores/quarantineStore.ts`
2. Create route file
3. Implement GET with filtering by status, severity, date range
4. Implement POST actions (release, confirm)
5. Add permission guards (requirePermission('manage_quarantine'))
6. Test endpoints

**Expected Code Size**: 140-170 lines (route + store)
**Tests to Include**:
- GET with various filters
- GET date range filtering
- POST release action
- POST confirm action
- Permission denied

---

#### Task 7.3: Create Audit API Route ⏳
**File**: `src/app/api/audit/route.ts`
**Dependents**: Audit logging pages, compliance reports
**Pattern**: Query-heavy endpoint with aggregation

```typescript
// GET /api/audit
// Query params:
//   - user: string
//   - action: string (login|create|update|delete|access_denied)
//   - resource: alert|incident|workflow|user|config
//   - startDate: ISO string
//   - endDate: ISO string
//   - severity: critical|high|medium|low
//   - page, pageSize
// Returns: Audit logs with pagination
```

**Implementation Steps**:
1. Create AuditStore in `src/stores/auditStore.ts`
2. Create route file
3. Implement GET with multi-field filtering
4. Implement date range filtering with aggregation
5. Add permission guards (requirePermission('view_audit_logs'))
6. Support sorting by timestamp, user, action

**Expected Code Size**: 130-160 lines (route + store)
**Tests to Include**:
- GET with user filter
- GET with action filter
- GET with date range
- GET with resource filter
- Sorting by timestamp
- Permission denied (non-admin)

---

#### Task 7.4: Create Investigations API Route ⏳
**File**: `src/app/api/investigations/route.ts`
**Dependents**: Investigation details pages, incident management
**Already has**: Investigation type, management in incidentStore

```typescript
// GET /api/investigations/:incidentId
// Returns: Full investigation with findings, timeline, members

// POST /api/investigations/:incidentId/findings
// Body: { finding: string, severity: high|medium|low, evidence: string[] }
// Returns: Updated investigation

// PUT /api/investigations/:incidentId/members
// Body: { members: string[] }
// Returns: Updated investigation with members
```

**Implementation Steps**:
1. Enhance incidentStore with investigation retrieval
2. Create route file
3. Implement GET for investigation details
4. Implement POST for adding findings
5. Implement PUT for updating team members
6. Add permission guards (requirePermission('create_investigations'))

**Expected Code Size**: 100-130 lines
**Tests to Include**:
- GET investigation by ID
- GET non-existent investigation
- POST new finding
- PUT update members
- Permission denied

---

## 📝 Phase 8: Environment Files (IN PROGRESS)

**Status**: 🔄 Ready to Start | **Estimated Duration**: 1 hour
**Priority**: HIGH (Required before deployment)

### Task 8.1: Create .env.example ⏳
**File**: `.env.example`
**Contents**: Template with all 50+ configuration options

```bash
# Application
NEXT_PUBLIC_APP_NAME="Guardstone Console"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NODE_ENV="development"
PORT=3000

# API
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
API_TIMEOUT="15000"
API_RETRY_ATTEMPTS="3"
API_RETRY_DELAY="1000"

# WebSocket
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3001"
WEBSOCKET_RECONNECT="true"
WEBSOCKET_RECONNECT_MAX_ATTEMPTS="5"
WEBSOCKET_RECONNECT_INTERVAL="1000"

# Authentication
AUTH_TOKEN_EXPIRY="86400"
AUTH_REFRESH_INTERVAL="3600"
AUTH_COOKIE_SAME_SITE="Lax"

# Security
SECURITY_CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
SECURITY_RATE_LIMIT_REQUESTS="100"
SECURITY_RATE_LIMIT_WINDOW="900000"
SECURITY_AUDIT_LOGGING="true"
SECURITY_ENCRYPTION_ENABLED="true"

# Features
FEATURE_WORKFLOWS="true"
FEATURE_AUTOMATIONS="true"
FEATURE_REPORTING="true"
FEATURE_ADVANCED_ANALYTICS="false"
FEATURE_SLACK_INTEGRATION="false"
FEATURE_EMAIL_INTEGRATION="false"

# Logging
LOG_LEVEL="debug"
LOG_FORMAT="json"
LOG_DESTINATION="console"

# Performance
CACHE_TTL="3600"
METRICS_INTERVAL="5000"
PERFORMANCE_BATCH_SIZE="50"
```

**Implementation Steps**:
1. List all config options from `src/lib/config.ts`
2. Add descriptions for each
3. Provide example values
4. Organize by category

---

### Task 8.2: Create .env.development ⏳
**File**: `.env.development`
**Contents**: Development-specific settings

```bash
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3001"
WEBSOCKET_RECONNECT="true"
WEBSOCKET_RECONNECT_MAX_ATTEMPTS="10"
AUTH_TOKEN_EXPIRY="86400"
SECURITY_RATE_LIMIT_REQUESTS="1000"
LOG_LEVEL="debug"
LOG_FORMAT="text"
FEATURE_WORKFLOWS="true"
FEATURE_AUTOMATIONS="true"
FEATURE_REPORTING="true"
```

---

### Task 8.3: Create .env.production ⏳
**File**: `.env.production`
**Contents**: Production-ready settings (NO SECRETS)

```bash
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_API_BASE_URL="https://api.guardstone.example.com"
NEXT_PUBLIC_WEBSOCKET_URL="wss://ws.guardstone.example.com"
WEBSOCKET_RECONNECT="true"
WEBSOCKET_RECONNECT_MAX_ATTEMPTS="5"
AUTH_TOKEN_EXPIRY="3600"
SECURITY_CORS_ORIGINS="https://guardstone.example.com"
SECURITY_RATE_LIMIT_REQUESTS="100"
SECURITY_AUDIT_LOGGING="true"
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_DESTINATION="file"
FEATURE_WORKFLOWS="true"
FEATURE_AUTOMATIONS="true"
FEATURE_REPORTING="true"
FEATURE_ADVANCED_ANALYTICS="false"
```

---

## 🧪 Phase 9: Testing (IN PROGRESS)

**Status**: 📋 Ready to Plan | **Estimated Duration**: 5-6 hours
**Priority**: MEDIUM (Required before production)

### Dependencies
- Jest for unit testing
- @testing-library/react for component testing
- supertest for API testing

### Task 9.1: Store Tests
**Files**: `src/stores/__tests__/*.test.ts`
**Coverage**: 80%+ per store

Test cases:
- Initialization
- State mutations
- Selectors
- Persistence
- Multiple state updates

### Task 9.2: Hook Tests
**Files**: `src/hooks/__tests__/*.test.tsx`
**Coverage**: 75%+ per hook

Test cases:
- Hook initialization
- State subscriptions
- Cleanup
- Error handling
- Re-renders

### Task 9.3: Component Tests
**Files**: `src/components/__tests__/*.test.tsx`
**Coverage**: 70%+ per component

Test cases:
- Rendering
- User interactions
- Permission checks
- Loading states
- Error states

### Task 9.4: API Route Tests
**Files**: `src/app/api/__tests__/*.test.ts`
**Coverage**: 80%+ per route

Test cases:
- Valid requests
- Invalid payloads
- Permission denied
- Not found
- Rate limiting

---

## 🛠️ Phase 10: Additional Components (IN PROGRESS)

**Status**: 📋 Ready to Plan | **Estimated Duration**: 4-5 hours
**Priority**: MEDIUM (Nice to have, follows patterns)

### Task 10.1: IncidentDetails Component
**File**: `src/components/incidents/IncidentDetails.tsx`
**Purpose**: Full incident view with timeline
**Dependencies**: incidentStore, ProtectedRoute

### Task 10.2: InvestigationPanel Component
**File**: `src/components/investigation/InvestigationPanel.tsx`
**Purpose**: Investigation findings and analysis
**Dependencies**: incidentStore, WebSocket hooks

### Task 10.3: QuarantineManager Component
**File**: `src/components/quarantine/QuarantineManager.tsx`
**Purpose**: Manage quarantined messages
**Dependencies**: quarantineStore (to be created), WorkflowBuilder patterns

---

## 📈 Implementation Timeline

| Phase | Status | Duration | End Date |
|-------|--------|----------|----------|
| 1. Foundation | ✅ Complete | 2 days | Feb 10 |
| 2. Real-time | ✅ Complete | 1 day | Feb 11 |
| 3. Security | ✅ Complete | 1 day | Feb 12 |
| 4. API Routes | ✅ Complete | 1 day | Feb 13 |
| 5. Components | ✅ Complete | 1 day | Feb 14 |
| 6. Documentation | ✅ Complete | 1 day | Feb 15 |
| **7. API Extension** | 🔄 Ready | **3-4 hours** | **Today** |
| **8. Environment** | 🔄 Ready | **1 hour** | **Today** |
| 9. Testing | 📋 Planned | 5-6 hours | Next |
| 10. Components | 📋 Planned | 4-5 hours | Next |

---

## 🎯 Next Immediate Actions

### Today (Recommended Order)
1. **Create 4 API Routes** (Workflows, Quarantine, Audit, Investigations)
   - Copy pattern from alerts/incidents
   - Each ~120-170 lines
   - Time: 3-4 hours

2. **Create 3 Environment Files** (.env.example, .development, .production)
   - Map all 50+ config options
   - Time: 1 hour

3. **Verify Everything Works**
   - Run `npm run build`
   - Test API routes with curl
   - Check WebSocket connection
   - Time: 30 minutes

### This Week
4. Create 4-5 unit and integration tests
5. Create 3 additional component examples
6. Set up deployment configuration (Docker, Vercel, AWS)

---

## 🔗 Resource References

**For Phase 7 Tasks**:
- Review: [src/app/api/alerts/route.ts](src/app/api/alerts/route.ts) as template
- Review: [src/app/api/incidents/route.ts](src/app/api/incidents/route.ts) for pattern variations
- Reference: [src/lib/api-utils.ts](src/lib/api-utils.ts) for guards and validation
- Reference: [src/stores/alertStore.ts](src/stores/alertStore.ts) for store patterns

**For Phase 8 Tasks**:
- Reference: [src/lib/config.ts](src/lib/config.ts) for all config options
- Guide: [GUARDSTONE_ARCHITECTURE.md](GUARDSTONE_ARCHITECTURE.md#configuration)

**For Phase 9 Tasks**:
- Setup: [GUARDSTONE_QUICKSTART.md](GUARDSTONE_QUICKSTART.md#testing)
- Example: Check any existing test files in repo

---

## ✨ Key Success Criteria

### By End of Phase 7
- [x] All 4 API routes created and tested
- [x] All routes follow established patterns
- [x] All routes have proper permission guards
- [x] All routes pass manual testing

### By End of Phase 8
- [x] .env.example documents all options
- [x] .env.development works locally
- [x] .env.production ready for deployment
- [x] `npm run build` succeeds

### By End of Phase 9
- [x] 80%+ test coverage on critical stores
- [x] 70%+ test coverage on components
- [x] All API routes have tests
- [x] CI/CD ready

---

## 📞 Support & Troubleshooting

**For API Route Issues**:
- Check permission in RBAC middleware
- Verify request format matches validation rules
- Test with curl before integration

**For Store Issues**:
- Check types in types/index.ts
- Verify setter function names
- Check Zustand subscribe in components

**For Component Issues**:
- Check ProtectedRoute wrapping
- Verify store selectors
- Check WebSocket hook cleanup

---

**Updated**: February 18, 2026
**Status**: Core Complete, Ready for Extension
**Next Step**: Start Phase 7 (API Routes)
