/**
 * TopSendersWidget Tests
 */

import { render, screen } from '@/utils/test-utils'
import TopSendersWidget from '@/components/widgets/TopSendersWidget'

describe('TopSendersWidget', () => {
  it('renders widget title', () => {
    render(<TopSendersWidget />)
    expect(screen.getByText(/Suspicious Senders/)).toBeInTheDocument()
  })

  it('displays sender data table', () => {
    render(<TopSendersWidget />)
    expect(screen.getByText(/attacker@evil.com/)).toBeInTheDocument()
  })

  it('shows risk scores with appropriate badges', () => {
    render(<TopSendersWidget />)
    const elements = screen.getAllByText(/8\.5|7\.2|6\.8|5\.1/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('displays refresh timestamp', () => {
    render(<TopSendersWidget />)
    expect(screen.getByText(/Last refreshed/)).toBeInTheDocument()
  })

  it('renders within Card component', () => {
    const { container } = render(<TopSendersWidget />)
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument()
  })

  it('shows exactly 5 senders in the list', () => {
    render(<TopSendersWidget />)
    const rows = screen.getAllByRole('row')
    // Header row + 5 data rows = 6
    expect(rows.length).toBe(6)
  })
})
