import { test, expect } from '@playwright/test'

// Playwright CSS locators pierce open shadow roots, so these reach the NitPik UI directly.
const trigger = (page) => page.locator('[data-nitpik-trigger]')

async function openPopoverOn(page, selector) {
  await page.locator(selector).first().hover()
  const t = trigger(page).first()
  await expect(t).toBeVisible()
  await t.click()
  await expect(page.locator('[data-nitpik-popover]')).toBeVisible()
}

async function comment(page, selector, text) {
  await openPopoverOn(page, selector)
  await page.locator('[data-nitpik-popover] textarea').fill(text)
  await page.locator('[data-nitpik-popover] button[type="submit"]').click()
}

test.describe('NitPik e2e', () => {
  test('initializes a shadow host', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await expect(page.locator('div[data-nitpik-host]')).toHaveCount(1)
    const hasShadow = await page.evaluate(() => !!document.querySelector('[data-nitpik-host]').shadowRoot)
    expect(hasShadow).toBe(true)
  })

  test('trigger appears on hover', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await page.locator('h1').hover()
    await expect(trigger(page).first()).toBeVisible()
  })

  test('clicking trigger opens popover', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await openPopoverOn(page, 'h1')
    await expect(page.locator('[data-nitpik-popover] textarea')).toBeVisible()
  })

  test('submit shows toast and updates counter', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await comment(page, 'h1', 'Great headline')
    await expect(page.locator('[data-nitpik-toast]')).toContainText('Copied')
    await expect(page.locator('[data-nitpik-counter]')).toContainText('1 comment')
    await expect(page.locator('[data-nitpik-popover]')).toHaveCount(0)
  })

  test('counter click expands the comment panel', async ({ page }) => {
    await page.goto('/examples/collect.html')
    await comment(page, 'h1', 'Panel check')
    await page.locator('[data-nitpik-counter]').click()
    const panel = page.locator('[data-nitpik-panel]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Panel check')
  })

  test('Escape closes the popover', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await openPopoverOn(page, 'h1')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-nitpik-popover]')).toHaveCount(0)
  })

  test('destroy removes all UI traces', async ({ page }) => {
    await page.goto('/examples/basic.html')
    await comment(page, 'h1', 'Soon gone')
    await page.evaluate(() => window.NitPik.destroy())
    await expect(page.locator('[data-nitpik-host]')).toHaveCount(0)
    const leftovers = await page.evaluate(() => document.querySelectorAll('[data-nitpik-commented]').length)
    expect(leftovers).toBe(0)
    const outline = await page.locator('h1').evaluate((el) => el.style.outline)
    expect(outline).toBe('')
  })

  test('collect mode: comments accumulate and export works', async ({ page }) => {
    await page.goto('/examples/collect.html')
    await comment(page, 'h1', 'First note')
    await comment(page, 'h2 >> nth=0', 'Second note')
    await expect(page.locator('[data-nitpik-counter]')).toContainText('2 comments')

    const md = await page.evaluate(() => window.NitPik.exportMarkdown())
    expect(md).toContain('First note')
    expect(md).toContain('Second note')
    const json = JSON.parse(await page.evaluate(() => window.NitPik.exportJSON()))
    expect(json.comments).toHaveLength(2)

    await page.locator('[data-nitpik-counter]').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-nitpik-panel] button', { hasText: 'Export JSON' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })
})
