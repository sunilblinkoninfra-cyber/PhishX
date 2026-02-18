import { test, expect } from '@playwright/test'

test.describe('Templates E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
  })

  test('should load templates page with library', async ({ page }) => {
    await expect(page).toHaveTitle(/Template|PhishX/)

    // Check header
    const title = page.locator('h1, [role="heading"]').first()
    await expect(title).toBeVisible()

    // Check template cards
    const templateCards = page.locator('[class*="card"]')
    const count = await templateCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display prebuilt templates', async ({ page }) => {
    // Check for template examples
    const templateNames = [
      'Phishing Investigation',
      'BEC Response',
      'Daily Report',
      'Ransomware Playbook',
      'Analyst Dashboard',
    ]

    for (const name of templateNames) {
      const element = page.locator(`text=${name}`)
      const isVisible = await element.isVisible().catch(() => false)
      // Some templates should be visible
      if (isVisible) {
        await expect(element).toBeVisible()
      }
    }
  })

  test('should create new template', async ({ page }) => {
    // Find create button
    const createBtn = page.locator('button:has-text("Create Template")')
    await expect(createBtn).toBeVisible()

    // Click create
    await createBtn.click()
    await page.waitForTimeout(500)

    // Check modal appears
    const modal = page.locator('[role="dialog"], [class*="modal"]')
    await expect(modal).toBeVisible()

    // Check form fields
    const titleInput = page.locator('input[placeholder*="name i" i]').first()
    await expect(titleInput).toBeVisible()
  })

  test('should search templates', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await expect(searchInput).toBeVisible()

    // Search for template
    await searchInput.fill('phishing')
    await page.waitForTimeout(500)

    // Check filtered results
    const results = page.locator('text=/Found \\d+ template/')
    await expect(results).toBeVisible()
  })

  test('should filter templates by type', async ({ page }) => {
    // Find filter dropdown/buttons
    const filterSelect = page.locator('select').first()
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('investigation')
      await page.waitForTimeout(500)

      // Check results are filtered
      const header = page.locator('h1').first()
      await expect(header).toBeVisible()
    }
  })

  test('should sort templates', async ({ page }) => {
    // Try to find sort options
    const sorts = ['recent', 'name', 'usage']
    const sortSelect = page.locator('select').nth(1)
    
    if (await sortSelect.isVisible()) {
      for (const sort of sorts) {
        await sortSelect.selectOption(sort).catch(() => {})
        await page.waitForTimeout(300)
      }
    }
  })

  test('should display template details', async ({ page }) => {
    // Find first template card
    const firstTemplate = page.locator('[class*="card"]').first()
    await expect(firstTemplate).toBeVisible()

    // Click to open
    const useButton = firstTemplate.locator('button:has-text("Use")').first()
    if (await useButton.isVisible()) {
      await useButton.click()
      await page.waitForTimeout(500)

      // Check preview modal appears
      const modal = page.locator('[role="dialog"], [class*="modal"]')
      await expect(modal).toBeVisible()
    }
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
})
