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

async function assertNoFloatingFabs(page: Page) {
  await expect(page.getByRole('button', { name: 'Back to top' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Jump to video' })).toHaveCount(0)
  const jumpFabCount = await page.evaluate(
    () => document.querySelectorAll('[data-youtube-jump-fab]').length,
  )
  expect(jumpFabCount).toBe(0)
}

async function openYoutubeNuggetSheet(page: Page) {
  const targetHref = process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultYoutubeDetail
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()
  await page.waitForTimeout(600)

  const cardLink = page.locator(`main a[href="${targetHref}"]`).first()
  const hasCard = await cardLink.isVisible().catch(() => false)
  if (!hasCard) {
    return null
  }

  await cardLink.click()
  const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('floating FAB — desktop full page', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('no floating FAB after timestamp click and scroll', async ({ page }) => {
    const detailPath = process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultYoutubeDetail
    await page.goto(detailPath, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#nugget-youtube-hero')).toBeVisible()

    await assertNoFloatingFabs(page)
    await scrollDocument(page, 900)

    const timestampLink = page.locator('a[href*="#yt="]').first()
    const hasTimestamp = await timestampLink.isVisible().catch(() => false)
    if (!hasTimestamp) {
      test.skip(true, 'No #yt= timestamp links in article body for this nugget.')
    }

    await timestampLink.click()
    await expect(page.getByRole('complementary')).toBeVisible()
    await scrollDocument(page, 1400)

    await assertNoFloatingFabs(page)

    await page.getByRole('button', { name: 'Close player' }).click()
    await assertNoFloatingFabs(page)
  })
})

test.describe('floating FAB — desktop intercepted sheet', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('no floating FAB before or after scroll', async ({ page }) => {
    const dialog = await openYoutubeNuggetSheet(page)
    if (!dialog) {
      test.skip(true, 'Target YouTube nugget not on home feed.')
    }

    await assertNoFloatingFabs(page)
    await scrollSheetBody(page, dialog!, 500)
    await assertNoFloatingFabs(page)
  })

  test('no floating FAB after timestamp click and scroll with mini player open', async ({ page }) => {
    const dialog = await openYoutubeNuggetSheet(page)
    if (!dialog) {
      test.skip(true, 'Target YouTube nugget not on home feed.')
    }

    const timestampLink = dialog!.locator('a[href*="#yt="]').first()
    const hasTimestamp = await timestampLink.isVisible().catch(() => false)
    if (!hasTimestamp) {
      test.skip(true, 'No #yt= timestamp links in sheet body for this nugget.')
    }

    await scrollSheetBody(page, dialog!, 900)
    await timestampLink.click()

    const miniPlayer = page.getByRole('complementary')
    const hasMiniPlayer = await miniPlayer.isVisible().catch(() => false)
    if (!hasMiniPlayer) {
      test.skip(true, 'Timestamp did not open the global mini player for this nugget.')
    }

    await scrollSheetBody(page, dialog!, 1200)
    await assertNoFloatingFabs(page)

    await page.getByRole('button', { name: 'Close player' }).click()
    await assertNoFloatingFabs(page)
  })
})
