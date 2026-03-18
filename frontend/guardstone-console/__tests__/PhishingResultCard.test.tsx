/**
 * PhishingResultCard Component Tests
 * Frontend Developer: AI Co-worker
 * Tests: risk badge rendering, score display, verdict logic
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Component Definition ───────────────────────────────────────────────────
// Inline the component here so the test is self-contained until the
// component file is created at src/components/PhishingResultCard.tsx

interface PhishingResultProps {
  url: string
  score: number
  verdict?: string
  scannedAt?: string
}

function PhishingResultCard({ url, score, verdict, scannedAt }: PhishingResultProps) {
  const isPhishing = score > 0.8
  const isSafe = score < 0.2
  const label = isPhishing ? 'PHISHING' : isSafe ? 'SAFE' : 'SUSPICIOUS'
  const badgeColor = isPhishing ? '#ef4444' : isSafe ? '#22c55e' : '#f59e0b'

  return (
    <div data-testid="result-card">
      <div data-testid="scanned-url">{url}</div>
      <div
        data-testid="verdict-badge"
        style={{ background: badgeColor, color: '#fff', padding: '4px 8px' }}
      >
        {label}
      </div>
      <div data-testid="risk-score">{(score * 100).toFixed(0)}%</div>
      {scannedAt && <div data-testid="scanned-at">{scannedAt}</div>}
    </div>
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PhishingResultCard', () => {
  describe('PHISHING verdict (score > 0.8)', () => {
    it('renders PHISHING badge for high-risk score', () => {
      render(<PhishingResultCard url="http://malicious.xyz" score={0.95} />)
      expect(screen.getByTestId('verdict-badge')).toHaveTextContent('PHISHING')
    })

    it('shows red badge for phishing verdict', () => {
      render(<PhishingResultCard url="http://malicious.xyz" score={0.95} />)
      const badge = screen.getByTestId('verdict-badge')
      expect(badge).toHaveStyle({ background: '#ef4444' })
    })

    it('displays the correct risk score percentage', () => {
      render(<PhishingResultCard url="http://malicious.xyz" score={0.95} />)
      expect(screen.getByTestId('risk-score')).toHaveTextContent('95%')
    })
  })

  describe('SAFE verdict (score < 0.2)', () => {
    it('renders SAFE badge for low-risk score', () => {
      render(<PhishingResultCard url="http://trusted.com" score={0.05} />)
      expect(screen.getByTestId('verdict-badge')).toHaveTextContent('SAFE')
    })

    it('shows green badge for safe verdict', () => {
      render(<PhishingResultCard url="http://trusted.com" score={0.05} />)
      const badge = screen.getByTestId('verdict-badge')
      expect(badge).toHaveStyle({ background: '#22c55e' })
    })
  })

  describe('SUSPICIOUS verdict (0.2 ≤ score ≤ 0.8)', () => {
    it('renders SUSPICIOUS badge for mid-range score', () => {
      render(<PhishingResultCard url="http://unknown.net" score={0.55} />)
      expect(screen.getByTestId('verdict-badge')).toHaveTextContent('SUSPICIOUS')
    })
  })

  describe('URL display', () => {
    it('renders the scanned URL', () => {
      render(<PhishingResultCard url="http://phish-test.com" score={0.9} />)
      expect(screen.getByTestId('scanned-url')).toHaveTextContent('http://phish-test.com')
    })
  })

  describe('Timestamp', () => {
    it('shows scanned-at when provided', () => {
      render(
        <PhishingResultCard
          url="http://test.com"
          score={0.5}
          scannedAt="2026-03-18T10:00:00Z"
        />
      )
      expect(screen.getByTestId('scanned-at')).toBeInTheDocument()
    })

    it('omits timestamp when not provided', () => {
      render(<PhishingResultCard url="http://test.com" score={0.5} />)
      expect(screen.queryByTestId('scanned-at')).not.toBeInTheDocument()
    })
  })
})
