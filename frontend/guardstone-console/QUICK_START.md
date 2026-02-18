# Quick Start Guide - Phase 5

## Development Setup

### 1. Install Dependencies
```bash
cd guardstone-console
pnpm install
```

### 2. Environment Setup
```bash
# Copy example env file
cp .env.example .env.local

# Update with your settings
nano .env.local
```

### 3. Run Development Server
```bash
# Standard development
pnpm dev

# Or with Docker
docker-compose up console-dev
```

Visit: http://localhost:3000

## Testing

### Run All Tests
```bash
pnpm test
```

### Watch Mode (Auto-rerun on changes)
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

### Specific Test File
```bash
pnpm test TopSendersWidget.test.tsx
```

### Update Snapshots
```bash
pnpm test -- -u
```

## Building

### Development Build
```bash
pnpm build
```

### Production Build
```bash
pnpm build
pnpm start
```

## Docker Deployment

### Development Container
```bash
# Build and run
docker-compose up console-dev

# Run in background
docker-compose up -d console-dev

# View logs
docker-compose logs -f console-dev

# Stop
docker-compose down
```

### Production Container
```bash
# Build and run
docker-compose up console-prod

# Or create custom Docker build
docker build -t guardstone-console:latest .
docker run -p 3000:3000 guardstone-console:latest
```

### With Mock API
```bash
docker-compose --profile with-api up

# Access:
# App: http://localhost:3000
# API: http://localhost:8000
```

## Code Quality

### Linting
```bash
pnpm lint
```

### Type Checking
```bash
pnpm tsc --noEmit
```

## Common Issues

### Tests Failing
```bash
# Clear Jest cache
pnpm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Docker Port in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
```

### Build Fails
```bash
# Clean build
rm -rf .next
pnpm build
```

## Environment Variables Reference

| Variable | Dev | Prod | Test |
|----------|-----|------|------|
| NEXT_PUBLIC_API_URL | localhost:8000 | api.phishx.io | localhost:8000 |
| NEXT_PUBLIC_ENVIRONMENT | development | production | test |
| NEXT_PUBLIC_LOG_LEVEL | debug | error | silent |
| NEXT_PUBLIC_ENABLE_BETA_FEATURES | true | false | true |
| NEXT_PUBLIC_ENABLE_ANALYTICS | false | true | false |

## Git Workflow

### Create Feature Branch
```bash
git checkout -b feature/component-name
```

### Commit with Tests
```bash
# Make changes
pnpm test:coverage
git add .
git commit -m "feat: add component with tests"
```

### Push and Open PR
```bash
git push origin feature/component-name

# Create pull request on GitHub
# CI/CD pipeline will automatically run tests
```

## Deployment Pipeline

### Dev → Main (Automatic)
1. Push to `develop` branch
2. GitHub Actions runs: Lint → Test → Build → Deploy to Staging

### Main → Production (Automatic)
1. Push to `main` branch
2. GitHub Actions runs: Lint → Test → Build → Docker Push → Deploy to Production

### Manual Deployment
```bash
# Build Docker image
docker build -t guardstone-console:v1.0.0 .

# Push to registry
docker push ghcr.io/yourorg/guardstone-console:v1.0.0

# Deploy to cluster
kubectl set image deployment/console console=ghcr.io/yourorg/guardstone-console:v1.0.0
```

## Performance Tips

### Optimize Bundle Size
```bash
# Analyze bundle
pnpm build
npx next-bundle-analyzer ./.next/static/chunks/main.js
```

### Speed Up Tests
```bash
# Run tests in parallel
pnpm test -- --maxWorkers=4

# Run specific test file
pnpm test WidgetGrid.test.tsx
```

## Documentation

- [Phase 4: Advanced Features](./PHASE_4_SUMMARY.md)
- [Phase 5: Testing & Deployment](./PHASE_5_TESTING_DEPLOYMENT.md)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [API Integration Guide](./API_INTEGRATION.md)

## Support & Resources

- Repository: https://github.com/yourorg/phishing-detection-tool
- Issues: https://github.com/yourorg/phishing-detection-tool/issues
- Documentation: https://docs.phishx.io
- Slack: #phishx-development

---

**Last Updated**: February 17, 2026
**Phase**: 5 (Testing & Deployment)
**Status**: Active Development
