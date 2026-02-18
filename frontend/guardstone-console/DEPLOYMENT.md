# Guardstone Console - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Guardstone Console frontend to multiple environments using Docker, Kubernetes, and Helm.

## Prerequisites

- Node.js 20+ & pnpm
- Docker (for containerized deployment)
- kubectl (for Kubernetes deployment)
- Helm 3+ (for Helm-based deployment)
- Kubernetes cluster (1.24+)
- Container registry (Docker Hub, ECR, GCR, etc.)

## 1. Local Development Deployment

### Build the application

```bash
pnpm install
pnpm run build
pnpm run start
```

The application will be available at `http://localhost:3000`.

### Environment Variables

Copy `.env.production` to `.env.production.local` and configure:

```bash
NEXT_PUBLIC_API_URL=https://api.phishx.io
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_LOG_LEVEL=error
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## 2. Docker Deployment

### Build Docker Image

```bash
# Build image
pnpm run docker:build

# Tag for registry
docker tag guardstone-console:latest your-registry.com/guardstone-console:1.0.0
docker tag guardstone-console:latest your-registry.com/guardstone-console:latest
```

### Push to Container Registry

```bash
# Docker Hub
docker push your-username/guardstone-console:1.0.0
docker push your-username/guardstone-console:latest

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker tag guardstone-console:latest your-account.dkr.ecr.us-east-1.amazonaws.com/guardstone-console:1.0.0
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/guardstone-console:1.0.0
```

### Run Locally with Docker

```bash
# Run container
pnpm run docker:run

# Or manually
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.phishx.io \
  -e NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn> \
  guardstone-console:latest
```

### Docker Compose

```bash
docker-compose up -d
docker-compose down
```

## 3. Kubernetes Deployment

### Prerequisites

- Kubernetes cluster with NGINX Ingress Controller
- cert-manager for TLS certificates
- StorageClass configured (for logs/cache persistence)

### Deploy Raw Manifests

```bash
# Create namespace (optional)
kubectl create namespace guardstone
kubectl config set-context --current --namespace=guardstone

# Create secrets
kubectl create secret generic guardstone-secrets \
  --from-literal=sentry-dsn='https://your-dsn@sentry.io/id' \
  --from-literal=database-url='postgresql://user:pass@host:5432/db' \
  --from-literal=redis-url='redis://user:pass@host:6379/0' \
  --from-literal=jwt-secret='your-jwt-secret'

# Apply manifests
kubectl apply -f ../k8s/configmap.yaml
kubectl apply -f ../k8s/deployment.yaml
kubectl apply -f ../k8s/service.yaml
kubectl apply -f ../k8s/ingress.yaml
kubectl apply -f ../k8s/hpa.yaml

# Or apply all at once
kubectl apply -f ../k8s/

# Verify deployment
pnpm run k8s:status
kubectl describe pod -l app=guardstone-console
kubectl logs -l app=guardstone-console -f
```

### Update Image in Deployment

```bash
kubectl set image deployment/guardstone-console \
  guardstone-console=your-registry.com/guardstone-console:1.0.0
```

### Expose Service

```bash
# Port forward for testing
kubectl port-forward svc/guardstone-console 3000:80

# Get ingress URL
kubectl get ingress
```

## 4. Helm Deployment

Helm provides a templated, production-ready deployment with easy configuration management.

### Install Helm Chart

#### Basic Installation

```bash
helm install guardstone-console ./helm \
  --namespace guardstone \
  --create-namespace
```

#### With Custom Values

Create `custom-values.yaml`:

```yaml
replicaCount: 3

image:
  repository: your-registry.com/guardstone-console
  tag: "1.0.0"

config:
  apiBaseUrl: "https://api.phishx.io"
  analyticsEnabled: "true"

secrets:
  sentryDsn: "https://your-dsn@sentry.io/id"
  databaseUrl: "postgresql://user:pass@host/db"
  redisUrl: "redis://user:pass@host"
  jwtSecret: "your-secret"

ingress:
  enabled: true
  hosts:
    - host: guardstone.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: guardstone-tls
      hosts:
        - guardstone.example.com

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

Install with custom values:

```bash
helm install guardstone-console ./helm \
  -f custom-values.yaml \
  --namespace guardstone \
  --create-namespace
```

### Upgrade Release

```bash
# Upgrade with new image version
helm upgrade guardstone-console ./helm \
  --set image.tag="1.1.0" \
  --namespace guardstone

# Upgrade with custom values
helm upgrade guardstone-console ./helm \
  -f custom-values.yaml \
  --namespace guardstone
```

### Verify Helm Deployment

```bash
# List releases
helm list -n guardstone

# Get release details
helm status guardstone-console -n guardstone
helm get values guardstone-console -n guardstone

# Check deployment status
kubectl get pods,svc,ingress -n guardstone
```

### Rollback Release

```bash
# View release history
helm history guardstone-console -n guardstone

# Rollback to previous version
helm rollback guardstone-console 1 -n guardstone
```

### Uninstall Release

```bash
helm uninstall guardstone-console -n guardstone
```

## 5. Configuration Management

### Environment Setup

#### Development

```bash
export API_URL=http://localhost:8000
export ENVIRONMENT=development
export LOG_LEVEL=debug
export ENABLE_ANALYTICS=false
```

#### Staging

```bash
export API_URL=https://api-staging.phishx.io
export ENVIRONMENT=staging
export LOG_LEVEL=info
export ENABLE_ANALYTICS=true
export SENTRY_DSN=https://staging-dsn@sentry.io/id
```

#### Production

```bash
export API_URL=https://api.phishx.io
export ENVIRONMENT=production
export LOG_LEVEL=error
export ENABLE_ANALYTICS=true
export SENTRY_DSN=https://prod-dsn@sentry.io/id
```

### ConfigMap Updates

Update configuration without redeploying:

```bash
kubectl create configmap guardstone-config \
  --from-literal=api-base-url=https://api.phishx.io \
  --from-literal=analytics-enabled=true \
  -o yaml | kubectl apply -f -
```

## 6. Testing Before Deployment

### Unit Tests

```bash
pnpm run test
pnpm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run with UI
pnpm run test:e2e:ui

# Debug mode
pnpm run test:e2e:debug

# Run specific test file
pnpm run test:e2e -- e2e/dashboard.spec.ts
```

### Type Checking

```bash
pnpm run type-check
```

### Linting

```bash
pnpm run lint
```

## 7. Monitoring & Observability

### Sentry Integration

Application errors are automatically reported to Sentry if `NEXT_PUBLIC_SENTRY_DSN` is configured.

```typescript
// Example: Manual error tracking
import { captureException } from '@/lib/sentry'

try {
  // Code
} catch (error) {
  captureException(error, { context: 'specific-component' })
}
```

### Web Vitals

Core Web Vitals are automatically tracked:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

Enable analytics in `.env.production.local`:

```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Kubernetes Metrics

View resource usage:

```bash
# Pod metrics
kubectl top pods -n guardstone

# Node metrics
kubectl top nodes

# HPA status
kubectl get hpa guardstone-console-hpa -n guardstone -w
```

## 8. Scaling & Performance

### Horizontal Pod Autoscaling

HPA automatically scales pods based on CPU and memory utilization:

```bash
# View HPA status
kubectl describe hpa guardstone-console-hpa -n guardstone

# Manual scaling
kubectl scale deployment guardstone-console --replicas=5 -n guardstone
```

### Network Policies

Restrict ingress/egress traffic:

```bash
kubectl apply -f ../k8s/hpa.yaml  # Includes NetworkPolicy
```

### Resource Limits

Configured in Helm values:
- CPU request: 250m, limit: 500m
- Memory request: 256Mi, limit: 512Mi

Adjust in `values.yaml` for your workload:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

## 9. TLS/HTTPS Configuration

### Automatic Certificate Management (cert-manager)

Certificates are automatically provisioned and renewed:

```bash
# Verify certificate
kubectl get certificate -n guardstone
kubectl describe certificate guardstone-console-cert -n guardstone

# Check TLS secret
kubectl get secret guardstone-console-tls -n guardstone
```

### Manual Certificate

If not using cert-manager:

```bash
# Create secret from existing certificate
kubectl create secret tls guardstone-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n guardstone

# Update ingress to use manual secret
kubectl patch ingress guardstone-console -p \
  '{"spec":{"tls":[{"hosts":["guardstone.example.com"],"secretName":"guardstone-tls"}]}}' \
  -n guardstone
```

## 10. Troubleshooting

### Pod Stuck in Pending

```bash
kubectl describe pod <pod-name> -n guardstone
```

Check for resource constraints or scheduling issues.

### Deployment Not Rolling Out

```bash
kubectl rollout status deployment/guardstone-console -n guardstone
kubectl rollout history deployment/guardstone-console -n guardstone
kubectl rollout undo deployment/guardstone-console -n guardstone
```

### Check Logs

```bash
# Recent logs
kubectl logs deployment/guardstone-console -n guardstone

# Follow logs
kubectl logs -f deployment/guardstone-console -n guardstone

# Previous pod logs (if container crashed)
kubectl logs <pod-name> --previous -n guardstone
```

### Health Check Failures

```bash
# Test liveness probe
kubectl exec -it <pod-name> -n guardstone -- curl http://localhost:3000/

# Test readiness probe
kubectl exec -it <pod-name> -n guardstone -- curl http://localhost:3000/api/health
```

### Restart Pods

```bash
kubectl rollout restart deployment/guardstone-console -n guardstone
```

## 11. Cleanup

### Remove Kubernetes Resources

```bash
# Delete with Helm
helm uninstall guardstone-console -n guardstone

# Or delete raw manifests
kubectl delete -f ../k8s/
```

### Delete Namespace

```bash
kubectl delete namespace guardstone
```

### Remove Docker Image

```bash
docker rmi guardstone-console:latest
```

## 12. Quick Reference Commands

| Task | Command |
|------|---------|
| Build image | `pnpm run docker:build` |
| Run locally | `pnpm run docker:run` |
| Deploy to K8s | `pnpm run k8s:deploy` |
| Check K8s status | `pnpm run k8s:status` |
| Install Helm | `pnpm run helm:install` |
| Upgrade Helm | `pnpm run helm:upgrade` |
| Run E2E tests | `pnpm run test:e2e` |
| View logs | `kubectl logs -f deployment/guardstone-console` |
| Port forward | `kubectl port-forward svc/guardstone-console 3000:80` |
| Scale pods | `kubectl scale deployment/guardstone-console --replicas=5` |

## Support & Documentation

- **Next.js**: https://nextjs.org/docs
- **Kubernetes**: https://kubernetes.io/docs
- **Helm**: https://helm.sh/docs
- **Docker**: https://docs.docker.com
- **Sentry**: https://docs.sentry.io
- **Playwright**: https://playwright.dev

---

For issues or questions, contact the Guardstone team.
