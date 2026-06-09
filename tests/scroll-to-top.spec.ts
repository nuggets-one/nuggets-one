import { expect, test, type Page } from '@playwright/test'

async function gotoHomeAndScroll(page: Page, scrollY: number) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.evaluate((y) => {
    window.scrollTo(0, y)
    window.dispatchEvent(new Event('scroll'))
  }, scrollY)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThanOrEqual(scrollY - 2)
}

test.describe('scroll to top FAB', () => {
  test('homepage shows FAB after scroll and returns to top on click', async ({ page }) => {
    await gotoHomeAndScroll(page, 900)

    await page.waitForFunction(() => window.scrollY >= 400)
    const backToTop = page.getByRole('button', { name: 'Back to top' })
    await expect(backToTop).toBeVisible({ timeout: 15_000 })

    await backToTop.click()
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(24)

    await expect(backToTop).toBeHidden()
  })
})
