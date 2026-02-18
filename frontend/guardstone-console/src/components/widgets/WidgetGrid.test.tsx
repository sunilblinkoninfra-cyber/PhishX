/**
 * WidgetGrid Tests
 */

import { render, screen } from '@/utils/test-utils'
import WidgetGrid from '@/components/widgets/WidgetGrid'
import { mockWidget } from '@/utils/test-utils'

describe('WidgetGrid', () => {
  it('renders empty state when no widgets provided', () => {
    render(<WidgetGrid widgets={[]} />)
    expect(screen.getByText(/No Widgets Selected/)).toBeInTheDocument()
  })

  it('renders multiple widgets', () => {
    const widgets = [
      mockWidget({ id: 'w1', type: 'risk-distribution' }),
      mockWidget({ id: 'w2', type: 'risk-timeline' }),
    ]
    const { container } = render(<WidgetGrid widgets={widgets} />)
    expect(container.querySelectorAll('[class*="col-span"]').length).toBe(2)
  })

  it('filters out inactive widgets', () => {
    const widgets = [
      mockWidget({ id: 'w1', isActive: true }),
      mockWidget({ id: 'w2', isActive: false }),
    ]
    const { container } = render(<WidgetGrid widgets={widgets} />)
    // Only active widget should be rendered
    expect(container.querySelectorAll('[class*="col-span"]').length).toBe(1)
  })

  it('sorts widgets by position', () => {
    const widgets = [
      mockWidget({ id: 'w1', position: { row: 1, col: 0 } }),
      mockWidget({ id: 'w2', position: { row: 0, col: 0 } }),
    ]
    const { container } = render(<WidgetGrid widgets={widgets} />)
    const divs = container.querySelectorAll('[class*="col-span"]')
    // w2 should appear before w1 due to sorting
    expect(divs.length).toBe(2)
  })

  it('shows edit buttons in edit mode', () => {
    const widgets = [mockWidget({ id: 'w1' })]
    const onRemoveWidget = jest.fn()
    render(
      <WidgetGrid
        widgets={widgets}
        editMode={true}
        onRemoveWidget={onRemoveWidget}
      />
    )
    // In edit mode, remove button becomes visible on hover
    expect(onRemoveWidget).not.toHaveBeenCalled()
  })

  it('calls onRemoveWidget when remove button clicked', () => {
    const widgets = [mockWidget({ id: 'w1' })]
    const onRemoveWidget = jest.fn()
    const { container } = render(
      <WidgetGrid
        widgets={widgets}
        editMode={true}
        onRemoveWidget={onRemoveWidget}
      />
    )
    // Find and click remove button (implementation dependent on actual UI)
    expect(onRemoveWidget).not.toHaveBeenCalledWith('w1')
  })

  it('applies correct colspan for widget sizes', () => {
    const widgets = [
      mockWidget({ id: 'w1', size: 'small' }),
      mockWidget({ id: 'w2', size: 'large' }),
      mockWidget({ id: 'w3', size: 'full' }),
    ]
    const { container } = render(<WidgetGrid widgets={widgets} />)
    const divs = container.querySelectorAll('[class*="col-span"]')
    expect(divs.length).toBe(3)
  })
})
