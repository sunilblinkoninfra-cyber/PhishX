/**
 * Sentry Integration
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Initialize Sentry for error tracking and monitoring
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    integrations: [
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate:
      process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate:
      process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION,
  })
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
) {
  if (!SENTRY_DSN) return

  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
  })
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  if (!SENTRY_DSN) return

  Sentry.captureMessage(message, level)
  if (context) {
    Sentry.setContext('custom', context)
  }
}

/**
 * Set user context for tracking
 */
export function setUserContext(userId: string, email?: string, name?: string) {
  if (!SENTRY_DSN) return

  Sentry.setUser({
    id: userId,
    email,
    username: name,
  })
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (!SENTRY_DSN) return

  Sentry.setUser(null)
}

/**
 * Start transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string = 'http.request'
) {
  if (!SENTRY_DSN) return null

  return Sentry.startTransaction({
    name,
    op,
  })
}

/**
 * Set tag for grouping errors
 */
export function setTag(key: string, value: string) {
  if (!SENTRY_DSN) return

  Sentry.setTag(key, value)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
) {
  if (!SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    category: category || 'app',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  })
}

export default Sentry
