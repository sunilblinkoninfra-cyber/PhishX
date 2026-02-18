import { test, expect } from '@playwright/test'

test.describe('ML Insights E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
  })

  test('should load insights page with data', async ({ page }) => {
    await expect(page).toHaveTitle(/Insights|PhishX/)

    // Check header
    const title = page.locator('h1').first()
    await expect(title).toBeVisible()

    // Check insights are displayed
    const insights = page.locator('[class*="card"]')
    const count = await insights.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display insight statistics', async ({ page }) => {
    // Check for stat cards
    const statElements = page.locator('text=/Critical|High|Avg|Total/')
    const count = await statElements.count()
    expect(count).toBeGreaterThan(0)

    // Check numbers are displayed
    const numbers = await page.locator('text=/\\d+/').count()
    expect(numbers).toBeGreaterThan(0)
  })

  test('should display insight severity badges', async ({ page }) => {
    // Check for severity indicators
    const severities = ['critical', 'high', 'medium', 'low']
    let foundSevere = false

    for (const severity of severities) {
      const element = page.locator(`text=${severity}`, { matchCase: false })
      if (await element.isVisible().catch(() => false)) {
        foundSevere = true
        break
      }
    }
    
    expect(foundSevere).toBeTruthy()
  })

  test('should expand insight details', async ({ page }) => {
    // Find first insight card
    const firstInsight = page.locator('[class*="card"]').first()
    await expect(firstInsight).toBeVisible()

    // Look for expand button
    const expandBtn = firstInsight.locator('button:has-text("Show More")').first()
    if (await expandBtn.isVisible()) {
      await expandBtn.click()
      await page.waitForTimeout(300)

      // Check details are visible
      const details = firstInsight.locator('text=/Recommendation|Description|Action/')
      const count = await details.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display confidence scores', async ({ page }) => {
    // Check for confidence indicators
    const confidenceText = page.locator('text=/Confidence|confidence/')
    await expect(confidenceText.first()).toBeVisible()

    // Check for percentage values
    const percentages = page.locator('text=/%/')
    const count = await percentages.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show insight actions', async ({ page }) => {
    // Find action buttons
    const actionBtn = page.locator('button:has-text("Take Action")').first()
    if (await actionBtn.isVisible()) {
      await expect(actionBtn).toBeVisible()

      // Find other action buttons
      const dismissBtn = page.locator('button:has-text("Dismiss")').first()
      if (await dismissBtn.isVisible()) {
        await expect(dismissBtn).toBeVisible()
      }
    }
  })

  test('should display ML model info', async ({ page }) => {
    // Check for model information
    const modelInfo = page.locator('text=/Model|Accuracy|Training/')
    const count = await modelInfo.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    const title = page.locator('h1').first()
    await expect(title).toBeVisible()

    const cards = page.locator('[class*="card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have accessible layout', async ({ page }) => {
    // Check for headings
    const headings = page.locator('h1, h2, h3')
    const count = await headings.count()
    expect(count).toBeGreaterThan(0)

    // Check for accessible buttons
    const buttons = page.locator('button')
    const btnCount = await buttons.count()
    expect(btnCount).toBeGreaterThan(0)
  })
})
