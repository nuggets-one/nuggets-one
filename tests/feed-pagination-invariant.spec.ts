import { expect, test } from '@playwright/test'

test('feed pager never fetches page 1 from browser continuation logic', async ({ page }) => {
  const feedRequests: string[] = []

  await page.route('**/api/feed**', async (route, request) => {
    if (request.method() === 'GET') {
      feedRequests.push(request.url())
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()

  // Observer-triggered continuation (infinite scroll).
  for (let i = 0; i < 10; i += 1) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(250)
  }

  expect(feedRequests.length).toBeGreaterThan(0)

  for (const requestUrl of feedRequests) {
    const url = new URL(requestUrl)
    expect(url.searchParams.get('page')).not.toBe('1')
    expect(url.searchParams.get('cursor_pub')).toBeTruthy()
    expect(url.searchParams.get('cursor_id')).toBeTruthy()
  }
})
