/**
 * Web Vitals Performance Tracking
 * Monitor Core Web Vitals and custom metrics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals'

interface PerformanceMetrics {
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  ttfb?: number // Time to First Byte
  [key: string]: number | undefined
}

class PerformanceMonitor {
  private static metrics: PerformanceMetrics = {}
  private static enabled =
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'

  /**
   * Initialize Web Vitals tracking
   */
  static initialize() {
    if (!this.enabled) return

    // Track Cumulative Layout Shift
    getCLS((metric: Metric) => {
      this.recordMetric('cls', metric.value)
      this.sendMetric('CLS', metric)
    })

    // Track First Input Delay
    getFID((metric: Metric) => {
      this.recordMetric('fid', metric.value)
      this.sendMetric('FID', metric)
    })

    // Track First Contentful Paint
    getFCP((metric: Metric) => {
      this.recordMetric('fcp', metric.value)
      this.sendMetric('FCP', metric)
    })

    // Track Largest Contentful Paint
    getLCP((metric: Metric) => {
      this.recordMetric('lcp', metric.value)
      this.sendMetric('LCP', metric)
    })

    // Track Time to First Byte
    getTTFB((metric: Metric) => {
      this.recordMetric('ttfb', metric.value)
      this.sendMetric('TTFB', metric)
    })
  }

  /**
   * Record metric locally
   */
  private static recordMetric(name: string, value: number) {
    this.metrics[name] = value

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name.toUpperCase()}: ${value.toFixed(2)}ms`)
    }
  }

  /**
   * Send metric to analytics service
   */
  private static sendMetric(name: string, metric: Metric) {
    if (!this.enabled) return

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[VITALS] ${name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      })
    }

    // Send to external service (Sentry, DataDog, etc.)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const { setTag } = require('./sentry')
        setTag(`web_vital_${name}`, metric.value.toFixed(2))
      } catch (err) {
        // Sentry not available
      }
    }

    // Send to custom analytics endpoint
    this.sendToAnalytics(name, metric)
  }

  /**
   * Send metric to custom analytics endpoint
   */
  private static async sendToAnalytics(name: string, metric: Metric) {
    try {
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          timestamp: Date.now(),
        })

        navigator.sendBeacon('/api/metrics', data)
      }
    } catch (err) {
      console.error('Failed to send analytics:', err)
    }
  }

  /**
   * Get all recorded metrics
   */
  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Track custom metric
   */
  static trackCustomMetric(name: string, value: number) {
    this.recordMetric(name, value)

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const { setTag } = require('./sentry')
        setTag(`custom_${name}`, value.toFixed(2))
      } catch (err) {
        // Sentry not available
      }
    }
  }

  /**
   * Track page view
   */
  static trackPageView(path: string) {
    if (!this.enabled) return

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PAGE] ${path}`)
    }

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/page-view', JSON.stringify({ path }))
      }
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Track user interaction
   */
  static trackInteraction(action: string, category: string) {
    if (!this.enabled) return

    if (process.env.NODE_ENV === 'development') {
      console.log(`[INTERACTION] ${category}: ${action}`)
    }

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/interaction',
          JSON.stringify({ action, category, timestamp: Date.now() })
        )
      }
    } catch (err) {
      // Ignore
    }
  }
}

export default PerformanceMonitor
