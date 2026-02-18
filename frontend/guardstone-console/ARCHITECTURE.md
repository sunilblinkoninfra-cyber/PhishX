# Architecture Documentation - Guardstone Console

## System Overview

Guardstone Console is a modern, enterprise-grade Security Operations Center (SOC) frontend built with Next.js 14, React 19, TypeScript, and Zustand. It provides a role-based interface for managing email security threats across three risk levels (COLD, WARM, HOT).

```
┌─────────────────────────────────────────────────────────┐
│                  Browser / Client                       │
├─────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router, SSR/SSG)                       │
│  React 19 Components                                    │
│  TypeScript Strict Mode                                 │
├─────────────────────────────────────────────────────────┤
│  Presentation Layer                                     │
│  ├─ Pages (Routes)                                      │
│  ├─ Components (Layout, Tables, Forms)                  │
│  └─ Common UI (Badge, Spinner, Modal)                   │
├─────────────────────────────────────────────────────────┤
│  Business Logic Layer                                   │
│  ├─ Zustand Stores (alert, auth, ui)                    │
│  ├─ Custom Hooks (useAlert, useAuth, useRBAC)           │
│  ├─ RBAC Middleware                                     │
│  └─ WebSocket Service                                   │
├─────────────────────────────────────────────────────────┤
│  Data Access Layer                                      │
│  ├─ API Client (typed fetch wrapper)                    │
│  ├─ Export Service (CSV/PDF/JSON)                       │
│  └─ WebSocket Service (real-time events)                │
├─────────────────────────────────────────────────────────┤
│  Utilities & Constants                                  │
│  ├─ Formatters (date, risk, status)                     │
│  ├─ Validators (email, password, URL)                   │
│  ├─ Helper functions                                    │
│  └─ Application constants                               │
├─────────────────────────────────────────────────────────┤
│  Type System                                            │
│  ├─ Entity types (Alert, User, IOC)                     │
│  ├─ Store types                                         │
│  ├─ API types                                           │
│  └─ WebSocket types                                     │
└─────────────────────────────────────────────────────────┘
           ↑↓ WebSocket (Real-time)
           ↑↓ HTTP/REST (Operations)
┌─────────────────────────────────────────────────────────┐
│              Backend API (PhishX)                       │
│  (Separate project, referenced in .env)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Type System Design

### Type Organization

```typescript
// src/types/index.ts - 480 lines, comprehensive coverage

// User & Identity
User {
  id: string
  email: string
  name: string
  role: UserRole (SOC_ANALYST | SOC_ADMIN | AUDITOR)
  createdAt: Date
  lastLogin: Date
}

// Alerts & Risk
Alert {
  metadata: {
    id: string
    timestamp: Date
    sender: string
    recipient: string[]
    subject: string
    hasAttachments: boolean
    classifications: string[]
  }
  riskLevel: RiskLevel (COLD | WARM | HOT)
  riskBreakdown: {
    overallRisk: number    // 0-10
    phishingScore: number
    malwareScore: number
    urlReputation: number
  }
  status: AlertStatus (NEW | INVESTIGATING | CONFIRMED | FALSE_POSITIVE | RESOLVED)
  iocList: IOC[]
  modelExplanation: ModelExplanation
  investigationNotes: string
  auditHistory: AuditEntry[]
}

// Indicators of Compromise
IOC {
  type: IOCType (URL | IP | DOMAIN | EMAIL | FILE_HASH | SENDER_EMAIL)
  value: string
  reputation?: string
  firstSeen?: Date
  lastSeen?: Date
}

// Model Explanation
ModelExplanation {
  version: string
  confidence: number
  topFeatures: Array<{
    name: string
    importance: number
  }>
  explanation: string
}

// Audit Trail
AuditEntry {
  id: string
  timestamp: Date
  userEmail: string
  action: AuditAction (VIEWED | INVESTIGATED | RELEASED | DELETED | EXPORTED | NOTED)
  notes?: string
  changes?: Record<string, any>
}

// API Types
ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

ErrorResponse {
  message: string
  code?: string
  details?: any
}

// Export
ExportRequest {
  alertIds: string[]
  format: 'csv' | 'pdf' | 'json'
  options?: {
    includeAuditHistory?: boolean
    includeIOCs?: boolean
  }
}

ExportResponse {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  estimatedTime?: number
}

// WebSocket
WebSocketEvent {
  type: WebSocketEventType
  payload: any
  timestamp: Date
}

WebSocketEventType =
  | 'ALERT_CREATED'
  | 'ALERT_UPDATED'
  | 'ALERT_STATUS_CHANGED'
  | 'QUARANTINE_ACTION'
  | 'EXPORT_COMPLETED'
  | 'USER_ACTION'
  | 'SYSTEM_EVENT'
  | 'CONNECTION_ESTABLISHED'
```

---

## State Management (Zustand)

### alertStore (src/store/alertStore.ts - 210 lines)

```typescript
interface AlertStoreState {
  // Data
  alerts: Map<string, Alert>
  selectedAlert: Alert | null
  
  // Filters
  filter: AlertFilter
  
  // Pagination
  pagination: {
    page: number
    pageSize: number
    totalAlerts: number
  }
  
  // UI State
  loading: boolean
  error: string | null
  
  // Actions
  fetchAlerts(params: PaginationParams): Promise<void>
  selectAlert(alertId: string): Promise<void>
  updateAlert(alertId: string, updates: Partial<Alert>): void
  changeAlertStatus(alertId: string, status: AlertStatus, notes?: string): Promise<void>
  addNotesToAlert(alertId: string, notes: string): Promise<void>
  queryAlerts(filter: AlertFilter): Promise<void>
  setPage(page: number): void
  setPageSize(size: number): void
  clearError(): void
}

// Data Structure: Map for efficient O(1) lookup by ID
// Store subscribes to WebSocket ALERT_UPDATED events
```

### authStore (src/store/authStore.ts - 100 lines)

```typescript
interface AuthStoreState {
  // Current Session
  user: User | null
  isAuthenticated: boolean
  token: string | null
  
  // UI State
  loading: boolean
  error: string | null
  
  // Actions
  login(email: string, password: string): Promise<void>
  logout(): void
  checkAuth(): Promise<void>
  refreshToken(): Promise<void>
}

// Token Management
// - Stored in localStorage with NEXT_PUBLIC_AUTH_TOKEN_KEY
// - Expires after NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES
// - Auto-refresh on expiry
// - Cleared on logout
```

### uiStore (src/store/uiStore.ts - 50 lines)

```typescript
interface UIStoreState {
  // Navigation
  isSidebarOpen: boolean
  selectedTab: string
  
  // Modals
  modalOpen: boolean
  modalType: string | null
  modalData?: any
  
  // Notifications
  notifications: Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    timestamp: Date
  }>
  
  // Actions
  toggleSidebar(): void
  setTab(tab: string): void
  openModal(type: string, data?: any): void
  closeModal(): void
  addNotification(notification: Notification): void
  removeNotification(id: string): void
}

// Notifications auto-expire based on type:
// - success: 3000ms
// - error: 5000ms
// - info: 3000ms
// - warning: 4000ms
```

### Store Integration Pattern

```typescript
// In components (Client Component)
'use client';
import { alertStore } from '@/store/alertStore';

function MyComponent() {
  // Subscribe to store slices
  const alerts = alertStore((state) => state.alerts);
  const loading = alertStore((state) => state.loading);
  const fetchAlerts = alertStore((state) => state.fetchAlerts);
  
  // Component re-renders only on subscribed slices changing
  // Due to Zustand's shallow equality checks
}
```

---

## Middleware & RBAC

### Role-Based Access Control (src/middleware/rbac.ts - 85 lines)

```typescript
// Three Role Model
type UserRole = 'SOC_ANALYST' | 'SOC_ADMIN' | 'AUDITOR'

// Permission Schema
const ROLE_PERMISSIONS = {
  'SOC_ANALYST': [
    'view:alerts',
    'view:logs',
    'investigate:alerts',
    'add:notes',
    'export:data',
    'view:audit_history'
  ],
  'SOC_ADMIN': [
    // All analyst permissions plus:
    'release:quarantine',
    'delete:alerts',
    'manage:users'
  ],
  'AUDITOR': [
    'view:alerts',
    'view:logs',
    'view:audit_history',
    'export:audit_data',
    'view:compliance_reports'
  ]
}

// Permission Checking Functions
hasPermission(user: User, permission: string): boolean
hasAnyPermission(user: User, permissions: string[]): boolean
hasAllPermissions(user: User, permissions: string[]): boolean

// Role Checking
isAdmin(user: User): boolean
isAnalyst(user: User): boolean
isAuditor(user: User): boolean

// Specific Actions
canInvestigateAlert(user: User): boolean      // requires 'investigate:alerts'
canReleaseQuarantine(user: User): boolean     // requires 'release:quarantine'
canDeleteAlert(user: User): boolean           // requires 'delete:alerts'
canManageUsers(user: User): boolean           // requires 'manage:users'
canExportData(user: User): boolean            // requires 'export:data'
canViewAuditHistory(user: User): boolean      // requires 'view:audit_history'

// Get all available actions for a user
getAvailableActions(user: User): string[]
```

### RBAC Integration Pattern

```typescript
// In components
import { checkPermission } from '@/middleware/rbac';

function AlertActions({ alert, user }: Props) {
  const canRelease = checkPermission(user, 'release:quarantine');
  const canDelete = checkPermission(user, 'delete:alerts');
  
  return (
    <>
      {canRelease && <button onClick={release}>Release</button>}
      {canDelete && <button onClick={delete}>Delete</button>}
    </>
  );
}
```

---

## Services Architecture

### API Client (src/services/apiClient.ts - 380 lines)

```typescript
// Singleton pattern with typed endpoints
class APIClient {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL
  private static readonly DEFAULT_TIMEOUT = 30000
  
  // Generic fetch with timeout and error handling
  private static async fetch<T>(
    endpoint: string,
    options: FetchOptions
  ): Promise<T>
  
  // Endpoint Groups
  static auth = {
    login(email, password): Promise<{ token: string; user: User }>
    logout(): Promise<void>
    refreshToken(): Promise<{ token: string }>
    me(): Promise<User>
    validateToken(): Promise<{ valid: boolean }>
  }
  
  static alerts = {
    list(filter, pagination): Promise<{ alerts: Alert[]; total: number }>
    get(alertId): Promise<Alert>
    update(alertId, updates): Promise<Alert>
    changeStatus(alertId, status, notes?): Promise<Alert>
    addNotes(alertId, notes): Promise<Alert>
    delete(alertId): Promise<void>
    bulkDelete(alertIds): Promise<{ deleted: number }>
    export(alertIds, format): Promise<{ jobId: string }>
  }
  
  static logs = { ... }
  static quarantine = { ... }
  static audit = { ... }
  static metrics = { ... }
  static exports = { ... }
  static users = { ... }
  static health = { ... }
}

// Error Handling
class APIError extends Error {
  constructor(message: string, statusCode: number, details?: any)
}

// Usage Pattern
try {
  const alert = await APIClient.alerts.get(alertId);
  // Strongly typed response
} catch (error) {
  if (error instanceof APIError) {
    // Handle API error with status code
  }
}
```

### WebSocket Service (src/services/websocketService.ts - 165 lines)

```typescript
// Singleton pattern with auto-reconnect
class WebSocketService {
  private socket: WebSocket | null = null
  private url: string
  private token: string | null = null
  private retries = 0
  private maxRetries = 5
  private listeners: Map<string, Set<Function>> = new Map()
  
  // Connection Lifecycle
  connect(token: string): Promise<void>
    // Initiates WebSocket connection
    // Stores token in Authorization header
    // Emits CONNECTION_ESTABLISHED on success
  
  disconnect(): void
    // Gracefully close connection
  
  isConnected(): boolean
    // Check connection status
  
  // Event Management
  on(eventType: string, handler: Function): Function
    // Subscribe to event type
    // Returns unsubscribe function
  
  once(eventType: string, handler: Function): Function
    // Single-use event subscription
  
  subscribeToAlert(alertId: string, handler: Handler): Function
    // Subscribe to alert-specific updates
    // Automatically filters for this alert
  
  send(type: string, payload: any): void
    // Send event to server
  
  // Auto-Reconnect Logic
  // - Exponential backoff: 3000ms * 2^(attempt-1)
  // - Max 5 reconnect attempts
  // - Clears retry count on successful connection
  
  // Error Handling
  // - Try-catch around message parsing
  // - Isolated handler errors (don't break other listeners)
  // - Connection error logging
  
  // Event Types Supported
  type WebSocketEventType =
    | 'ALERT_CREATED'
    | 'ALERT_UPDATED'
    | 'ALERT_STATUS_CHANGED'
    | 'QUARANTINE_ACTION'
    | 'EXPORT_COMPLETED'
    | 'USER_ACTION'
    | 'SYSTEM_EVENT'
    | 'CONNECTION_ESTABLISHED'
}

// Usage Pattern
const ws = websocketService;
await ws.connect(authToken);

// Subscribe to updates
const unsubscribe = ws.on('ALERT_UPDATED', (event) => {
  alertStore.updateAlert(event.payload.id, event.payload);
});

// Alert-specific subscription
ws.subscribeToAlert(alertId, (event) => {
  if (event.type === 'ALERT_STATUS_CHANGED') {
    // Refresh investigation page
  }
});
```

### Export Service (src/services/exportService.ts - 195 lines)

```typescript
class ExportService {
  // Format-Specific Export
  static async exportToCSV(
    alerts: Alert[],
    includeAuditHistory?: boolean,
    includeIOCs?: boolean
  ): Promise<Blob>
    // CSV with headers and proper escaping
    // Optional audit history and IOCs
  
  static async exportToPDF(
    alerts: Alert[],
    includeAuditHistory?: boolean,
    includeIOCs?: boolean
  ): Promise<Blob>
    // Formatted PDF report
    // In production: use pdfkit or jspdf
  
  static async exportToJSON(
    alerts: Alert[]
  ): Promise<Blob>
    // Raw JSON with metadata
  
  // Server-Side Export
  static async submitExportJob(
    request: ExportRequest
  ): Promise<ExportResponse>
    // Submit to backend for processing
    // Returns job ID for status tracking
  
  static async getExportStatus(
    jobId: string
  ): Promise<ExportResponse>
    // Check export job status
    // Get download URL when complete
  
  // Utilities
  static downloadFile(blob: Blob, fileName: string): void
    // Trigger browser download
}

// Usage Pattern
const blob = await ExportService.exportToCSV(alerts);
ExportService.downloadFile(blob, 'alerts.csv');

// Or server-side
const response = await ExportService.submitExportJob({
  alertIds: selected,
  format: 'pdf',
  options: { includeAuditHistory: true }
});
```

---

## Custom Hooks Architecture

### Hook Categories

**Data Fetching Hooks**
```typescript
useAlert(alertId)           // Fetch single alert + subscribe to updates
useAlerts(filter?)          // Fetch alert list with pagination
useFetch<T>(fetchFn)        // Generic async data fetching
```

**State Management Hooks**
```typescript
useAuth()                   // Auth state and operations
useRBAC(user?)              // Permission checking
useUI()                     // UI state (sidebar, modals, notifications)
```

**Form & Input Hooks**
```typescript
useForm<T>(initialValues)   // Form state management
useNotification()           // Toast notifications
```

**Real-Time Hooks**
```typescript
useWebSocket(eventType?)    // WebSocket subscription
```

### Hook Pattern Example

```typescript
export function useAlert(alertId: string) {
  // Subscribe to store
  const selectedAlert = alertStore((state) => state.selectedAlert);
  const selectAlert = alertStore((state) => state.selectAlert);
  
  // Fetch alert on mount
  useEffect(() => {
    selectAlert(alertId);
  }, [alertId, selectAlert]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!selectedAlert) return;
    
    const unsubscribe = websocketService.subscribeToAlert(
      alertId,
      (event) => {
        if (event.type === 'ALERT_UPDATED') {
          alertStore.updateAlert(alertId, event.payload);
        }
      }
    );
    
    return unsubscribe;
  }, [alertId, selectedAlert]);
  
  return {
    alert: selectedAlert,
    // ... other methods
  };
}
```

---

## Canonical Risk Mapping

### Risk Levels

```
COLD Risk (0 - 3.0)
├─ Informational, low-risk
├─ Stored in logs
├─ Route: /logs
├─ Read-only view
└─ For compliance/audit

WARM Risk (3.0 - 7.0)
├─ Suspicious, requires investigation
├─ Active alerts requiring analyst review
├─ Route: /alerts
├─ Full investigation workflow
└─ Status transitions: NEW → INVESTIGATING → CONFIRMED/FALSE_POSITIVE

HOT Risk (7.0 - 10.0)
├─ High confidence threat
├─ Quarantined emails
├─ Route: /quarantine
├─ Immediate action required
└─ Actions: Release or Delete
```

### Risk Calculation

```typescript
// In backend (for reference)
overallRisk = (
  phishingScore * 0.4 +
  malwareScore * 0.3 +
  urlReputation * 0.3
)

if (overallRisk < 3.0) riskLevel = 'COLD'
else if (overallRisk < 7.0) riskLevel = 'WARM'
else riskLevel = 'HOT'

// In frontend: Display and filter based on riskLevel
```

---

## Component Hierarchy

```
Layout
├─ Sidebar
│  ├─ Navigation (COLD/WARM/HOT links)
│  ├─ User Profile
│  └─ Logout
├─ TopBar
│  ├─ Search
│  ├─ Notifications
│  └─ User Menu
└─ MainContent
   ├─ Page Route
   │  ├─ /logs (LogTable, Filter, Export)
   │  ├─ /alerts (AlertTable, Search, Filter)
   │  ├─ /alerts/[id] (DrillDownPage with all details)
   │  ├─ /quarantine (QuarantineTable, Actions)
   │  ├─ /audit (AuditTable, Filters)
   │  └─ /settings (Configuration)
   └─ Common Components
      ├─ RiskBadge
      ├─ StatusBadge
      ├─ Dialog
      ├─ Button
      │  └─ Primary, Secondary, Danger variants
      ├─ Card
      ├─ Input
      ├─ Select
      ├─ Pagination
      └─ ToastContainer

Investigation Page (/alerts/[id])
├─ Alert Header
│  ├─ Sender/Recipients
│  ├─ Subject
│  └─ Timestamp
├─ Risk Breakdown
│  ├─ Overall Risk Score (animation)
│  ├─ Component Scores (phishing, malware, URL rep)
│  └─ Visual Chart
├─ IOC List
│  ├─ URL Analysis
│  ├─ IP Reputation
│  ├─ Domain Analysis
│  └─ File Hashes
├─ Model Explanation
│  ├─ Feature Importance
│  └─ Confidence Level
├─ Investigation Notes
│  └─ Rich Text Editor
├─ Status Workflow
│  ├─ Status Select
│  ├─ Required Notes
│  └─ Submit Button
├─ Audit Trail
│  └─ Timeline of Actions
└─ Related Alerts
   └─ Quick Links to Similar
```

---

## Authentication Flow

```
1. User navigates to app
   ↓
2. Layout calls checkAuth()
   ↓
3. Check localStorage for valid token
   ├─ Token exists and not expired? → Skip login
   └─ No token or expired? → Redirect to /login
   ↓
4. Login page: user enters email/password
   ↓
5. APIClient.auth.login() call
   ↓
6. Backend returns token + user data
   ↓
7. Store in authStore and localStorage
   ├─ Set token in localStorage[AUTH_TOKEN_KEY]
   ├─ Set expiry in localStorage[AUTH_TOKEN_EXPIRY_KEY]
   └─ Set user in authStore
   ↓
8. Redirect to /alerts (default landing)
   ↓
9. All subsequent API calls include token header:
   Authorization: Bearer {token}
   ↓
10. On token expiry:
    ├─ Call refreshToken()
    ├─ Get new token
    └─ Update localStorage and continue
    ↓
11. On logout:
    ├─ Clear localStorage
    ├─ Clear authStore
    ├─ Close WebSocket
    └─ Redirect to /login
```

---

## Data Flow Example: Loading Alert Details

```
1. User clicks alert in list
   ↓
2. Component calls useAlert(alertId)
   ↓
3. useAlert(alertId):
   a. Calls alertStore.selectAlert(alertId)
   b. selectAlert calls APIClient.alerts.get(alertId)
   c. Backend returns full Alert object
   d. Store in alertStore.selectedAlert
   ↓
4. DrillDownPage re-renders with alert data
   ↓
5. useAlert also subscribes to WebSocket:
   websocketService.subscribeToAlert(alertId, handler)
   ↓
6. When backend sends ALERT_UPDATED event:
   a. WebSocket receives event
   b. Triggers subscribed handler
   c. Handler calls alertStore.updateAlert()
   d. Store updates Map<alertId, Alert>
   e. Component re-renders with new data
   ↓
7. User adds investigation notes:
   a. useAlert.addNotes(alertId, notes)
   b. APIClient.alerts.addNotes() POST request
   c. Backend adds AuditEntry to alert
   d. Returns updated Alert
   e. Store updates with new audit entry
   f. Component shows audit trail update
```

---

## Performance Considerations

### State Update Optimization
- Zustand uses shallow equality checks
- Components only re-render if subscribed slice changes
- Map-based alerts for O(1) lookup

### Code Splitting
- Next.js App Router auto-splits at route level
- Dynamic imports for heavy components

### Caching Strategies
- API responses cached in Zustand stores
- WebSocket updates replace cache entries
- localStorage for auth tokens

### Debouncing/Throttling
- Search input: debounced 300ms
- API calls: throttled to prevent spam
- Window resize: throttled for layout

---

## Security Architecture

### Authentication
- JWT tokens with expiry
- Secure localStorage with key namespacing
- Token refresh before expiry
- Logout clears all state

### Authorization
- RBAC middleware enforces permissions
- All operations check user role
- Sensitive actions logged to audit trail

### Input Validation
- Client-side validation before submit
- Server-side validation on API
- XSS prevention through React escaping
- URL validation before external links

### Communication
- HTTPS/WSS in production
- All API requests include auth header
- CSRF token headers in requests
- Content-type validation

---

## Error Handling Strategy

```
┌─ Try WebSocket connection
│  └─ Fail → Retry with exponential backoff
│     └─ Max 5 attempts → Show error notification
│
├─ Try API call
│  ├─ 401 Unauthorized → Refresh token
│  │  └─ Refresh fails → Logout + redirect to login
│  ├─ 403 Forbidden → Show permission error
│  ├─ 404 Not Found → Show alert not found
│  ├─ 5xx Server Error → Show error notification
│  └─ Network timeout → Retry with user option
│
├─ Component error
│  └─ ErrorBoundary catches → Show fallback UI + retry button
│
└─ Form validation error
   └─ Show field-level error messages
```

---

## Configuration Management

```
Environment Variables (from .env.local)
├─ NEXT_PUBLIC_API_URL (API endpoint)
├─ NEXT_PUBLIC_WEBSOCKET_URL (WebSocket endpoint)
├─ NEXT_PUBLIC_AUTH_TOKEN_KEY (localStorage key)
├─ NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES (session duration)
├─ NEXT_PUBLIC_ENABLE_* (feature flags)
└─ NEXT_PUBLIC_ITEMS_PER_PAGE (pagination)

Runtime Constants (from src/lib/constants.ts)
├─ RISK_LEVELS (COLD, WARM, HOT)
├─ ALERT_STATUSES (NEW, INVESTIGATING, etc)
├─ USER_ROLES (SOC_ANALYST, SOC_ADMIN, AUDITOR)
├─ WEBSOCKET_EVENTS (event types)
└─ API_ENDPOINTS (endpoint paths)

Feature Flags
├─ ENABLE_AUDIT_TRAIL (always enabled)
├─ ENABLE_EXPORT (enable/disable export)
├─ ENABLE_REALTIME_UPDATES (WebSocket)
└─ ENABLE_ADVANCED_FILTERING (advanced filters)
```

---

## Deployment Architecture

```
┌──────────────────────────────┐
│   Docker Container           │
├──────────────────────────────┤
│ Node.js Runtime              │
├──────────────────────────────┤
│ Next.js Production Build     │
│ ├─ Static HTML/CSS/JS        │
│ ├─ API Routes (/api/*)       │
│ └─ Image Optimization        │
├──────────────────────────────┤
│ Environment Variables        │
│ ├─ API_URL (backend)         │
│ ├─ WEBSOCKET_URL             │
│ └─ Session Settings          │
├──────────────────────────────┤
│ Nginx Reverse Proxy          │
│ ├─ SSL/TLS Termination       │
│ ├─ Gzip Compression          │
│ └─ Static Asset Caching      │
└──────────────────────────────┘
         ↓ HTTPS ↓
┌──────────────────────────────┐
│   Client Browser             │
│ ├─ Next.js SPA               │
│ ├─ Service Worker (optional) │
│ └─ localStorage (tokens)     │
└──────────────────────────────┘
```

---

## Summary

Guardstone Console uses a modern, layered architecture:

1. **Presentation**: Next.js with React components and Tailwind CSS
2. **Logic**: Zustand stores, custom hooks, RBAC middleware
3. **Data**: Typed API client, WebSocket service, export service
4. **Types**: Comprehensive TypeScript definitions throughout
5. **Utils**: Formatters, validators, constants, helpers

All layers are tightly integrated with:
- **Type Safety**: TypeScript strict mode
- **Real-time Updates**: WebSocket auto-reconnect
- **Security**: RBAC enforcement, token management
- **Error Handling**: Boundaries, retries, user feedback
- **Performance**: Code splitting, debouncing, efficient state

This architecture scales support for enterprise deployments with thousands of alerts and multiple concurrent users.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Architecture Status**: Production Ready
