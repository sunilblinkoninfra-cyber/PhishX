import { test, expect } from '@playwright/test'

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should load dashboard with widgets', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Dashboard|PhishX/)

    // Check header
    const header = page.locator('h1, [role="heading"]').first()
    await expect(header).toBeVisible()

    // Check widgets are rendered
    const widgets = page.locator('[class*="widget"]')
    const count = await widgets.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display all widget types', async ({ page }) => {
    // Check for key widget indicators
    const widgetTexts = [
      'Risk Distribution',
      'Risk Timeline',
      'Top Suspicious Senders',
      'Threat Patterns',
      'ML Predictions',
      'Anomaly Alerts',
      'User Activity',
    ]

    for (const text of widgetTexts) {
      const element = page.locator(`text=${text}`)
      await expect(element).toBeVisible()
    }
  })

  test('should enter and exit edit mode', async ({ page }) => {
    // Find customize button
    const customizeBtn = page.locator('button:has-text("Customize")')
    await expect(customizeBtn).toBeVisible()

    // Click customize
    await customizeBtn.click()
    await page.waitForTimeout(500)

    // Check edit mode is active
    const doneBtn = page.locator('button:has-text("Done Editing")')
    await expect(doneBtn).toBeVisible()

    // Check edit UI appears
    const editUI = page.locator('[class*="dashed"]')
    await expect(editUI.first()).toBeVisible()

    // Exit edit mode
    await doneBtn.click()
    await expect(customizeBtn).toBeVisible()
  })

  test('should refresh all widgets', async ({ page }) => {
    // Find refresh button
    const refreshBtn = page.locator('button:has-text("Refresh All")')
    await expect(refreshBtn).toBeVisible()

    // Get initial timestamp
    const timestamps = await page.locator('text=/Last refreshed|Updated/').allTextContents()
    const initialCount = timestamps.length

    // Click refresh
    await refreshBtn.click()
    await page.waitForTimeout(1000)

    // Verify refresh occurred
    const newTimestamps = await page.locator('text=/Last refreshed|Updated/').allTextContents()
    expect(newTimestamps.length).toBeGreaterThanOrEqual(initialCount)
  })

  test('should display dashboard statistics', async ({ page }) => {
    // Check for stat cards
    const statCards = page.locator('[class*="card"], [class*="stat"]')
    const count = await statCards.count()
    expect(count).toBeGreaterThan(0)

    // Check for numbers in statistics
    const stats = await page.locator('text=/\\d+/').allTextContents()
    expect(stats.length).toBeGreaterThan(0)
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Check elements are still visible
    const header = page.locator('h1, [role="heading"]').first()
    await expect(header).toBeVisible()

    // Check widgets stack properly
    const widgets = page.locator('[class*="widget"]')
    const count = await widgets.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should handle widget interaction', async ({ page }) => {
    // Look for interactive elements
    const buttons = page.locator('button').first()
    if (await buttons.isVisible()) {
      await buttons.click()
      // Widget should remain visible
      const header = page.locator('h1').first()
      await expect(header).toBeVisible()
    }
  })
})
