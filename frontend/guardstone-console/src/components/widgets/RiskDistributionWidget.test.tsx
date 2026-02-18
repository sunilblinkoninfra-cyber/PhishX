/**
 * RiskDistributionWidget Tests
 */

import { render, screen } from '@/utils/test-utils'
import RiskDistributionWidget from '@/components/widgets/RiskDistributionWidget'

describe('RiskDistributionWidget', () => {
  it('renders widget title', () => {
    render(<RiskDistributionWidget />)
    expect(screen.getByText(/Risk Distribution/)).toBeInTheDocument()
  })

  it('displays risk level statistics', () => {
    render(<RiskDistributionWidget />)
    expect(screen.getByText(/HOT|WARM|COLD/)).toBeInTheDocument()
  })

  it('shows progress bars for each risk level', () => {
    const { container } = render(<RiskDistributionWidget />)
    const progressBars = container.querySelectorAll('[style*="width"]')
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('displays percentage values', () => {
    render(<RiskDistributionWidget />)
    const percentages = screen.getAllByText(/%/)
    expect(percentages.length).toBeGreaterThan(0)
  })

  it('shows trend indicator', () => {
    render(<RiskDistributionWidget />)
    expect(screen.getByText(/Trend:|↑|↓/)).toBeInTheDocument()
  })

  it('displays total item count', () => {
    render(<RiskDistributionWidget />)
    const totalText = screen.getByText(/Total:|items/)
    expect(totalText).toBeInTheDocument()
  })
})
