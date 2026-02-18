# Guardstone Console - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Installation

```bash
cd guardstone-console
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and update with your settings:

```bash
cp .env.example .env.local
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Default Credentials (Development)

```
Email: analyst@guardstone.com
Password: demo123
```

## 📋 Common Tasks

### Add a New Component

```bash
# Create in src/components/
touch src/components/MyComponent.tsx
```

```typescript
'use client';

import React from 'react';
import { useAuthStore } from '@/stores';
import { Permission } from '@/types';
import { useHasPermission } from '@/components/ProtectedRoute';

export function MyComponent() {
  const canView = useHasPermission(Permission.VIEW_ALERTS);
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold">My Component</h1>
      {/* Component content */}
    </div>
  );
}
```

### Create a New Store

```bash
touch src/stores/myStore.ts
```

```typescript
import { create } from 'zustand';

interface MyStoreState {
  items: string[];
  addItem: (item: string) => void;
  removeItem: (item: string) => void;
}

export const useMyStore = create<MyStoreState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (item) => set((state) => ({
    items: state.items.filter(i => i !== item)
  })),
}));
```

### Add API Route with RBAC

```bash
mkdir -p src/app/api/myresource
touch src/app/api/myresource/route.ts
```

```typescript
import { NextRequest } from 'next/server';
import { Permission } from '@/types';
import { withPermission, successResponse } from '@/lib/api-utils';

export const GET = withPermission(Permission.VIEW_ALERTS, async (request, user) => {
  // Your handler code
  return successResponse({ message: 'Hello from API' });
});
```

### Subscribe to Real-time Updates

```typescript
import { useRealtimeAlerts, useWebSocketConnectionStatus } from '@/hooks/useWebSocket';

function MyComponent() {
  const isConnected = useWebSocketConnectionStatus();

  useRealtimeAlerts((message) => {
    console.log('Alert update:', message);
    // Handle alert update
  });

  return (
    <div>
      Status: {isConnected ? '✓ Connected' : '✕ Disconnected'}
    </div>
  );
}
```

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Check Coverage

```bash
npm run test:coverage
```

## 🏗️ Building for Production

```bash
# Build
npm run build

# Start production server
npm start

# With environment variables
NODE_ENV=production npm start
```

## 🔍 Debugging

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Browser DevTools

- React DevTools: Browser extension for React debugging
- Redux DevTools: Can be extended for Zustand
- Network tab: Monitor WebSocket connections

## 📱 Mobile Responsive

The application is built with Tailwind CSS and is responsive by default.

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

## ♿ Accessibility

Use semantic HTML and ARIA attributes:

```typescript
<button
  aria-label="Close modal"
  onClick={handleClose}
>
  ×
</button>

<div role="alert" className="bg-red-50">
  Error message
</div>
```

## 💾 Database Integration

### Setup PostgreSQL (Example)

```bash
npm install pg
npm install @types/pg --save-dev
```

```typescript
// src/lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
```

## 🔐 Authentication Integration

### With NextAuth.js

```bash
npm install next-auth
```

### With OAuth (Google, GitHub)

See NextAuth.js documentation for provider setup.

## 📊 Monitoring & Logging

### Application Monitoring

```typescript
import { getConfig, getLogLevel } from '@/lib/config';

const config = getConfig();
if (config.logging.level === 'debug') {
  console.log('Debug message');
}
```

### Error Tracking (Sentry Example)

```bash
npm install @sentry/nextjs
```

Initialize in `next.config.ts`:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(
  nextConfig,
  { org: "your-org", project: "your-project" }
);
```

## 🚢 Deployment

### Vercel (Recommended for Next.js)

```bash
npm install -g vercel

vercel login
vercel deploy
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t guardstone-console .
docker run -p 3000:3000 guardstone-console
```

### AWS ECS/EKS

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guardstone-console
spec:
  replicas: 3
  selector:
    matchLabels:
      app: guardstone-console
  template:
    metadata:
      labels:
        app: guardstone-console
    spec:
      containers:
      - name: guardstone-console
        image: yourregistry/guardstone-console:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
```

## 🆘 Troubleshooting

### WebSocket Connection Issues

```typescript
// Check connection
const { error, reconnect } = useWebSocketConnection({
  url: process.env.NEXT_PUBLIC_WS_URL!,
  token: authToken,
});

if (error) {
  console.error('WebSocket error:', error);
  reconnect(); // Manually reconnect
}
```

### CORS Issues

Update `CORS_ORIGINS` in `.env.local`:

```env
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

### Performance Issues

1. Check Network tab for slow requests
2. Monitor store sizes - avoid large state objects
3. Use React Profiler to identify slow components
4. Implement pagination for large datasets

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [TypeScript Docs](https://www.typescriptlang.org)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🎯 Next Milestones

- [ ] Connect to real alert sources
- [ ] Implement email/Slack notifications
- [ ] Set up database backend
- [ ] Deploy to production
- [ ] Configure SSL/TLS
- [ ] Set up monitoring and alerting
- [ ] Integrate with SIEM tools
- [ ] Custom dashboard themes

## 💬 Getting Help

- Check [GUARDSTONE_ARCHITECTURE.md](./GUARDSTONE_ARCHITECTURE.md) for detailed documentation
- Review component examples in `src/components/`
- Check GitHub issues and discussions
- Contact the development team

---

Happy securing! 🔒

**Version**: 1.0.0
**Last Updated**: 2026-02-18
