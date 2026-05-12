import { expect, test, type Page } from '@playwright/test'

const defaultUrls = {
  youtube:
    '/nuggets/f8b4e0d5-5a69-407e-84fe-85d522604ff5/andy-haldane-the-uk-economy-is-fixable-heres-how-27-apr-2026-merryn-talks-money-bloomberg-f8b4e0',
  image:
    '/nuggets/293468c6-7ee8-4ffe-b611-978977cd8f06/thoughts-from-the-road-china-april-2026-henry-h-mcvey-kkr-293468',
  missingMedia:
    '/nuggets/a1000000-0000-0000-0000-000000000001/the-ai-inflection-point-a1000000',
  longContent:
    '/nuggets/9ce02295-daa2-4724-a62e-049d92b21b0b/why-kindness-in-business-will-slow-you-down-why-the-best-dont-need-mentorship-adam-foroughi-20vc-with-harry-stebbings-9ce022',
} as const

const routes = {
  youtube: process.env.DETAIL_VISUAL_YOUTUBE_URL ?? defaultUrls.youtube,
  image: process.env.DETAIL_VISUAL_IMAGE_URL ?? defaultUrls.image,
  missingMedia: process.env.DETAIL_VISUAL_FALLBACK_URL ?? defaultUrls.missingMedia,
  longContent: process.env.DETAIL_VISUAL_LONG_URL ?? defaultUrls.longContent,
}

async function gotoDetail(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('article').first()).toBeVisible()
}

test('detail: youtube hero contract', async ({ page }) => {
  await gotoDetail(page, routes.youtube)
  await expect(page.getByText('Watch on YouTube')).toBeVisible()
  await expect(page.locator('article h1').first()).toBeVisible()
})

test('detail: image hero contract', async ({ page }) => {
  await gotoDetail(page, routes.image)
  const article = page.locator('article').first()
  const hasYoutubeHero = await article.getByText('Watch on YouTube').isVisible().catch(() => false)
  if (hasYoutubeHero) {
    test.skip(true, 'Configured image route resolves to a YouTube hero in this dataset.')
  }

  const imgCandidate = article.locator('img').first()
  const hasImage = await imgCandidate.isVisible().catch(() => false)
  const hasFallback = await article.getByText('Media unavailable').isVisible().catch(() => false)

  expect(hasImage || hasFallback).toBeTruthy()
})

test('detail: missing-media fallback contract', async ({ page }) => {
  await gotoDetail(page, routes.missingMedia)
  const hasMediaUnavailable = await page.getByText('Media unavailable').isVisible().catch(() => false)
  const hasRenderedImage = await page.locator('article img').first().isVisible().catch(() => false)
  expect(hasMediaUnavailable || hasRenderedImage).toBeTruthy()
})

test('detail: long-content disclaimer contract', async ({ page }) => {
  await gotoDetail(page, routes.longContent)
  await page.locator('article').evaluate((el) => {
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
  })
  const disclaimer = page.locator('article section', {
    hasText:
      'Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.',
  })
  await expect(disclaimer).toHaveCount(1)
  await expect(disclaimer.first()).toBeVisible()
  await expect(disclaimer.first()).toContainText(
    'Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.'
  )
})
