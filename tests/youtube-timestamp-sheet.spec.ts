import { expect, test, type Page } from '@playwright/test'

const defaultYoutubeDetail =
  '/nuggets/f8b4e0d5-5a69-407e-84fe-85d522604ff5/andy-haldane-the-uk-economy-is-fixable-heres-how-27-apr-2026-merryn-talks-money-bloomberg-f8b4e0'

async function gotoHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main article').first()).toBeVisible()
  await page.waitForTimeout(400)
}

async function openYoutubeNuggetSheet(page: Page) {
  const targetHref = process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultYoutubeDetail

  await gotoHome(page)

  const cardLink = page.locator(`main article a[href="${targetHref}"]`).first()
  const hasCard = await cardLink.isVisible().catch(() => false)

  if (hasCard) {
    await cardLink.click()
  } else {
    await page.goto(`/?stream=standard`, { waitUntil: 'domcontentloaded' })
    const fallbackArticle = page.locator('main article').first()
    const hasFallbackArticle = await fallbackArticle.isVisible().catch(() => false)
    if (!hasFallbackArticle) {
      test.skip(true, 'No nugget cards on standard feed.')
    }
    await page.waitForTimeout(400)
    const fallbackHref = await fallbackArticle.evaluate((article) => {
      const link = article.querySelector<HTMLAnchorElement>('a[href^="/nuggets/"]')
      return link?.getAttribute('href') ?? null
    })
    if (!fallbackHref) {
      test.skip(true, 'No nugget cards on home feed.')
    }
    await page.locator(`main article a[href="${fallbackHref}"]`).first().click()
  }

  const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Watch on YouTube')).toBeVisible()

  return dialog
}

test.describe('YouTube timestamp in intercepted sheet', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('timestamp plays inline in hero without auto-scroll displacement', async ({ page }) => {
    const dialog = await openYoutubeNuggetSheet(page)

    const timestampLink = dialog.locator('a[href*="#yt="]').first()
    const hasTimestamp = await timestampLink.isVisible().catch(() => false)
    if (!hasTimestamp) {
      test.skip(true, 'No #yt= timestamp links in article body for this nugget.')
    }

    const sheetBody = dialog.locator('[data-sheet-body]')
    await sheetBody.evaluate((el) => {
      el.scrollTop = Math.min(el.scrollHeight, el.clientHeight * 2)
    })
    const beforeScrollTop = await sheetBody.evaluate((el) => el.scrollTop)

    await timestampLink.click()
    const afterScrollTop = await sheetBody.evaluate((el) => el.scrollTop)
    expect(Math.abs(afterScrollTop - beforeScrollTop)).toBeLessThanOrEqual(2)

    const hero = dialog.locator('#nugget-youtube-hero')
    await expect(hero).toBeVisible()
    await expect(hero.locator('iframe')).toHaveCount(1)

    const portalIframes = page.locator('body > div[role="complementary"] iframe')
    await expect(portalIframes).toHaveCount(0)
  })
})
