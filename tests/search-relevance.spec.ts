import { expect, test } from '@playwright/test'

const GLOBAL_SEARCH_ENABLED =
  process.env.NEXT_PUBLIC_SEARCH_GLOBAL === '1' ||
  process.env.NEXT_PUBLIC_SEARCH_GLOBAL === 'true'

// A real, partial fragment of an existing nugget title (e.g. "minim" for
// "Minimum Viable Product"). Without it we cannot assert against live data, so
// the recall tests are skipped rather than asserting on unknown content.
const PARTIAL_QUERY = process.env.SEARCH_TEST_PARTIAL?.trim() ?? ''

function searchInput(page: import('@playwright/test').Page) {
  return page.getByRole('combobox', { name: /Search nuggets/i }).first()
}

test.describe('search relevance (prefix + fuzzy)', () => {
  test.skip(
    !GLOBAL_SEARCH_ENABLED || PARTIAL_QUERY.length < 2,
    'Set NEXT_PUBLIC_SEARCH_GLOBAL=1 and SEARCH_TEST_PARTIAL=<partial title fragment> to run recall tests.'
  )

  test('typing a partial title shows suggestions', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

    const input = searchInput(page)
    await expect(input).toBeVisible()
    await input.click()
    await input.pressSequentially(PARTIAL_QUERY, { delay: 60 })

    // Prefix matching should surface at least one suggestion while typing a
    // partial word — the pre-migration behavior returned none until a whole
    // stemmed word matched.
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible({ timeout: 3000 })
  })

  test('selecting a suggestion navigates to the nugget detail route', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

    const input = searchInput(page)
    await input.click()
    await input.pressSequentially(PARTIAL_QUERY, { delay: 60 })

    const firstOption = page.getByRole('option').first()
    await expect(firstOption).toBeVisible({ timeout: 3000 })
    await firstOption.getByRole('link').first().click()

    await expect(page).toHaveURL(/\/nuggets\/[^/]+\//)
  })
})
