/**
 * Template Store Tests
 */

import { renderHook, act } from '@testing-library/react'
import { useTemplateStore } from '@/stores/templateStore'
import { mockTemplate } from '@/utils/test-utils'

describe('useTemplateStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTemplateStore.setState({
      templates: [],
      selectedTemplate: null,
      loading: false,
    })
  })

  describe('template management', () => {
    it('adds a new template', () => {
      const { result } = renderHook(() => useTemplateStore())
      const newTemplate = mockTemplate({ id: 'new-1' })

      act(() => {
        result.current.addTemplate(newTemplate)
      })

      expect(result.current.templates).toContainEqual(newTemplate)
    })

    it('removes a template by id', () => {
      const { result } = renderHook(() => useTemplateStore())
      const template = mockTemplate({ id: 'remove-me' })

      act(() => {
        result.current.addTemplate(template)
      })

      expect(result.current.templates).toHaveLength(1)

      act(() => {
        result.current.removeTemplate('remove-me')
      })

      expect(result.current.templates).toHaveLength(0)
    })

    it('updates an existing template', () => {
      const { result } = renderHook(() => useTemplateStore())
      const template = mockTemplate({ id: 'update-me', name: 'Original' })

      act(() => {
        result.current.addTemplate(template)
      })

      act(() => {
        result.current.updateTemplate({ ...template, name: 'Updated' })
      })

      expect(result.current.templates[0].name).toBe('Updated')
    })

    it('sets multiple templates', () => {
      const { result } = renderHook(() => useTemplateStore())
      const templates = [
        mockTemplate({ id: 't1' }),
        mockTemplate({ id: 't2' }),
      ]

      act(() => {
        result.current.setTemplates(templates)
      })

      expect(result.current.templates).toEqual(templates)
    })
  })

  describe('template selection', () => {
    it('selects a template', () => {
      const { result } = renderHook(() => useTemplateStore())
      const template = mockTemplate({ id: 'select-me' })

      act(() => {
        result.current.selectTemplate(template)
      })

      expect(result.current.selectedTemplate).toEqual(template)
    })

    it('deselects template', () => {
      const { result } = renderHook(() => useTemplateStore())
      const template = mockTemplate({ id: 'select-me' })

      act(() => {
        result.current.selectTemplate(template)
      })

      expect(result.current.selectedTemplate).not.toBeNull()

      act(() => {
        result.current.deselectTemplate()
      })

      expect(result.current.selectedTemplate).toBeNull()
    })
  })

  describe('usage tracking', () => {
    it('increments usage count', () => {
      const { result } = renderHook(() => useTemplateStore())
      const template = mockTemplate({ id: 'track-usage', usageCount: 0 })

      act(() => {
        result.current.addTemplate(template)
      })

      expect(result.current.templates[0].usageCount).toBe(0)

      act(() => {
        result.current.incrementUsageCount('track-usage')
      })

      expect(result.current.templates[0].usageCount).toBe(1)

      act(() => {
        result.current.incrementUsageCount('track-usage')
      })

      expect(result.current.templates[0].usageCount).toBe(2)
    })

    it('updates timestamp when incrementing usage', () => {
      const { result } = renderHook(() => useTemplateStore())
      const oldTime = '2020-01-01T00:00:00Z'
      const template = mockTemplate({
        id: 'track-time',
        updatedAt: oldTime,
      })

      act(() => {
        result.current.addTemplate(template)
      })

      act(() => {
        result.current.incrementUsageCount('track-time')
      })

      expect(result.current.templates[0].updatedAt).not.toBe(oldTime)
    })
  })

  describe('filtering', () => {
    it('filters templates by type', () => {
      const { result } = renderHook(() => useTemplateStore())
      const templates = [
        mockTemplate({ id: 't1', type: 'investigation' }),
        mockTemplate({ id: 't2', type: 'response' }),
        mockTemplate({ id: 't3', type: 'investigation' }),
      ]

      act(() => {
        result.current.setTemplates(templates)
      })

      const investigationTemplates = result.current.getTemplatesByType(
        'investigation'
      )
      expect(investigationTemplates).toHaveLength(2)
      expect(investigationTemplates.every(t => t.type === 'investigation')).toBe(
        true
      )
    })

    it('filters templates by category', () => {
      const { result } = renderHook(() => useTemplateStore())
      const templates = [
        mockTemplate({ id: 't1', category: 'phishing' }),
        mockTemplate({ id: 't2', category: 'bec' }),
        mockTemplate({ id: 't3', category: 'phishing' }),
      ]

      act(() => {
        result.current.setTemplates(templates)
      })

      const phishingTemplates = result.current.getTemplatesByCategory('phishing')
      expect(phishingTemplates).toHaveLength(2)
      expect(phishingTemplates.every(t => t.category === 'phishing')).toBe(true)
    })

    it('searches templates by name and description', () => {
      const { result } = renderHook(() => useTemplateStore())
      const templates = [
        mockTemplate({
          id: 't1',
          name: 'Phishing Investigation',
          description: 'Standard phishing case',
        }),
        mockTemplate({
          id: 't2',
          name: 'BEC Response',
          description: 'Business email compromise',
        }),
      ]

      act(() => {
        result.current.setTemplates(templates)
      })

      const phishingResults = result.current.searchTemplates('phishing')
      expect(phishingResults).toHaveLength(1)
      expect(phishingResults[0].id).toBe('t1')
    })

    it('searches templates by tags', () => {
      const { result } = renderHook(() => useTemplateStore())
      const templates = [
        mockTemplate({ id: 't1', tags: ['urgent', 'phishing'] }),
        mockTemplate({ id: 't2', tags: ['routine', 'bec'] }),
      ]

      act(() => {
        result.current.setTemplates(templates)
      })

      const urgentResults = result.current.searchTemplates('urgent')
      expect(urgentResults).toHaveLength(1)
      expect(urgentResults[0].id).toBe('t1')
    })
  })

  describe('loading state', () => {
    it('sets loading state', () => {
      const { result } = renderHook(() => useTemplateStore())

      expect(result.current.loading).toBe(false)

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.loading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.loading).toBe(false)
    })
  })
})
