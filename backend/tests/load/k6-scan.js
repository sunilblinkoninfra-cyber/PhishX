/**
 * PhishX k6 Load Test
 * QA Agent: AI Co-worker
 *
 * Usage:
 *   k6 run backend/tests/load/k6-scan.js
 *   k6 run --env BASE_URL=http://localhost:8000 backend/tests/load/k6-scan.js
 *
 * Stages: ramp up → sustained load → spike → ramp down
 * SLA thresholds enforced as k6 pass/fail criteria
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

// ── Custom metrics ────────────────────────────────────────────────
const phishingDetected  = new Counter('phishing_detected')
const safeClassified    = new Counter('safe_classified')
const errorRate         = new Rate('error_rate')
const ingestDuration    = new Trend('ingest_duration', true)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

// ── Load profile ──────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10  },  // Ramp up to 10 users
    { duration: '60s', target: 50  },  // Sustained load: 50 users
    { duration: '20s', target: 100 },  // Spike: 100 users
    { duration: '20s', target: 50  },  // Back to normal
    { duration: '10s', target: 0   },  // Ramp down
  ],

  // ── SLA thresholds (CI fails if breached) ─────────────────────
  thresholds: {
    'http_req_duration{name:health}':        ['p(95)<200'],   // Health: p95 < 200ms
    'http_req_duration{name:ingest}':        ['p(95)<2000'],  // Ingest: p95 < 2s
    'http_req_failed':                       ['rate<0.01'],   // Error rate < 1%
    'ingest_duration':                       ['p(95)<2000'],  // Custom ingest metric
  },
}

// ── Test data ─────────────────────────────────────────────────────
const PHISHING_EMAILS = [
  {
    sender: 'attacker@phish-domain.xyz',
    recipient: 'victim@company.com',
    subject: 'Urgent: Verify your account',
    body: 'Click here: http://paypa1.com/login immediately or your account will be closed.',
    headers: { 'X-Mailer': 'PHPMailer' },
  },
  {
    sender: 'support@amazon-alert.ru',
    recipient: 'customer@corp.com',
    subject: 'Your Amazon account is suspended',
    body: 'Visit http://192.168.1.100/amazon/verify to restore access.',
    headers: {},
  },
]

const SAFE_EMAILS = [
  {
    sender: 'news@github.com',
    recipient: 'dev@company.com',
    subject: 'Your weekly digest',
    body: 'Check out the latest repos at https://github.com/trending',
    headers: { 'List-Unsubscribe': '<mailto:unsubscribe@github.com>' },
  },
]

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Main test scenario ────────────────────────────────────────────
export default function () {
  const headers = { 'Content-Type': 'application/json' }

  // 1. Health check (every iteration)
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { name: 'health' },
  })
  check(healthRes, {
    'health returns 200': r => r.status === 200,
    'health is fast':     r => r.timings.duration < 500,
  })
  errorRate.add(healthRes.status >= 500)

  // 2. Submit phishing email (70% of requests)
  if (Math.random() < 0.7) {
    const payload = JSON.stringify(randomItem(PHISHING_EMAILS))
    const start = Date.now()
    const ingestRes = http.post(`${BASE_URL}/ingest`, payload, {
      headers,
      tags: { name: 'ingest' },
    })
    ingestDuration.add(Date.now() - start)

    const ok = check(ingestRes, {
      'ingest accepted':     r => [200, 202, 422].includes(r.status),
      'ingest not 500':      r => r.status < 500,
    })
    errorRate.add(ingestRes.status >= 500)

    // Track classification if response has verdict
    try {
      const body = JSON.parse(ingestRes.body)
      if (body.verdict === 'PHISHING') phishingDetected.add(1)
      if (body.verdict === 'SAFE')     safeClassified.add(1)
    } catch (_) { /* no verdict in response */ }
  }

  // 3. Submit safe email (30% of requests)
  if (Math.random() < 0.3) {
    const payload = JSON.stringify(randomItem(SAFE_EMAILS))
    const safeRes = http.post(`${BASE_URL}/ingest`, payload, {
      headers,
      tags: { name: 'ingest_safe' },
    })
    check(safeRes, {
      'safe email accepted': r => [200, 202, 422].includes(r.status),
    })
    errorRate.add(safeRes.status >= 500)
  }

  sleep(Math.random() * 2 + 0.5) // 0.5–2.5s think time
}

// ── Summary report ────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'backend/tests/load/k6-report.json': JSON.stringify(data, null, 2),
    stdout: `
PhishX k6 Load Test Summary
============================
Total requests  : ${data.metrics.http_reqs?.values?.count || 0}
Failed requests : ${data.metrics.http_req_failed?.values?.passes || 0}
/health p95     : ${data.metrics['http_req_duration{name:health}']?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms
/ingest p95     : ${data.metrics['http_req_duration{name:ingest}']?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms
Phishing flagged: ${data.metrics.phishing_detected?.values?.count || 0}
`,
  }
}
