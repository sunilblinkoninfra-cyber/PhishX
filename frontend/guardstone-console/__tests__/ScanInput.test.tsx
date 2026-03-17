/**
 * URL Scan Input Component Tests
 * Frontend Developer: AI Co-worker
 * Tests: form submission, validation, loading state, API interaction
 */

import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ─── Component ──────────────────────────────────────────────────────────────
interface ScanInputProps {
  onScanResult?: (result: { score: number; url: string }) => void
  apiUrl?: string
}

function ScanInput({ onScanResult, apiUrl = '/api/scan' }: ScanInputProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      setError('Please enter a URL to scan')
      return
    }
    if (!url.startsWith('http')) {
      setError('URL must start with http:// or https://')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      onScanResult?.({ score: data.score, url })
    } catch {
      setError('Scan failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="scan-form">
      <input
        data-testid="url-input"
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Enter URL to scan..."
        aria-label="URL to scan"
        disabled={loading}
      />
      <button
        data-testid="scan-button"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Scanning…' : 'Scan URL'}
      </button>
      {error && <div data-testid="error-message" role="alert">{error}</div>}
    </form>
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ScanInput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders the URL input and scan button', () => {
    render(<ScanInput />)
    expect(screen.getByTestId('url-input')).toBeInTheDocument()
    expect(screen.getByTestId('scan-button')).toBeInTheDocument()
  })

  it('shows validation error for empty submission', async () => {
    render(<ScanInput />)
    fireEvent.click(screen.getByTestId('scan-button'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Please enter a URL to scan'
      )
    })
  })

  it('shows validation error for non-http URL', async () => {
    render(<ScanInput />)
    await userEvent.type(screen.getByTestId('url-input'), 'ftp://bad-protocol.com')
    fireEvent.click(screen.getByTestId('scan-button'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'URL must start with http'
      )
    })
  })

  it('shows loading state during scan', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 500))
    )
    render(<ScanInput />)
    await userEvent.type(screen.getByTestId('url-input'), 'http://test.com')
    fireEvent.click(screen.getByTestId('scan-button'))
    expect(screen.getByTestId('scan-button')).toHaveTextContent('Scanning…')
    expect(screen.getByTestId('url-input')).toBeDisabled()
  })

  it('calls onScanResult with score after successful scan', async () => {
    const mockResult = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ score: 0.95, verdict: 'PHISHING' }),
    })
    render(<ScanInput onScanResult={mockResult} />)
    await userEvent.type(screen.getByTestId('url-input'), 'http://phishing-site.xyz')
    fireEvent.click(screen.getByTestId('scan-button'))
    await waitFor(() => {
      expect(mockResult).toHaveBeenCalledWith({
        score: 0.95,
        url: 'http://phishing-site.xyz',
      })
    })
  })

  it('shows error message when API call fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    render(<ScanInput />)
    await userEvent.type(screen.getByTestId('url-input'), 'http://test.com')
    fireEvent.click(screen.getByTestId('scan-button'))
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Scan failed'
      )
    })
  })
})
