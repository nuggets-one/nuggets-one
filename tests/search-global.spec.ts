import { expect, test } from '@playwright/test'

const GLOBAL_SEARCH_ENABLED =
  process.env.NEXT_PUBLIC_SEARCH_GLOBAL === '1' ||
  process.env.NEXT_PUBLIC_SEARCH_GLOBAL === 'true'

function searchInput(page: import('@playwright/test').Page) {
  return page.getByRole('combobox', { name: /Search nuggets/i }).first()
}

test.describe('global-by-default search', () => {
  test.skip(
    !GLOBAL_SEARCH_ENABLED,
    'Set NEXT_PUBLIC_SEARCH_GLOBAL=1 at build time to exercise global search behavior.'
  )

  test('committing a search from a scoped section clears the section facets', async ({ page }) => {
    await page.goto('/?stream=tech_vc&scope=india', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

    const input = searchInput(page)
    await expect(input).toBeVisible()
    await input.click()
    await input.fill('npci')
    await input.press('Enter')

    await expect(page).toHaveURL(/[?&]q=npci/i)
    // Section facets are dropped so the search spans every stream/scope/tag.
    await expect(page).not.toHaveURL(/stream=tech_vc/)
    await expect(page).not.toHaveURL(/scope=india/)
    await expect(page).not.toHaveURL(/[?&]tags=/)
  })
})

test('typing in search never triggers a Home feed RSC refetch', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  let homeRscRequests = 0
  page.on('request', (request) => {
    const headers = request.headers()
    const isRsc = headers['rsc'] === '1' || headers['next-router-state-tree'] !== undefined
    if (!isRsc) return
    const url = new URL(request.url())
    if (url.pathname === '/' && !url.pathname.includes('/api/')) {
      homeRscRequests += 1
    }
  })

  const input = searchInput(page)
  await expect(input).toBeVisible()
  await input.click()
  await input.pressSequentially('market outlook', { delay: 60 })
  // Allow debounce (180ms) + any suggestion fetch to settle.
  await page.waitForTimeout(600)

  // Draft typing must stay local — only committed q drives the RSC feed.
  expect(homeRscRequests).toBe(0)
})
