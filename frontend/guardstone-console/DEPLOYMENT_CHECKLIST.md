# Guardstone Console - Deployment Readiness Checklist

## Pre-Deployment Verification

### 1. Environment Configuration

- [ ] Copy `.env.production` to `.env.production.local`
- [ ] Configure `NEXT_PUBLIC_API_URL` for your environment
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` for error tracking
- [ ] Set `NEXT_PUBLIC_APP_VERSION` matching your release
- [ ] Verify all environment variables are correct

**Check command:**
```bash
cat .env.production.local
```

### 2. Dependencies & Build

- [ ] Run `pnpm install` to install all dependencies
- [ ] Run `pnpm run type-check` to verify TypeScript
- [ ] Run `pnpm run lint` to check code quality
- [ ] Run `pnpm run build` to verify production build succeeds
- [ ] Build size is reasonable (~2-5 MB for Next.js)

**Check commands:**
```bash
pnpm install
pnpm run type-check
pnpm run lint
pnpm run build
ls -lh .next/static/
```

### 3. Testing

- [ ] Run unit tests: `pnpm run test`
- [ ] Run E2E tests: `pnpm run test:e2e`
- [ ] All tests pass without errors
- [ ] Code coverage meets minimum threshold (>70%)

**Check commands:**
```bash
pnpm run test:coverage
pnpm run test:e2e
```

### 4. Docker Configuration

- [ ] Dockerfile exists and is up-to-date
- [ ] .dockerignore file is configured properly
- [ ] Docker build completes without errors
- [ ] Resulting image is tagged correctly

**Check commands:**
```bash
docker build -t guardstone-console:latest .
docker images | grep guardstone-console
```

### 5. Container Registry Setup

- [ ] Access to container registry (Docker Hub, ECR, GCR, etc.)
- [ ] Registry credentials configured locally
- [ ] Registry pull secrets created in Kubernetes cluster

**Check commands:**
```bash
docker login
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
```

### 6. Kubernetes Cluster

- [ ] Kubernetes cluster is accessible: `kubectl cluster-info`
- [ ] Current context points to correct cluster: `kubectl config current-context`
- [ ] RBAC permissions configured for deployment
- [ ] Storage class available for persistence: `kubectl get storageclass`
- [ ] NGINX Ingress Controller installed: `kubectl get serviceaccount -n ingress-nginx`
- [ ] cert-manager installed (if using automatic TLS): `kubectl get crds | grep cert-manager`

**Check commands:**
```bash
kubectl cluster-info
kubectl config current-context
kubectl get nodes
kubectl get storageclass
kubectl get crds | grep cert-manager
```

### 7. Kubernetes Manifests

- [ ] `k8s/deployment.yaml` configured with correct image
- [ ] `k8s/service.yaml` configured with correct ports
- [ ] `k8s/configmap.yaml` populated with environment variables
- [ ] `k8s/ingress.yaml` points to correct domain
- [ ] `k8s/hpa.yaml` scaling parameters appropriate for workload
- [ ] All manifests have correct labels and selectors

**Validation command:**
```bash
kubectl apply -f k8s/ --dry-run=client
```

### 8. Helm Chart Configuration

- [ ] `helm/Chart.yaml` has correct version
- [ ] `helm/values.yaml` configured for your environment
- [ ] Image repository and tag in values match your registry
- [ ] Resource limits are appropriate for cluster
- [ ] Ingress hostname matches your domain

**Validation command:**
```bash
helm lint helm/
helm template guardstone-console helm/ | kubectl apply --dry-run=client -f -
```

### 9. Secrets Management

- [ ] Sentry DSN configured (or empty if not using)
- [ ] Database credentials secured (if applicable)
- [ ] JWT secret generated and secured
- [ ] Redis URL configured (if applicable)

**Create Kubernetes secrets:**
```bash
kubectl create secret generic guardstone-secrets \
  --from-literal=sentry-dsn='your-dsn' \
  --from-literal=database-url='your-db-url' \
  --from-literal=redis-url='your-redis-url' \
  --from-literal=jwt-secret='your-secret'
```

### 10. DNS & TLS

- [ ] Domain name registered and accessible
- [ ] DNS A record points to ingress controller
- [ ] TLS certificate ready or cert-manager configured
- [ ] Certificate covers all required hostnames

**Check commands:**
```bash
nslookup guardstone.example.com
kubectl get certificate -n guardstone
kubectl describe certificate guardstone-console-cert -n guardstone
```

### 11. Monitoring & Logging

- [ ] Sentry account created and DSN obtained
- [ ] Prometheus/Grafana installed (if monitoring)
- [ ] Log aggregation configured (ELK, Splunk, etc.)
- [ ] Alerts configured for deployment failures

**Verification:**
```bash
# Test Sentry connectivity after deployment
curl -X POST https://your-sentry-instance/api/store/ \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 12. Performance & Security

- [ ] Security headers configured in next.config.ts
- [ ] CORS policies configured appropriately
- [ ] CSP headers configured
- [ ] Rate limiting enabled in ingress
- [ ] Pod security policies enforced

**Check next.config.ts:**
```bash
grep -A 20 "async headers" next.config.ts
```

### 13. High Availability Setup

- [ ] Minimum 2 replicas configured in HPA
- [ ] Pod disruption budgets defined
- [ ] Network policies configured
- [ ] Load balancer health checks configured

**Verify HPA settings:**
```bash
kubectl describe hpa -n guardstone
```

### 14. Deployment Scripts

- [ ] `deploy.sh` (Mac/Linux) is executable: `chmod +x deploy.sh`
- [ ] `deploy.bat` (Windows) is present and configured
- [ ] Deployment commands tested locally
- [ ] Rollback procedure documented and tested

**Test deployment commands:**
```bash
./deploy.sh build
./deploy.sh status
```

### 15. Documentation & Runbooks

- [ ] DEPLOYMENT.md completed with all details
- [ ] Runbook for common issues documented
- [ ] Team trained on deployment procedures
- [ ] Backup and disaster recovery plan in place

**Documentation checklist:**
- [ ] Deployment procedure documented
- [ ] Troubleshooting guide included
- [ ] Scaling procedures documented
- [ ] Rollback procedures documented
- [ ] Emergency contacts listed

## Pre-Deployment Sign-Off

| Item | Owner | Status | Date |
|------|-------|--------|------|
| Environment setup | | ☐ | |
| Testing complete | | ☐ | |
| Code review | | ☐ | |
| Infrastructure ready | | ☐ | |
| Monitoring configured | | ☐ | |
| Team trained | | ☐ | |
| Approved for deployment | | ☐ | |

## Deployment Steps (Quick Reference)

### Option 1: Docker Compose (Development)

```bash
docker-compose up -d
# Application available at http://localhost:3000
```

### Option 2: Kubernetes with Manifests

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/guardstone-console
```

### Option 3: Kubernetes with Helm

```bash
helm install guardstone-console ./helm \
  --namespace guardstone \
  --create-namespace
```

## Post-Deployment Verification

### 1. Pod Health

```bash
kubectl get pods -l app=guardstone-console
kubectl describe pod <pod-name>
```

### 2. Service Accessibility

```bash
kubectl get svc guardstone-console
kubectl port-forward svc/guardstone-console 3000:80
# Test at http://localhost:3000
```

### 3. Application Health

```bash
# Check application logs
kubectl logs -l app=guardstone-console -f

# Test health endpoint
curl http://localhost:3000/

# Test API connectivity
curl http://localhost:3000/api/health
```

### 4. Metrics & Monitoring

```bash
# Pod metrics
kubectl top pods -l app=guardstone-console

# HPA status
kubectl get hpa

# Review Sentry errors
# Navigate to https://sentry.io/organizations/your-org
```

### 5. Performance Check

- [ ] Page load time acceptable (<3 seconds)
- [ ] Core Web Vitals in "good" range (LCP <2.5s, CLS <0.1)
- [ ] No JavaScript errors in browser console
- [ ] All API calls completing successfully

## Rollback Procedure (If Issues)

### Using Kubernetes

```bash
# View rollout history
kubectl rollout history deployment/guardstone-console

# Rollback to previous version
kubectl rollout undo deployment/guardstone-console
kubectl rollout status deployment/guardstone-console
```

### Using Helm

```bash
# View release history
helm history guardstone-console

# Rollback to previous release
helm rollback guardstone-console 1
```

## Troubleshooting Quick Links

| Issue | Command |
|-------|---------|
| Pod won't start | `kubectl describe pod <pod>` |
| Can't reach app | `kubectl get svc` + `kubectl port-forward` |
| Slow performance | `kubectl top pods` + check logs |
| Memory leak | `kubectl logs <pod> --tail=1000` |
| High CPU | Check application code + optimize |

## Success Criteria

- [ ] Application responds to HTTP requests
- [ ] All pods running without errors
- [ ] Ingress routing working correctly
- [ ] TLS certificate valid and serving HTTPS
- [ ] Sentry receiving errors (if configured)
- [ ] HPA scaling responding to load
- [ ] Logs accessible and readable
- [ ] Team can access and use application

## Next Steps

1. Monitor application for 24 hours
2. Run production E2E tests
3. Validate analytics and monitoring data
4. Document any issues found
5. Plan optimization and hardening

---

**Deployment Date**: ________________  
**Deployed By**: ________________  
**Approved By**: ________________  
**Notes**: ________________________________________________________________
