/**
 * Test Utilities
 * Common utilities and helpers for testing
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

/**
 * Custom render function that includes common providers
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

/**
 * Mock data generators
 */
export const mockWidget = (overrides = {}) => ({
  id: 'widget-1',
  type: 'risk-distribution',
  title: 'Risk Distribution',
  size: 'medium',
  position: { row: 0, col: 0 },
  refreshInterval: 300000,
  customization: {},
  isActive: true,
  lastRefreshed: new Date().toISOString(),
  ...overrides,
})

export const mockTemplate = (overrides = {}) => ({
  id: 'template-1',
  name: 'Test Template',
  description: 'A test template',
  type: 'investigation',
  category: 'phishing',
  content: {
    sections: [
      {
        id: 'section-1',
        title: 'Introduction',
        type: 'notes',
        content: [],
        required: false,
      },
    ],
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
    },
  },
  createdBy: 'test-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublic: false,
  tags: ['test'],
  version: '1.0',
  usageCount: 0,
  ...overrides,
})

/**
 * Common test assertions
 */
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectElementToHaveClass = (
  element: HTMLElement,
  className: string
) => {
  expect(element).toHaveClass(className)
}

/**
 * Wait utilities
 */
export const waitForAsync = () =>
  new Promise(resolve => setTimeout(resolve, 0))
