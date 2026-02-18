# Guardstone Console - Deployment Quick Reference Card

## Installation & Setup

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Type check | `pnpm run type-check` |
| Lint code | `pnpm run lint` |
| Build app | `pnpm run build` |
| Run locally | `pnpm run dev` or `pnpm run start` |

## Testing

| Task | Command |
|------|---------|
| Unit tests | `pnpm run test` |
| Watch tests | `pnpm run test:watch` |
| Coverage report | `pnpm run test:coverage` |
| E2E tests | `pnpm run test:e2e` |
| E2E UI mode | `pnpm run test:e2e:ui` |
| E2E debug | `pnpm run test:e2e:debug` |

## Docker

| Task | Command |
|------|---------|
| Build image | `pnpm run docker:build` |
| Run locally | `pnpm run docker:run` |
| Run compose | `docker-compose up -d` |
| Stop compose | `docker-compose down` |
| Tag image | `docker tag guardstone-console:latest registry/guardstone-console:1.0.0` |
| Push image | `docker push registry/guardstone-console:1.0.0` |

## Kubernetes - Raw Manifests

| Task | Command |
|------|---------|
| Deploy | `pnpm run k8s:deploy` |
| Check status | `pnpm run k8s:status` |
| View logs | `kubectl logs -f deployment/guardstone-console` |
| Port forward | `kubectl port-forward svc/guardstone-console 3000:80` |
| Scale pods | `kubectl scale deployment/guardstone-console --replicas=5` |
| Restart | `kubectl rollout restart deployment/guardstone-console` |
| Undo changes | `kubectl rollout undo deployment/guardstone-console` |

## Helm - Recommended for Production

| Task | Command |
|------|---------|
| Validate chart | `helm lint helm/` |
| Preview install | `helm template guardstone-console ./helm` |
| Install | `pnpm run helm:install` |
| Upgrade | `pnpm run helm:upgrade` |
| Uninstall | `pnpm run helm:uninstall` |
| View values | `helm values guardstone-console` |
| Rollback | `helm rollback guardstone-console 1` |

## Environment Variables - Key Settings

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.phishx.io

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_LOG_LEVEL=error

# Analytics & Monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project-id

# Application
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Kubernetes Secrets Setup

```bash
kubectl create secret generic guardstone-secrets \
  --from-literal=sentry-dsn='https://key@sentry.io/id' \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...' \
  --from-literal=jwt-secret='your-secret'
```

## Common Troubleshooting

| Issue | Solution |
|-------|----------|
| Pod stuck in CrashLoopBackOff | `kubectl logs <pod>` + Check image + Check resources |
| Can't connect to app | `kubectl port-forward` + Check ingress + Check service |
| OOMKilled (out of memory) | Increase memory limit in values.yaml |
| High CPU usage | Check logs + Optimize code + Increase CPU requests |
| Images pull slow | Use image cache + Reduce image size + Use registry mirror |
| Helm install fails | `helm lint helm/` + Check values.yaml syntax |

## Status Checks

```bash
# Comprehensive status
kubectl get all -l app=guardstone-console

# Pod details
kubectl describe pod -l app=guardstone-console

# Events & logs
kubectl get events --sort-by='.lastTimestamp'
kubectl logs -f deployment/guardstone-console

# Metrics (requires metrics-server)
kubectl top pods -l app=guardstone-console
kubectl top nodes

# HPA scaling status
kubectl get hpa -l app=guardstone-console -w
```

## Monitoring & Health

```bash
# Application health
curl http://localhost:3000/
curl http://localhost:3000/api/health

# Sentry integration
# Configure: setenv NEXT_PUBLIC_SENTRY_DSN "your-dsn"
# Errors auto-reported to Sentry dashboard

# Web Vitals
# Automatically collected if NEXT_PUBLIC_ENABLE_ANALYTICS=true
# Metrics: LCP, FID, CLS, FCP, TTFB
```

## Deployment Flow

```
1. Update code → 2. Run tests
3. Build image → 4. Push to registry
5. Update Helm values → 6. Deploy/Upgrade
7. Verify pods running → 8. Test endpoint
9. Monitor logs & metrics → 10. Done! ✓
```

## Resource Allocation

### Requests (guaranteed)
- CPU: 250m (0.25 core)
- Memory: 256 Mi

### Limits (max allowed)
- CPU: 500m (0.5 core)
- Memory: 512 Mi

### Scaling
- Min replicas: 2
- Max replicas: 10
- Scale up at: 70% CPU or 80% memory

## Critical Files

```
📁 Deployment
  ├─ DEPLOYMENT.md (complete guide)
  ├─ DEPLOYMENT_CHECKLIST.md (pre/post checks)
  ├─ DEPLOYMENT_READY.md (this summary)
  └─ deploy.sh / deploy.bat (automation scripts)

📁 Docker
  ├─ Dockerfile
  ├─ .dockerignore
  └─ docker-compose.yml

📁 Kubernetes
  ├─ k8s/
  │  ├─ deployment.yaml
  │  ├─ service.yaml
  │  ├─ ingress.yaml
  │  ├─ configmap.yaml
  │  └─ hpa.yaml
  └─ helm/
     ├─ Chart.yaml
     ├─ values.yaml
     └─ templates/

📁 Monitoring
  ├─ src/lib/sentry.ts
  └─ src/lib/performance-monitor.ts
```

## Useful Links

- **Kubernetes CLI**: `kubectl --help`
- **Helm CLI**: `helm --help`
- **Docker CLI**: `docker --help`
- **Sentry Console**: https://sentry.io/
- **Kubernetes Docs**: https://kubernetes.io/docs
- **Helm Hub**: https://artifacthub.io

---

## Deployment Decision Tree

```
                    Ready to Deploy?
                           |
            ┌──────────────┼──────────────┐
            │              │              │
        Local?        Development?   Production?
            │              │              │
        Docker        K8s Raw       Helm (Recommended)
        Compose       Manifests              │
            │              │                 │
        docker-          kubectl apply    helm install
        compose up      -f ../k8s/        ./helm
            │              │                 │
            └──────────────┼─────────────────┘
                           │
                 Check status: kubectl get all
                           │
                      All pods running?
                           │
                           ✓ SUCCESS!
```

---

## Key Helm Values for Customization

| Setting | Default | When to Change |
|---------|---------|----------------|
| `replicaCount` | 3 | More/fewer pod copies |
| `image.tag` | latest | Specific version deployment |
| `config.apiBaseUrl` | staging | Production API endpoint |
| `ingress.hosts[0]` | guardstone.example.com | Your domain |
| `autoscaling.maxReplicas` | 10 | Handle expected peak load |
| `resources.limits.memory` | 512Mi | If OOMKilled |
| `resources.limits.cpu` | 500m | If CPU constrained |
| `secrets.sentryDsn` | "" | Production error tracking |

---

**Last Updated**: February 18, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
