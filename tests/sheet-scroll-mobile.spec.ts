import { expect, test, type Page } from '@playwright/test'

async function gotoHomeAndScroll(page: Page, scrollY: number) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main article').first()).toBeVisible()
  await page.waitForTimeout(400)
  await page.evaluate((y) => window.scrollTo(0, y), scrollY)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThanOrEqual(scrollY - 2)
}

async function openFirstNuggetSheet(page: Page) {
  const href = await page.locator('main article').first().evaluate((article) => {
    const link = article.querySelector<HTMLAnchorElement>('a[href^="/nuggets/"]')
    return link?.getAttribute('href') ?? null
  })
  expect(href).toBeTruthy()
  await page.locator(`main article a[href="${href}"]`).first().click()
  const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
  await expect(dialog).toBeVisible()
  return { dialog, href: href as string }
}

async function tapBottomNavItem(page: Page, label: string) {
  const nav = page.getByRole('navigation', { name: 'Primary destinations' })
  await expect(nav).toBeVisible()
  await nav.getByRole('link', { name: label }).click()
}

test.describe('mobile nugget sheet scroll', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('locks background scroll and restores feed position on close', async ({ page }) => {
    const targetScroll = 480
    await gotoHomeAndScroll(page, targetScroll)

    const { dialog } = await openFirstNuggetSheet(page)

    await expect
      .poll(() => page.evaluate(() => document.body.style.position))
      .toBe('fixed')

    const lockedTop = await page.evaluate(() => document.body.style.top)
    expect(lockedTop).toMatch(/^-/)

    await page.mouse.wheel(0, 400)
    const feedScrollWhileOpen = await page.evaluate(() => window.scrollY)
    expect(feedScrollWhileOpen).toBe(0)

    const sheetBody = dialog.locator('[data-sheet-body]')
    await sheetBody.evaluate((el) => {
      el.scrollTop = 120
    })
    await expect
      .poll(() => sheetBody.evaluate((el) => el.scrollTop))
      .toBeGreaterThanOrEqual(100)

    await dialog.getByRole('button', { name: 'Close nugget detail' }).click()
    await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThanOrEqual(targetScroll - 24)
  })

  test('sheet body is the scroll container with overscroll containment', async ({ page }) => {
    await gotoHomeAndScroll(page, 0)
    const { dialog } = await openFirstNuggetSheet(page)

    const sheetBody = dialog.locator('[data-sheet-body]')
    await expect(sheetBody).toBeVisible()

    const overflowY = await sheetBody.evaluate((el) => getComputedStyle(el).overflowY)
    const overscroll = await sheetBody.evaluate((el) => getComputedStyle(el).overscrollBehaviorY)

    expect(overflowY).toBe('auto')
    expect(overscroll).toContain('contain')
  })

  test('resets feed scroll to top when switching streams', async ({ page }) => {
    await gotoHomeAndScroll(page, 1200)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThanOrEqual(500)

    await tapBottomNavItem(page, 'Market Pulse')
    await expect(page).toHaveURL(/\/\?stream=pulse/)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(24)

    await page.evaluate(() => window.scrollTo(0, 1000))
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThanOrEqual(500)

    await tapBottomNavItem(page, 'Nuggets')
    await expect(page).toHaveURL(/\/\?stream=standard/)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(24)
  })
})
