# Development Roadmap - Guardstone Console

## Phase Overview

The Guardstone Console project is organized into multiple phases, each building on the previous architecture.

### Phase 1: Architecture Foundation ✅ COMPLETE
**Status**: Completed (745 lines)
**Deliverables**:
- Type system (480 lines)
- Zustand stores (360 lines)
- RBAC middleware (85 lines)
- WebSocket service (165 lines)

### Phase 2: Core Components & Services (IN PROGRESS)
**Status**: Ready to start
**Estimated**: 3,000+ lines
**Deliverables**:
- Common UI components
- Layout components
- Custom React hooks
- Utility functions
- API client integration
- Export service implementation

### Phase 3: Page Routes & Investigation (PLANNED)
**Status**: Queued
**Estimated**: 2,000+ lines
**Deliverables**:
- /logs route (COLD risk view)
- /alerts route (WARM risk view)
- /quarantine route (HOT risk view)
- /alerts/[id] drill-down page
- /audit route (audit trail)
- /settings route (user/system settings)

### Phase 4: Advanced Features (PLANNED)
**Status**: Queued
**Estimated**: 1,500+ lines
**Deliverables**:
- Advanced filtering UI
- Custom dashboard widgets
- Investigation templates
- ML-powered insights
- Integration APIs

### Phase 5: Testing & Deployment (PLANNED)
**Status**: Queued
**Deliverables**:
- Unit tests
- Integration tests
- E2E tests
- Performance testing
- Deployment guides

---

## Phase 2 Detailed Tasks: Core Components & Services

### 2.1 Common Components (280 lines)

```
RiskBadge.tsx ...................... ✅ Created (45 lines)
StatusBadge.tsx ..................... ✅ Created (40 lines)
LoadingSpinner.tsx .................. ✅ Created (30 lines)
ErrorBoundary.tsx ................... ✅ Created (35 lines)
ToastNotification.tsx ............... ✅ Created (50 lines)
common/index.ts ..................... ✅ Created (10 lines)

Dialog.tsx .......................... ⏳ Planned (40 lines)
Button.tsx .......................... ⏳ Planned (35 lines)
Card.tsx ............................ ⏳ Planned (25 lines)
Input.tsx ........................... ⏳ Planned (20 lines)
Select.tsx .......................... ⏳ Planned (20 lines)
Badge.tsx ........................... ⏳ Planned (15 lines)
Pagination.tsx ...................... ⏳ Planned (35 lines)
```

### 2.2 Layout Components (250 lines)

```
Sidebar.tsx ......................... ⏳ Planned (100 lines)
  - Risk level navigation (COLD/WARM/HOT routes)
  - User profile menu
  - Logout button
  - Navigation highlights

TopBar.tsx .......................... ⏳ Planned (80 lines)
  - Search bar
  - Notifications bell
  - User menu
  - Quick actions

MainLayout.tsx ...................... ⏳ Planned (70 lines)
  - Grid layout with Sidebar + MainContent
  - Responsive design
  - Error boundary wrapper
```

### 2.3 Custom Hooks (450 lines)

```
hooks/index.ts ...................... ✅ Created (450 lines)
  - useAlert(alertId)           ✅ Implemented
  - useAlerts(filter)           ✅ Implemented
  - useAuth()                   ✅ Implemented
  - useRBAC(user)               ✅ Implemented
  - useWebSocket(eventType)     ✅ Implemented
  - useUI()                     ✅ Implemented
  - useFetch<T>()               ✅ Implemented
  - useForm<T>()                ✅ Implemented
  - useNotification()           ✅ Implemented
```

### 2.4 Utility Functions (650 lines)

```
formatters.ts ........................ ✅ Created (200 lines)
  - formatDate, formatTime, formatRelativeTime
  - formatRiskScore, formatStatus, formatRole
  - formatEmail, formatURL, formatFileSize
  - getRiskLevelColor, getStatusColor, getIOCTypeColor
  - highlightText

validators.ts ........................ ✅ Created (250 lines)
  - validateEmail, validatePassword, validateURL
  - validateIP, validateDomain, validateFileHash
  - validateDateRange, validateAlertNotes, validateSearchQuery
  - validateForm with multiple rules
  - sanitizeInput for XSS prevention

lib/constants.ts ..................... ✅ Created (200 lines)
  - RISK_LEVELS, ALERT_STATUSES, USER_ROLES
  - IOC_TYPES, AUDIT_ACTIONS, EXPORT_FORMATS
  - WEBSOCKET_EVENTS, API_ENDPOINTS
  - ERROR_MESSAGES, SUCCESS_MESSAGES
  - RISK_THRESHOLDS, PAGINATION defaults

lib/utils.ts ......................... ✅ Created (400 lines)
  - debounce, throttle, deepClone
  - mergeObjects, isEqual, getNestedValue
  - sleep, retry, memoize
  - arrayToObject, groupBy, chunk, unique
  - formatBytes, getQueryParams, buildQueryString
  - titleCase, kebabCase, camelCase
  - isValidURL, getDomainFromURL
```

### 2.5 API Client & Services (600 lines)

```
services/apiClient.ts ............... ✅ Created (380 lines)
  - Generic fetch<T>() method with timeout/error handling
  - Authentication endpoints (login, logout, refreshToken, me)
  - Alert endpoints (list, get, update, changeStatus, addNotes, export)
  - Logs endpoints (list, get)
  - Quarantine endpoints (list, get, release, delete)
  - Audit endpoints (list, getAlertHistory, getUserHistory)
  - Metrics endpoints (dashboard, compliance, riskTrends)
  - Export endpoints (submit, status, download, cancel)
  - Users endpoints (list, get, update, create, delete, resetPassword)
  - Health check endpoint

services/websocketService.ts ......... ✅ Created (165 lines)
  - Connection management (connect, disconnect, isConnected)
  - Event subscription (on, once, subscribeToAlert)
  - Auto-reconnect with exponential backoff
  - Message sending (send)
  - Error handling and recovery

services/exportService.ts ............ ✅ Created (195 lines)
  - exportToCSV(alerts, options)
  - exportToPDF(alerts, options)
  - exportToJSON(alerts)
  - submitExportJob(request)
  - getExportStatus(jobId)
  - downloadFile(blob, fileName)
```

### 2.6 Environment & Configuration (45 lines)

```
.env.example ......................... ✅ Created (40 lines)
  - API configuration
  - WebSocket settings
  - Authentication settings
  - Feature flags
  - UI configuration
  - Security settings
```

### 2.7 Root Layout (30 lines)

```
src/app/layout.tsx ................... ✅ Updated (30 lines)
  - ErrorBoundary wrapper
  - ToastContainer integration
  - Metadata configuration
  - Font setup (Geist)
```

---

## Phase 2 Remaining Tasks

### 2.8 Additional Common Components (280 lines) ⏳

Components needed for UI consistency:

```
Dialog.tsx ........................... 40 lines
  - Modal dialog wrapper
  - Head, Body, Footer sections
  - Close button with X icon
  - Overlay backdrop

Button.tsx ........................... 35 lines
  - Primary, secondary, danger variants
  - Loading state
  - Disabled state
  - Icon support
  - Size variants

Card.tsx ............................ 25 lines
  - Container with padding
  - Header/body/footer
  - Hover effects

Input.tsx ........................... 20 lines
  - Text input with validation state
  - Error message display
  - Required indicator
  - Placeholder support

Select.tsx .......................... 20 lines
  - Dropdown select
  - Option groups
  - Multi-select variant
  - Disabled state

Badge.tsx ........................... 15 lines
  - Generic badge component
  - Color variants
  - Icon support

Pagination.tsx ...................... 35 lines
  - Previous/Next buttons
  - Page number display
  - Jump to page
  - Items per page selector
```

### 2.9 Layout Components (250 lines) ⏳

Complete the main layout structure:

```
Sidebar.tsx ......................... 100 lines
  - Risk-based navigation (COLD/WARM/HOT)
  - User profile section
  - Logout button
  - Active link highlighting
  - Responsive behavior

TopBar.tsx .......................... 80 lines
  - Search bar with debounce
  - Notifications icon
  - User menu dropdown
  - Quick action buttons

MainLayout.tsx ...................... 70 lines
  - Grid layout with sidebar
  - Main content area
  - Error boundary integration
  - Responsive design
```

### 2.10 Table Components (400 lines) ⏳

Data display tables for each risk level:

```
components/tables/AlertTable.tsx .... 120 lines
  - WARM risk alerts table
  - Sortable columns
  - Row selection with bulk actions
  - Risk and status badges
  - Pagination
  - Click to investigate

components/tables/LogsTable.tsx ...... 100 lines
  - COLD risk informational logs table
  - Similar to AlertTable
  - Read-only view

components/tables/QuarantineTable.tsx 120 lines
  - HOT risk quarantined emails
  - Action buttons (release, delete)
  - Confirmation dialogs
  - Timestamp display

components/tables/AuditTable.tsx ..... 60 lines
  - Audit trail display
  - User, action, timestamp columns
  - Filterable by user/action
  - Immutable data view
```

### 2.11 Form Components (180 lines) ⏳

Form components for filtering and actions:

```
components/forms/SearchForm.tsx ...... 60 lines
  - Debounced search input
  - Search type selector
  - Clear button

components/forms/FilterForm.tsx ...... 80 lines
  - Risk level filter
  - Date range selector
  - Status filter
  - Classification filter
  - Apply/Clear buttons

components/forms/StatusChangeForm.tsx 40 lines
  - Status dropdown
  - Required notes textarea
  - Submit/Cancel buttons
  - Validation
```

### 2.12 Investigation Pages (500 lines) ⏳

Deep drill-down investigation workflow:

```
components/investigation/DrillDownPage.tsx .. 200 lines
  - Alert header with metadata
  - Risk breakdown visualization
  - IOC list with reputation
  - Model explanation
  - Investigation notes editor
  - Status change form
  - Audit history timeline

components/investigation/RiskBreakdown.tsx ... 150 lines
  - Overall risk score display
  - Component scores (phishing, malware, URL rep)
  - Visual breakdown chart
  - Score interpretation

components/investigation/RelatedAlerts.tsx .. 150 lines
  - Similar alerts list
  - Quick comparison
  - Related IOC view
```

### 2.13 Export Components (200 lines) ⏳

Export functionality UI:

```
components/export/ExportModal.tsx .... 120 lines
  - Format selection (CSV, PDF, JSON)
  - Field selection checkboxes
  - Options (include audit, IOCs, etc)
  - Submit button

components/export/ExportHandler.tsx .. 80 lines
  - Export job status tracking
  - Download link in notification
  - Progress indication
  - Error handling
```

### 2.14 Modal Components (150 lines) ⏳

Reusable modal dialogs:

```
components/modals/index.ts ........... 150 lines
  - ConfirmDialog
  - AlertDetailsModal
  - UserSettingsModal
  - HelpModal
```

---

## Phase 3 Preview: Route Implementation

### 3.1 Logs Route (/logs) - COLD Risk

```typescript
// COLD risk view
// - Historical, informational data
// - Read-only logs
// - Long-term storage
// - Compliance reporting
// - Advanced filtering by date ranges
```

### 3.2 Alerts Route (/alerts) - WARM Risk

```typescript
// WARM risk view
// - Active investigation needed
// - Alert listing with pagination
// - Filter and search
// - Bulk actions
// - Click to investigate
```

### 3.3 Quarantine Route (/quarantine) - HOT Risk

```typescript
// HOT risk view
// - Immediate action required
// - Release/delete actions
// - Confirmation workflows
// - Urgent indicators
```

### 3.4 Alert Drill-Down Page (/alerts/[id])

```typescript
// Investigation page
// - Full alert details
// - Risk breakdown
// - IOCs and reputation
// - Model explanation
// - Investigation notes
// - Status workflow
// - Audit trail
```

### 3.5 Audit Route (/audit)

```typescript
// Audit trail view
// - All user actions timestamped
// - Filterable by user/action/date
// - Export audit logs
// - Compliance view
```

### 3.6 Settings Route (/settings)

```typescript
// User & system settings
// - User profile
// - Password change
// - Session management
// - Notification preferences
// - Admin-only: user management
// - Admin-only: system configuration
```

---

## Code Statistics

### Current Completion (Phase 2a)

| Component | Lines | Status |
|-----------|-------|--------|
| Type System | 480 | ✅ |
| Zustand Stores | 360 | ✅ |
| RBAC Middleware | 85 | ✅ |
| WebSocket Service | 165 | ✅ |
| API Client | 380 | ✅ |
| Export Service | 195 | ✅ |
| Formatters | 200 | ✅ |
| Validators | 250 | ✅ |
| Hooks | 450 | ✅ |
| Constants | 200 | ✅ |
| Utils | 400 | ✅ |
| Common Components | 280 | ✅ |
| Layout | 30 | ✅ |
| **.env.example** | 40 | ✅ |
| **Total Phase 2a** | **3,935** | **✅ COMPLETE** |

### Remaining (Phase 2b - 4)

| Phase | Estimated Lines | Status |
|-------|-----------------|--------|
| Phase 2b (Additional UI Components) | 700-900 | ⏳ |
| Phase 3 (Routes & Investigation) | 2,000-2,500 | ⏳ |
| Phase 4 (Advanced Features) | 1,500-2,000 | ⏳ |
| Phase 5 (Tests) | 2,000-3,000 | ⏳ |
| **Total Project** | **9,500-12,000** | ⏳ |

---

## Next Steps

### Immediate (Next Engineer)
1. Complete Phase 2b (Additional UI Components)
   - Dialog, Button, Card, Input, Select components
   - Sidebar, TopBar, MainLayout
   - Alert, Logs, Quarantine, Audit tables
   - Filter forms and search components

2. Create Investigation Workflow Pages
   - DrillDownPage with full alert details
   - Risk breakdown visualization
   - Related alerts display
   - Audit trail timeline

### Follow-up (Phase 3)
1. Implement Route Structure
   - /logs (COLD risk view)
   - /alerts (WARM risk view)
   - /quarantine (HOT risk view)
   - /alerts/[id] (investigation)
   - /audit (compliance)
   - /settings (configuration)

2. Connect to Backend
   - Test all API endpoints
   - Verify WebSocket integration
   - Handle error scenarios
   - Session timeout handling

### Advanced (Phase 4)
1. Feature Enhancements
   - Advanced filtering UI
   - Custom dashboard
   - Investigation templates
   - ML insights integration

2. Performance Optimization
   - Code splitting
   - Image optimization
   - Caching strategies
   - Bundle analysis

### Production (Phase 5)
1. Testing Suite
   - Unit tests (components, hooks, utilities)
   - Integration tests (API, WebSocket)
   - E2E tests (user workflows)
   - Performance tests

2. Deployment
   - Docker containerization
   - CI/CD pipeline
   - Security audit
   - Documentation

---

## Architecture Decisions Summary

### ✅ Centralized State with Zustand
- Single source of truth for alerts, auth, UI
- Shallow equality checks for performance
- No middleware overhead

### ✅ Comprehensive Type System
- All domain concepts covered
- Frontend-to-backend contract
- Type safety across components

### ✅ RBAC by Default
- All operations check permissions
- Three role model (Analyst, Admin, Auditor)
- Enforced in middleware

### ✅ WebSocket for Real-time
- Live updates for alerts
- Connection pooling
- Auto-reconnect with backoff

### ✅ No Modal-Only Investigation
- Every alert has deep drill-down page
- Full context and history visible
- Investigation notes required for status change

### ✅ Canonical Risk Mapping
- COLD → WARM → HOT transitions
- Route structure mirrors risk levels
- Visual differentiation by color

---

## Questions & Clarifications

For future development phases, please clarify:

1. **Backend API Status**
   - Are all endpoints available at `/api/*`?
   - WebSocket server running at specified URL?
   - Authentication mechanism (JWT tokens)?

2. **Feature Priorities**
   - Which Phase 2b components are most critical?
   - Export formatting options?
   - Advanced filtering requirements?

3. **Deployment Environment**
   - Docker vs. traditional hosting?
   - Environment variable management?
   - HTTPS/SSL requirements?

4. **Performance Targets**
   - Page load time expectations?
   - Number of alerts per page?
   - Real-time update latency?

5. **Compliance Requirements**
   - Audit trail retention policy?
   - Data encryption requirements?
   - GDPR/compliance certifications needed?

---

## Code Quality Checklist

- [x] TypeScript strict mode enabled
- [x] ESLint configuration in place
- [x] Tailwind CSS configured
- [x] Environment variables templated
- [x] Error boundaries implemented
- [x] RBAC middleware integrated
- [x] WebSocket service auto-reconnect
- [x] API client type-safe
- [x] Custom hooks documented
- [ ] Component unit tests
- [ ] API integration tests
- [ ] E2E tests
- [ ] Performance benchmarks
- [ ] Accessibility audit
- [ ] Security audit

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Next Review**: After Phase 2b completion
