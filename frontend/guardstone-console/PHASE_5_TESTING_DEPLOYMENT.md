# Phase 5: Testing & Deployment

## Overview
Phase 5 focuses on comprehensive testing infrastructure and containerized deployment for the PhishX Guardstone Console application. This ensures code quality, reliability, and production-readiness.

## Testing Infrastructure

### Jest Configuration
- **File**: `jest.config.js`
- **Setup**: `jest.setup.js`
- **Coverage Requirements**: 50% across branches, functions, lines, and statements
- **Test Pattern**: Files ending with `.test.ts`, `.test.tsx`, or in `__tests__` directories

### Test Utilities
- **Location**: `src/utils/test-utils.tsx`
- **Features**:
  - Custom render function with React Testing Library
  - Mock data generators (widgets, templates)
  - Common test assertions
  - Async wait utilities

## Unit & Component Tests

### Widget Component Tests (7 files)

#### TopSendersWidget.test.tsx
- ✅ Renders widget title
- ✅ Displays sender data table
- ✅ Shows risk scores with badges
- ✅ Displays refresh timestamp
- ✅ Renders within Card component
- ✅ Shows exactly 5 senders

#### RiskDistributionWidget.test.tsx
- ✅ Renders widget title
- ✅ Displays risk level statistics
- ✅ Shows progress bars
- ✅ Displays percentage values
- ✅ Shows trend indicator
- ✅ Displays total item count

#### WidgetGrid.test.tsx
- ✅ Renders empty state
- ✅ Renders multiple widgets
- ✅ Filters inactive widgets
- ✅ Sorts widgets by position
- ✅ Shows edit buttons in edit mode
- ✅ Calls callbacks correctly
- ✅ Applies correct colspan for sizes

### Store Unit Tests (2 files)

#### widgetStore.test.ts (210 lines)
**Widget Management**
- ✅ Add widget to store
- ✅ Remove widget by ID
- ✅ Update existing widget
- ✅ Set multiple widgets

**Edit Mode**
- ✅ Toggle edit mode on/off

**Widget Refresh**
- ✅ Refresh single widget
- ✅ Refresh all widgets
- ✅ Get last refresh time

**Layout Management**
- ✅ Reorder widgets by position

#### templateStore.test.ts (240 lines)
**Template Management**
- ✅ Add new template
- ✅ Remove template by ID
- ✅ Update existing template
- ✅ Set multiple templates

**Selection**
- ✅ Select template
- ✅ Deselect template

**Usage Tracking**
- ✅ Increment usage count
- ✅ Update timestamp on usage

**Filtering**
- ✅ Filter by type
- ✅ Filter by category
- ✅ Search by name/description/tags

**Loading State**
- ✅ Set loading state

### Utility Tests (1 file)

#### error-handler.test.ts
- ✅ Debug message logging
- ✅ Info message logging
- ✅ Warning message logging
- ✅ Error message logging with stack
- ✅ Fatal message logging
- ✅ Context information inclusion
- ✅ Timestamp inclusion
- ✅ Log retrieval
- ✅ Log clearing
- ✅ Max log limit enforcement
- ✅ Log level filtering

## Error Handling & Logging

### ErrorHandler Utility
- **Location**: `src/utils/error-handler.ts`
- **Features**:
  - Centralized logging system
  - 5 log levels: debug, info, warn, error, fatal
  - Configurable log level via environment
  - Log storage in memory (max 1000 entries)
  - Development and production modes
  - Integration points for Sentry/external services

### Usage Example
```typescript
import ErrorHandler from '@/utils/error-handler'

// Debug logging
ErrorHandler.debug('Widget loading started', { widgetId: 'w1' })

// Error logging
try {
  // risky operation
} catch (error) {
  ErrorHandler.error('Failed to fetch data', error, {
    component: 'TopSendersWidget',
    action: 'fetchSenders',
  })
}

// Retrieve logs
const allLogs = ErrorHandler.getLogs()
```

## Deployment Configuration

### Docker Setup

#### Production Dockerfile
- **File**: `Dockerfile`
- **Base**: Node 20 Alpine (lightweight)
- **Process**:
  1. Install dependencies
  2. Build Next.js application
  3. Set NODE_ENV=production
  4. Start with `pnpm start`
- **Exposed Port**: 3000

#### Development Dockerfile
- **File**: `Dockerfile.dev`
- **Features**:
  - Hot-reload with volume mounts
  - Development dependencies
  - Next.js dev server
  - Same port 3000

### Docker Compose

#### docker-compose.yml
**Services**:
1. **console-dev** (Development)
   - Port: 3000:3000
   - Volume mounts for live reload
   - API URL: http://localhost:8000

2. **console-prod** (Production-like)
   - Port: 3001:3000
   - Production build
   - API URL: http://api:8000

3. **api** (Mock API, optional)
   - Port: 8000:8000
   - Profile: `with-api`
   - For testing

**Usage**:
```bash
# Development
docker-compose up console-dev

# Production
docker-compose up console-prod

# With mock API
docker-compose --profile with-api up
```

## Environment Configuration

### Development (.env.development)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_BETA_FEATURES=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### Production (.env.production)
```
NEXT_PUBLIC_API_URL=https://api.phishx.io
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_LOG_LEVEL=error
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### Testing (.env.test)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=test
NEXT_PUBLIC_LOG_LEVEL=silent
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## CI/CD Pipeline

### GitHub Actions Workflow (.github/workflows/ci-cd.yml)

**Triggers**: Push to main/develop, Pull Requests

**Jobs**:
1. **Lint**: ESLint code quality checks
2. **Test**: Jest unit tests with coverage reporting
3. **Build**: Next.js application build
4. **Docker**: Build and push Docker images (main only)
5. **Deploy Staging**: Deploy to staging (develop only)
6. **Deploy Production**: Deploy to production (main only)

**Features**:
- Parallel job execution
- Codecov integration
- Artifact caching
- Docker registry push
- Multiple environment support

## Testing npm Scripts

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## File Structure - Phase 5

```
guardstone-console/
├── jest.config.js                 # Jest configuration
├── jest.setup.js                  # Jest setup (mocks, globals)
├── Dockerfile                     # Production image
├── Dockerfile.dev                 # Development image
├── docker-compose.yml             # Local development setup
├── .env.development               # Dev environment vars
├── .env.production                # Prod environment vars
├── .env.test                      # Test environment vars
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # GitHub Actions pipeline
├── src/
│   ├── utils/
│   │   ├── test-utils.tsx        # Common test utilities
│   │   ├── error-handler.ts      # Logging and error handling
│   │   └── error-handler.test.ts # Error handler tests
│   ├── components/
│   │   └── widgets/
│   │       ├── TopSendersWidget.test.tsx
│   │       ├── RiskDistributionWidget.test.tsx
│   │       └── WidgetGrid.test.tsx
│   └── stores/
│       ├── widgetStore.test.ts
│       └── templateStore.test.ts
└── package.json                   # Updated with test dependencies
```

## Dependencies Added

### Testing Libraries
- `jest`: ^29.7.0
- `@testing-library/react`: ^14.1.2
- `@testing-library/jest-dom`: ^6.1.5
- `jest-environment-jsdom`: ^29.7.0

### Application
- `zustand`: ^5.0.1 (State management)

## Test Coverage Goals

| Category | Target | Status |
|----------|--------|--------|
| Branches | 50% | ✅ |
| Functions | 50% | ✅ |
| Lines | 50% | ✅ |
| Statements | 50% | ✅ |

## Next Steps

### Phase 5 Continuation (Optional)
1. **E2E Testing** (Playwright or Cypress)
   - Test complete user workflows
   - Cross-browser testing
   - Visual regression testing

2. **Performance Testing**
   - Lighthouse CI integration
   - Bundle size monitoring
   - Runtime performance metrics

3. **Security**
   - OWASP security headers
   - Dependency scanning (Dependabot)
   - Static analysis (SAST)

4. **Advanced Monitoring**
   - Sentry integration
   - Performance monitoring (LogRocket)
   - Error tracking dashboard

5. **Kubernetes Deployment** (Phase 5 Advanced)
   - K8s manifests for cluster deployment
   - Helm charts for easy installation
   - Auto-scaling configuration

## Running Tests Locally

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Specific test file
pnpm test TopSendersWidget.test.tsx

# Update snapshots
pnpm test -- -u
```

## Running with Docker

```bash
# Development with hot reload
docker-compose up console-dev

# Production build
docker-compose up console-prod

# With mock API
docker-compose --profile with-api up

# Access application
# Dev: http://localhost:3000
# Prod: http://localhost:3001
# API: http://localhost:8000
```

## Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Code coverage meeting threshold (50%+)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Build successful (`pnpm run build`)
- [ ] Docker build completes
- [ ] Environment variables configured
- [ ] Error logging configured
- [ ] Monitoring/Sentry setup (production)
- [ ] CI/CD pipeline tests passing
- [ ] Security scan passing

## Troubleshooting

### Test Failures
1. Check Node version (should be 20+)
2. Clear node_modules and reinstall
3. Check environment variables loaded
4. Review test-utils mock implementations

### Docker Issues
1. Ensure Docker daemon is running
2. Check port availability
3. Verify volume mounts in docker-compose.yml
4. Check .dockerignore for excluded files

### CI/CD Pipeline Issues
1. Verify GitHub secrets configured
2. Check branch protection rules
3. Review workflow file syntax
4. Check logs in GitHub Actions tab

---

**Phase 5 Status**: Foundation Complete ✅
**Testing Infrastructure**: Ready
**Deployment Setup**: Ready for local and CI/CD
**Estimated Additional Work**: E2E tests, advanced monitoring, K8s
