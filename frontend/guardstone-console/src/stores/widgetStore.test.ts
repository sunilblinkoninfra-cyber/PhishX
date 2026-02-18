/**
 * Widget Store Tests
 */

import { renderHook, act } from '@testing-library/react'
import { useWidgetStore } from '@/stores/widgetStore'
import { mockWidget } from '@/utils/test-utils'

describe('useWidgetStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWidgetStore.setState({
      widgets: [],
      editMode: false,
      lastRefreshTime: Date.now(),
    })
  })

  describe('widget management', () => {
    it('adds a new widget', () => {
      const { result } = renderHook(() => useWidgetStore())
      const newWidget = mockWidget({ id: 'new-1' })

      act(() => {
        result.current.addWidget(newWidget)
      })

      expect(result.current.widgets).toContainEqual(newWidget)
    })

    it('removes a widget by id', () => {
      const { result } = renderHook(() => useWidgetStore())
      const widget = mockWidget({ id: 'remove-me' })

      act(() => {
        result.current.addWidget(widget)
      })

      expect(result.current.widgets).toHaveLength(1)

      act(() => {
        result.current.removeWidget('remove-me')
      })

      expect(result.current.widgets).toHaveLength(0)
    })

    it('updates an existing widget', () => {
      const { result } = renderHook(() => useWidgetStore())
      const widget = mockWidget({ id: 'update-me', title: 'Original' })

      act(() => {
        result.current.addWidget(widget)
      })

      act(() => {
        result.current.updateWidget({ ...widget, title: 'Updated' })
      })

      expect(result.current.widgets[0].title).toBe('Updated')
    })

    it('sets multiple widgets', () => {
      const { result } = renderHook(() => useWidgetStore())
      const widgets = [mockWidget({ id: 'w1' }), mockWidget({ id: 'w2' })]

      act(() => {
        result.current.setWidgets(widgets)
      })

      expect(result.current.widgets).toEqual(widgets)
    })
  })

  describe('edit mode', () => {
    it('toggles edit mode', () => {
      const { result } = renderHook(() => useWidgetStore())

      expect(result.current.editMode).toBe(false)

      act(() => {
        result.current.setEditMode(true)
      })

      expect(result.current.editMode).toBe(true)

      act(() => {
        result.current.setEditMode(false)
      })

      expect(result.current.editMode).toBe(false)
    })
  })

  describe('widget refresh', () => {
    it('refreshes a single widget', () => {
      const { result } = renderHook(() => useWidgetStore())
      const widget = mockWidget({ id: 'refresh-me' })
      const oldTime = new Date('2020-01-01').toISOString()

      act(() => {
        result.current.addWidget({ ...widget, lastRefreshed: oldTime })
      })

      act(() => {
        result.current.refreshWidget('refresh-me')
      })

      expect(result.current.widgets[0].lastRefreshed).not.toBe(oldTime)
    })

    it('refreshes all widgets', () => {
      const { result } = renderHook(() => useWidgetStore())
      const oldTime = new Date('2020-01-01').toISOString()
      const widgets = [
        mockWidget({ id: 'w1', lastRefreshed: oldTime }),
        mockWidget({ id: 'w2', lastRefreshed: oldTime }),
      ]

      act(() => {
        result.current.setWidgets(widgets)
      })

      act(() => {
        result.current.refreshAllWidgets()
      })

      expect(result.current.widgets.every(w => w.lastRefreshed !== oldTime)).toBe(
        true
      )
    })

    it('returns last refresh time', () => {
      const { result } = renderHook(() => useWidgetStore())

      const beforeTime = Date.now()
      act(() => {
        result.current.refreshAllWidgets()
      })
      const gotTime = result.current.getLastRefreshTime()
      const afterTime = Date.now()

      expect(gotTime).toBeGreaterThanOrEqual(beforeTime)
      expect(gotTime).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('layout management', () => {
    it('reorders widgets by position', () => {
      const { result } = renderHook(() => useWidgetStore())
      const widgets = [
        mockWidget({ id: 'w1', position: { row: 1, col: 0 } }),
        mockWidget({ id: 'w2', position: { row: 0, col: 0 } }),
      ]

      act(() => {
        result.current.setWidgets(widgets)
        result.current.reorderWidgets(widgets)
      })

      // After reordering, w2 (row 0) should come before w1 (row 1)
      expect(result.current.widgets[0].id).toBe('w2')
      expect(result.current.widgets[1].id).toBe('w1')
    })
  })
})
