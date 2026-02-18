# Guardstone Console - Enterprise SOC Command Console

A Next.js 14 enterprise Security Operations Center (SOC) command console for PhishX with TypeScript, Zustand state management, real-time WebSocket capabilities, RBAC enforcement, and security operations workflows.

## 🏗️ Architecture Overview

### Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **State Management**: Zustand 4.4.5
- **Real-time Communication**: WebSocket (ws)
- **Security**: JWT, bcryptjs, crypto-js
- **API Client**: Axios
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI, Tailwind CSS
- **Charting**: Recharts
- **Utilities**: date-fns, lodash, uuid

### Project Structure

```
src/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── alerts/              # Alert endpoints
│   │   ├── incidents/           # Incident endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── workflows/           # Workflow endpoints
│   │   └── ...                  # Other API routes
│   ├── dashboard/               # Dashboard pages
│   ├── alerts/                  # Alerts management pages
│   ├── incidents/               # Incidents management pages
│   ├── workflows/               # Workflows pages
│   └── ...                      # Other pages
│
├── components/                   # React components
│   ├── ProtectedRoute.tsx       # RBAC protected components
│   ├── AlertsPanel.tsx          # Real-time alerts display
│   ├── RealtimeMetricsDisplay.tsx # Live metrics
│   ├── WorkflowBuilder.tsx      # Workflow creation
│   └── ...                      # Other components
│
├── hooks/                        # Custom React hooks
│   └── useWebSocket.ts          # WebSocket integration hooks
│
├── lib/                          # Utility libraries
│   ├── websocket.ts             # WebSocket client
│   ├── config.ts                # Configuration management
│   ├── api-utils.ts             # API helpers & guards
│   └── ...                      # Other utilities
│
├── middleware/                   # Middleware
│   └── rbac.ts                  # Role-Based Access Control
│
├── stores/                       # Zustand stores
│   ├── authStore.ts             # Authentication & RBAC
│   ├── alertStore.ts            # Alert management
│   ├── incidentStore.ts         # Incident management
│   ├── workflowStore.ts         # Workflow automation
│   ├── realtimeStore.ts         # Real-time metrics
│   └── index.ts                 # Store exports
│
└── types/                        # TypeScript definitions
    └── index.ts                 # Type definitions
```

## 🔐 RBAC (Role-Based Access Control)

### User Roles

1. **ADMIN** - Full system access
   - All permissions across all modules
   - User and role management
   - System configuration

2. **SOC_MANAGER** - Team leadership
   - Alert and incident management
   - Policy and template management
   - Audit and analytics access

3. **SOC_ANALYST** - Day-to-day operations
   - View and investigate alerts
   - Create and manage incidents
   - Investigation and quarantine actions

4. **AUDITOR** - Compliance and reporting
   - Read-only alert and incident access
   - Audit log viewing
   - Report generation

5. **API** - Service integration
   - Limited API permissions
   - Alert creation
   - Data retrieval

6. **VIEWER** - Stakeholder viewing
   - Alert and incident viewing only
   - No action permissions

### Permissions

```typescript
export enum Permission {
  // Alert Management
  VIEW_ALERTS,
  CREATE_ALERT,
  UPDATE_ALERT,
  DELETE_ALERT,
  ACKNOWLEDGE_ALERT,
  ESCALATE_ALERT,

  // Incident Management
  VIEW_INCIDENTS,
  CREATE_INCIDENT,
  UPDATE_INCIDENT,
  CLOSE_INCIDENT,
  ASSIGN_INCIDENT,

  // Investigation
  VIEW_INVESTIGATION,
  START_INVESTIGATION,
  COMMENT_INVESTIGATION,

  // Quarantine
  VIEW_QUARANTINE,
  RESTORE_MESSAGE,
  DELETE_MESSAGE,

  // Audit
  VIEW_AUDIT_LOGS,
  EXPORT_AUDIT,

  // Configuration
  MANAGE_USERS,
  MANAGE_ROLES,
  MANAGE_POLICIES,
  MANAGE_TEMPLATES,

  // System
  SYSTEM_SETTINGS,
  VIEW_ANALYTICS,
  EXPORT_DATA,
}
```

### Using RBAC in Components

```typescript
import { ProtectedRoute, useHasPermission, useHasRole } from '@/components/ProtectedRoute';
import { Permission, UserRole } from '@/types';

// Protect entire routes
<ProtectedRoute requiredPermissions={Permission.VIEW_ALERTS}>
  <AlertsDashboard />
</ProtectedRoute>

// Check permissions in component
function MyComponent() {
  const canViewAlerts = useHasPermission(Permission.VIEW_ALERTS);
  const isManager = useHasRole([UserRole.SOC_MANAGER]);
  
  if (!canViewAlerts) return <AccessDenied />;
  
  return <AlertsList />;
}

// In API routes
export const GET = withPermission(Permission.VIEW_ALERTS, async (request, user) => {
  // Only allows users with VIEW_ALERTS permission
});
```

## 🔄 Real-time WebSocket

### Features

- **Auto-reconnection** with exponential backoff
- **Message queuing** while disconnected
- **Type-safe messages** with TypeScript
- **Subscribable events** for any message type
- **Connection status** tracking

### Usage

```typescript
import { 
  useWebSocketConnection,
  useRealtimeAlerts,
  useWebSocketConnectionStatus,
  useWebSocketMessage
} from '@/hooks/useWebSocket';

// Initialize connection
function App() {
  const { isConnected, error } = useWebSocketConnection({
    url: process.env.NEXT_PUBLIC_WS_URL!,
    token: authToken,
    reconnect: true,
  });

  return <>{/* app content */}</>;
}

// Subscribe to alerts
function AlertsComponent() {
  useRealtimeAlerts((message) => {
    console.log('New alert:', message.payload);
  });

  // Or subscribe to specific message type
  useWebSocketMessage('alert:new', (message) => {
    // Handle new alert
  });

  return <>{/* component */}</>;
}

// Check connection status
function ConnectionStatus() {
  const isConnected = useWebSocketConnectionStatus();
  return <div>{isConnected ? 'Connected' : 'Disconnected'}</div>;
}
```

### Message Types

```typescript
type WebSocketMessageType =
  | 'alert:new'
  | 'alert:updated'
  | 'alert:status_changed'
  | 'incident:created'
  | 'incident:updated'
  | 'incident:closed'
  | 'event:received'
  | 'workflow:executed'
  | 'workflow:failed'
  | 'message:broadcast'
  | 'metrics:update'
  | 'auth:required'
  | 'health:check'
  | 'user:action';
```

## 📊 State Management

### Zustand Stores

#### Authentication Store
```typescript
import { useAuthStore } from '@/stores';

const { user, isAuthenticated, permissions, login, logout } = useAuthStore();
```

#### Alert Store
```typescript
const { 
  alerts, 
  selectedAlert, 
  setAlerts, 
  addAlert, 
  updateAlert,
  changeAlertStatus,
  acknowledgeAlert,
  escalateAlert
} = useAlertStore();
```

#### Incident Store
```typescript
const { 
  incidents, 
  selectedIncident, 
  addIncident, 
  updateIncident,
  changeIncidentStatus,
  assignIncident,
  addResponder,
  closeIncident
} = useIncidentStore();
```

#### Workflow Store
```typescript
const { 
  workflows, 
  executions,
  addWorkflow,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getExecutionHistory,
  getExecutionStats
} = useWorkflowStore();
```

#### Realtime Store
```typescript
const { 
  metrics, 
  isConnected, 
  systemHealth,
  updateMetrics,
  setConnected,
  setSystemHealth
} = useRealtimeStore();
```

## 🚀 API Routes

### Authentication
```
POST /api/auth/login        - User login
POST /api/auth/logout       - User logout
POST /api/auth/refresh      - Refresh token
GET  /api/auth/me          - Get current user
```

### Alerts
```
GET  /api/alerts           - List alerts (with filtering, pagination)
POST /api/alerts           - Create alert
GET  /api/alerts/[id]      - Get alert details
PUT  /api/alerts/[id]      - Update alert
PATCH /api/alerts/[id]/status - Change alert status
POST /api/alerts/[id]/acknowledge - Acknowledge alert
POST /api/alerts/[id]/escalate - Escalate alert
```

### Incidents
```
GET  /api/incidents        - List incidents
POST /api/incidents        - Create incident
GET  /api/incidents/[id]   - Get incident details
PUT  /api/incidents/[id]   - Update incident
POST /api/incidents/[id]/close - Close incident
POST /api/incidents/[id]/assign - Assign incident
```

### Workflows
```
GET  /api/workflows        - List workflows
POST /api/workflows        - Create workflow
GET  /api/workflows/[id]   - Get workflow details
PUT  /api/workflows/[id]   - Update workflow
DELETE /api/workflows/[id] - Delete workflow
POST /api/workflows/[id]/execute - Execute workflow
GET  /api/workflows/[id]/executions - Get execution history
```

## 🔍 API Guards & Validation

```typescript
import { 
  withPermission,
  withErrorHandling,
  validateRequestBody,
  checkRateLimit
} from '@/lib/api-utils';

// Protection with permission check
export const GET = withPermission(
  Permission.VIEW_ALERTS, 
  async (request, user) => {
    // Handler code
  }
);

// Validation
const validation = validateRequestBody(body, [
  { field: 'title', type: 'string', required: true },
  { field: 'severity', type: 'string', required: true },
]);

if (!validation.valid) {
  return validationErrorResponse('Validation failed', validation.errors);
}
```

## 📝 Workflows & Automation

### Workflow Triggers

- **Alert** - Triggered by incoming alerts
- **Event** - Triggered by security events
- **Schedule** - Cron-based scheduling
- **Manual** - User-initiated

### Workflow Actions

- **Notification** - Send notifications
- **Escalate** - Escalate to management
- **Assign** - Auto-assign to analysts
- **Create Ticket** - Create support tickets
- **Update Status** - Change alert/incident status
- **Email** - Send emails
- **Slack** - Send Slack messages
- **Webhook** - Call external webhooks

### Example Workflow

```typescript
const workflow: Workflow = {
  id: 'workflow_123',
  name: 'Auto-escalate Critical Phishing',
  description: 'Automatically escalate critical phishing alerts',
  status: WorkflowStatus.ACTIVE,
  enabled: true,
  priority: 1,
  
  trigger: {
    type: WorkflowTriggerType.ALERT,
    conditions: {
      severity: 'CRITICAL',
      category: 'PHISHING'
    }
  },
  
  actions: [
    {
      id: 'action_1',
      type: WorkflowActionType.ESCALATE,
      config: { escalateTo: 'soc_manager' },
      order: 1,
      enabled: true
    },
    {
      id: 'action_2',
      type: WorkflowActionType.NOTIFICATION,
      config: { channels: ['slack', 'email'] },
      order: 2,
      enabled: true
    }
  ],
  
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user_123',
  executionCount: 42
};
```

## ⚙️ Configuration

Environment variables in `.env.local`:

```env
# Application
NODE_ENV=development

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_TIMEOUT=30000
API_RETRIES=3

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3001
WEBSOCKET_ENABLED=true
WS_RECONNECT_INTERVAL=3000
WS_MAX_RECONNECT_ATTEMPTS=5

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
SESSION_TIMEOUT_MINUTES=1440
TOKEN_REFRESH_INTERVAL=900000

# Security
AUDIT_LOGGING=true
ENABLE_ENCRYPTION=true
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000

# Features
FEATURE_WORKFLOWS=true
FEATURE_AUTOMATIONS=true
FEATURE_REPORTING=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_CUSTOM_DASHBOARDS=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_DESTINATION=console

# Performance
CACHE_ENABLED=true
CACHE_TTL=3600000
METRICS_INTERVAL=5000
BATCH_SIZE=100
```

## 📦 Installation & Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 🔄 Development Workflow

1. **Create your store** in `src/stores/`
2. **Define types** in `src/types/index.ts`
3. **Create components** in `src/components/`
4. **Add custom hooks** in `src/hooks/`
5. **Create API routes** in `src/app/api/`
6. **Protect with RBAC** using `@/middleware/rbac`
7. **Integrate WebSocket** with `@/hooks/useWebSocket`

## 📚 Key Concepts

### Alerts
- Incoming security threats
- Risk scoring (0-100)
- Status tracking (NEW, INVESTIGATING, RESOLVED, etc.)
- IOC extraction
- Audit trails

### Incidents
- Larger security issues
- Can be related to multiple alerts
- Team assignment
- Timeline tracking
- Investigation management

### Investigations
- Deep dives into incidents
- Findings and evidence collection
- Artifact tracking
- Analyst notes

### Workflows
- Automated response processes
- Trigger-based execution
- Multi-step actions
- Conditional logic
- Audit trail

## 🔒 Security Best Practices

1. **Always validate input** - Use `validateRequestBody()`
2. **Check permissions** - Use `withPermission()` middleware
3. **Audit actions** - Log all user actions
4. **Handle errors** - Use `withErrorHandling()`
5. **Rate limit** - Use `checkRateLimit()`
6. **Validate tokens** - JWT verification on API routes
7. **HTTPS only** - In production, enforce HTTPS
8. **Secrets management** - Use environment variables

## 🎯 Next Steps

1. Customize the workflow triggers and actions for your environment
2. Connect to your actual alert sources (email gateways, security tools)
3. Implement email/Slack integration for notifications
4. Set up the database backend (PostgreSQL recommended)
5. Deploy to your infrastructure (Docker, Kubernetes, etc.)
6. Configure LDAP/SSO for authentication
7. Set up audit logging to external systems
8. Implement alerting for critical events

## 📖 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WebSocket Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📞 Support & Contributing

For questions, issues, or contributions, please contact the Guardstone Console team.

---

**Guardstone Console v1.0.0** - Enterprise Security Operations Center
