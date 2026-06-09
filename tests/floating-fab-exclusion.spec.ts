import { expect, test, type Page } from '@playwright/test'

const defaultYoutubeDetail =
  '/nuggets/f8b4e0d5-5a69-407e-84fe-85d522604ff5/andy-haldane-the-uk-economy-is-fixable-heres-how-27-apr-2026-merryn-talks-money-bloomberg-f8b4e0'

async function scrollDocument(page: Page, scrollY: number) {
  await page.evaluate((y) => {
    window.scrollTo(0, y)
    window.dispatchEvent(new Event('scroll'))
  }, scrollY)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(scrollY - 2)
}

async function scrollSheetBody(page: Page, dialog: ReturnType<Page['getByRole']>, scrollTop: number) {
  const sheetBody = dialog.locator('[data-sheet-body]')
  await sheetBody.evaluate((el, top) => {
    el.scrollTop = top
    el.dispatchEvent(new Event('scroll'))
  }, scrollTop)
  await expect
    .poll(() => sheetBody.evaluate((el) => el.scrollTop))
    .toBeGreaterThanOrEqual(Math.min(scrollTop, 100))
}

test.describe('floating FAB exclusion — desktop full page', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('jump FAB hides back to top; closing player leaves one back to top', async ({ page }) => {
    const detailPath = process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultYoutubeDetail
    await page.goto(detailPath, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#nugget-youtube-hero')).toBeVisible()

    await scrollDocument(page, 900)

    const timestampLink = page.locator('a[href*="#yt="]').first()
    const hasTimestamp = await timestampLink.isVisible().catch(() => false)
    if (!hasTimestamp) {
      test.skip(true, 'No #yt= timestamp links in article body for this nugget.')
    }

    await timestampLink.click()
    await expect(page.getByRole('complementary')).toBeVisible()
    await scrollDocument(page, 1400)

    const jumpFab = page.getByRole('button', { name: 'Jump to video' })
    const backToTop = page.getByRole('button', { name: 'Back to top' })

    await expect(jumpFab).toBeVisible({ timeout: 15_000 })
    await expect(backToTop).toBeHidden()

    await page.getByRole('button', { name: 'Close player' }).click()
    await expect(jumpFab).toHaveCount(0)
    await expect(backToTop).toBeVisible({ timeout: 15_000 })
    expect(await page.getByRole('button', { name: 'Jump to video' }).count()).toBe(0)
  })
})

test.describe('floating FAB exclusion — desktop intercepted sheet', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('at most one bottom FAB while mini player is open', async ({ page }) => {
    const targetHref = process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultYoutubeDetail
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(600)

    const cardLink = page.locator(`main a[href="${targetHref}"]`).first()
    const hasCard = await cardLink.isVisible().catch(() => false)
    if (!hasCard) {
      test.skip(true, 'Target YouTube nugget not on home feed.')
    }

    await cardLink.click()
    const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
    await expect(dialog).toBeVisible()

    const timestampLink = dialog.locator('a[href*="#yt="]').first()
    const hasTimestamp = await timestampLink.isVisible().catch(() => false)
    if (!hasTimestamp) {
      test.skip(true, 'No #yt= timestamp links in sheet body for this nugget.')
    }

    await scrollSheetBody(page, dialog, 900)
    await timestampLink.click()

    const miniPlayer = page.getByRole('complementary')
    const hasMiniPlayer = await miniPlayer.isVisible().catch(() => false)
    if (!hasMiniPlayer) {
      test.skip(true, 'Timestamp did not open the global mini player for this nugget.')
    }

    await scrollSheetBody(page, dialog, 1200)

    const fabCount = await page.evaluate(() => {
      const jump = document.querySelectorAll('[data-youtube-jump-fab]').length
      const top = document.querySelectorAll('[data-scroll-to-top-fab]').length
      return jump + top
    })

    expect(fabCount).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Close player' }).click()
    await expect(page.getByRole('button', { name: 'Jump to video' })).toHaveCount(0)
  })
})
