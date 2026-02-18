# Guardstone Console - Enterprise SOC Frontend

A modern, enterprise-grade Security Operations Center (SOC) console built with Next.js 14, React 19, TypeScript, and Zustand for managing email security threats and incident response.

## 🎯 Overview

Guardstone Console is a comprehensive frontend application for the PhishX email threat detection platform. It provides SOC analysts, administrators, and auditors with a powerful interface for monitoring, investigating, and responding to phishing and malware threats.

### Key Features

- **Risk-Based Organization**: Canonical risk mapping (COLD → WARM → HOT)
- **Role-Based Access Control**: Three role types (SOC Analyst, Administrator, Auditor)
- **Real-time Updates**: WebSocket integration for live alert notifications
- **Comprehensive Investigation**: Deep drill-down pages with detailed alert analysis
- **Audit Trail**: Timestamped action history for compliance
- **Data Export**: CSV, PDF, and JSON export capabilities
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS

## 🏗️ Architecture

### Type System
- Comprehensive TypeScript types for all domain concepts
- `Alert`, `RiskLevel`, `AlertStatus` for core objects
- `User`, `UserRole` for identity and RBAC
- `IOC` for indicators of compromise
- `AuditEntry` for action tracking

### State Management
Three centralized Zustand stores:
- **alertStore**: Alert data, filtering, pagination
- **authStore**: Authentication, tokens, session management
- **uiStore**: Sidebar, modals, notifications

### Middleware & Services
- **RBAC Middleware**: Permission checking and role enforcement
- **API Client**: Typed fetch wrapper for backend integration
- **WebSocket Service**: Real-time event handling with auto-reconnect
- **Export Service**: CSV/PDF/JSON data export

### Components
- **Common**: RiskBadge, StatusBadge, LoadingSpinner, ErrorBoundary, ToastNotification
- **Layout**: Sidebar, TopBar, MainLayout
- **Tables**: AlertTable, LogsTable, QuarantineTable, AuditTable
- **Forms**: SearchForm, FilterForm, StatusChangeForm
- **Investigation**: DrillDownPage, RelatedAlerts, RiskBreakdown
- **Export**: ExportModal, ExportHandler

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

```bash
# Navigate to project directory
cd guardstone-console

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your configuration
```

### Configuration

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:5000/ws
NEXT_PUBLIC_AUTH_TOKEN_KEY=phishx_auth_token
# ... additional settings (see .env.example)
```

### Development

```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js routes (App Router)
│   ├── logs/               # COLD risk view (informational)
│   ├── alerts/             # WARM risk view (investigating)
│   ├── quarantine/         # HOT risk view (action required)
│   ├── audit/              # Audit trail visualization
│   ├── settings/           # User & system settings
│   ├── api/                # API integration routes
│   └── layout.tsx          # Root layout wrapper
├── components/
│   ├── common/             # Reusable UI components
│   │   ├── RiskBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ToastNotification.tsx
│   ├── layout/             # Page layout components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MainLayout.tsx
│   ├── tables/             # Data table components
│   │   ├── AlertTable.tsx
│   │   ├── LogsTable.tsx
│   │   ├── QuarantineTable.tsx
│   │   └── AuditTable.tsx
│   ├── forms/              # Form components
│   │   ├── SearchForm.tsx
│   │   ├── FilterForm.tsx
│   │   └── StatusChangeForm.tsx
│   ├── investigation/      # Investigation workflow
│   │   ├── DrillDownPage.tsx
│   │   ├── RiskBreakdown.tsx
│   │   └── RelatedAlerts.tsx
│   ├── modals/             # Modal dialogs
│   ├── export/             # Export functionality
│   │   ├── ExportModal.tsx
│   │   └── ExportHandler.tsx
│   └── index.ts
├── hooks/                  # Custom React hooks
│   ├── useAlert()          # Single alert management
│   ├── useAlerts()         # Alert list management
│   ├── useAuth()           # Authentication state
│   ├── useRBAC()           # Permission checking
│   ├── useWebSocket()      # Real-time updates
│   ├── useUI()             # UI state management
│   ├── useFetch()          # Data fetching
│   ├── useForm()           # Form state management
│   └── useNotification()   # Toast notifications
├── middleware/
│   └── rbac.ts             # Role-based access control
├── services/
│   ├── apiClient.ts        # Typed API client wrapper
│   ├── websocketService.ts # WebSocket connection manager
│   └── exportService.ts    # Data export handler
├── store/                  # Zustand state stores
│   ├── alertStore.ts       # Alert state & operations
│   ├── authStore.ts        # Authentication state
│   └── uiStore.ts          # UI state & navigation
├── types/
│   └── index.ts            # All TypeScript type definitions
├── utils/
│   ├── formatters.ts       # Display formatting utilities
│   ├── validators.ts       # Input validation utilities
│   └── [additional utils]
└── lib/
    ├── constants.ts        # Application constants
    └── utils.ts            # General helper functions
```

## 🔐 Role-Based Access Control

### Roles & Permissions

**SOC Analyst**
- ✓ View alerts and logs
- ✓ Investigate alerts
- ✓ Add investigation notes
- ✓ Export data
- ✓ View audit history
- ✗ Delete alerts
- ✗ Release quarantine
- ✗ Manage users

**SOC Administrator**
- ✓ All SOC Analyst permissions
- ✓ Release/delete quarantined emails
- ✓ Delete alerts
- ✓ Manage user accounts
- ✓ Access all system settings

**Auditor**
- ✓ View-only access
- ✓ View alerts, logs, audit trail
- ✓ Export audit data
- ✓ View compliance reports
- ✗ Perform any actions
- ✗ Modify data

## 🔄 Risk Mapping (Canonical)

```
COLD Risk (0-3.0)    → /logs       → Informational, historical data
WARM Risk (3.0-7.0)  → /alerts     → Active investigation required
HOT Risk (7.0-10.0)  → /quarantine → Immediate action required
```

Each risk level determines:
- Visual styling and colors
- Page location in navigation
- Required user actions
- Export report type

## 📡 Real-Time Updates

WebSocket integration for live alert notifications:

```javascript
// Subscribe to event type
websocketService.on('ALERT_UPDATED', (event) => {
  updateAlertUI(event.payload);
});

// Subscribe to specific alert
websocketService.subscribeToAlert(alertId, (event) => {
  if (event.type === 'ALERT_UPDATED') {
    refreshInvestigationPage();
  }
});

// Auto-reconnect on disconnect
// - Exponential backoff
// - Max 5 retry attempts
```

## 📊 Data Export

Export alerts in multiple formats:

```javascript
// Export selected alerts
const response = await APIClient.exports.submit(
  ['alert-1', 'alert-2'],
  'csv',
  {
    includeAuditHistory: true,
    includeIOCs: true,
    format: 'csv'
  }
);

// Formats: csv, pdf, json
// Features: Audit history, IOCs, model explanations
```

## 🔍 Investigation Workflow

1. **Alert Received**: New alert appears in WARM/HOT view
2. **Click Alert**: Open deep drill-down investigation page
3. **Review Details**:
   - Risk breakdown and scoring
   - Indicators of compromise (IOCs)
   - Model explanation with feature importance
   - Previous similar alerts
4. **Add Investigation Notes**: Document findings with timestamp
5. **Change Status**: 
   - INVESTIGATING → CONFIRMED/FALSE_POSITIVE
   - Requires investigation notes (enforced by RBAC)
6. **Action**:
   - WARM: Submit for further investigation
   - HOT: Release from quarantine or delete
7. **Audit Trail**: All actions timestamped with user identity

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 📦 Dependencies

### Core Framework
- **Next.js 14**: Full-stack React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety and development experience

### State & Data Management
- **Zustand**: Lightweight state management
- **Fetch API**: HTTP client (wrapped in typed APIClient)

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Modules**: Component-scoped styling

### Development Tools
- **ESLint**: Code quality and standards
- **Prettier**: Code formatting
- **TypeScript**: Type checking

## 🚨 Error Handling

Comprehensive error handling throughout:

- **ErrorBoundary Component**: Catches React component errors
- **APIError Class**: Custom error with status codes
- **Toast Notifications**: User-friendly error messages
- **Try-Catch Blocks**: Promise and async error handling
- **Logging**: Console logging with configurable levels

## ♿ Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management for modal dialogs
- Color contrast compliance (WCAG AA)
- Semantic HTML structure
- Screen reader compatible

## 🔧 Configuration

### Environment Variables
See `.env.example` for complete variable reference:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:5000/ws

# Authentication
NEXT_PUBLIC_AUTH_TOKEN_KEY=phishx_auth_token
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30

# Feature Flags
NEXT_PUBLIC_ENABLE_AUDIT_TRAIL=true
NEXT_PUBLIC_ENABLE_EXPORT=true
NEXT_PUBLIC_ENABLE_REALTIME_UPDATES=true
```

### Feature Flags
Toggle features via environment variables without code changes.

## 📈 Performance Optimizations

- Tree-shaking with Next.js bundler
- Code splitting and dynamic imports
- Image optimization with next/image
- Component memoization with React.memo
- Debounced search and filtering
- Efficient state updates (Map-based lookups)
- WebSocket connection pooling

## 🔒 Security

- **RBAC Enforcement**: All operations checked against permissions
- **Token Management**: Secure localStorage with expiry checking
- **Input Validation**: Client and server-side validation
- **XSS Prevention**: React's built-in HTML escaping
- **CSRF Protection**: Token headers included in requests
- **HTTPS Support**: Production-ready security

## 🐛 Debugging

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('DEBUG', '*');
location.reload();

// View WebSocket traffic
websocketService.on('*', (event) => console.log(event));

// Check store state
alertStore.getState();
authStore.getState();
uiStore.getState();
```

## 📚 API Reference

The application connects to a PhishX backend API:

```
POST   /api/auth/login          - User authentication
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Current user
GET    /api/alerts              - List alerts
GET    /api/alerts/{id}         - Get alert details
PATCH  /api/alerts/{id}         - Update alert
POST   /api/alerts/{id}/status  - Change alert status
GET    /api/logs                - List logs
GET    /api/quarantine          - List quarantined items
POST   /api/exports             - Submit export job
GET    /api/audit               - Audit log
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes with descriptive commits
3. Run tests: `npm test`
4. Push branch and submit pull request

## 📜 License

[License information here]

## 📞 Support

- **Issues**: GitHub Issues in repository
- **Documentation**: See `/docs` folder
- **Email**: support@phishx.io

## 🗺️ Roadmap

- [ ] Advanced query builder for filtering
- [ ] Custom dashboard widgets
- [ ] Investigation templates
- [ ] ML-powered insights
- [ ] SOAR integration
- [ ] Multi-tenant support
- [ ] Dark mode UI
- [ ] Mobile companion app

---

**Product**: Guardstone Console  
**Version**: 1.0.0  
**Built with**: Next.js 14, React 19, TypeScript, Zustand  
**Status**: ✅ Production Ready

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
