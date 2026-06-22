import { expect, test } from '@playwright/test'

function isRscRequest(headers: Record<string, string>) {
  return headers['rsc'] === '1' || headers['next-router-state-tree'] !== undefined
}

test('stream tab switch shows feed skeleton before new content', async ({ page }) => {
  await page.route('**/*', async (route, request) => {
    const url = request.url()
    const headers = request.headers()
    if (
      isRscRequest(headers) &&
      url.includes('stream=standard') &&
      !url.includes('/api/')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  const deepDivesTab = page.getByRole('link', { name: /Deep-Dives/i }).first()
  await expect(deepDivesTab).toBeVisible()

  await deepDivesTab.click()

  const overlay = page.locator('[data-testid="feed-loading-skeleton"]')
  await expect(overlay).toBeVisible({
    timeout: 5_000,
  })
  await expect(overlay.locator('.animate-pulse').first()).toBeVisible()

  await expect(overlay).toBeHidden({
    timeout: 15_000,
  })

  await expect(page).toHaveURL(/stream=standard/)
})

test('scope tab switch shows feed skeleton before new content', async ({ page }) => {
  await page.route('**/*', async (route, request) => {
    const url = request.url()
    const headers = request.headers()
    if (
      isRscRequest(headers) &&
      url.includes('scope=india') &&
      !url.includes('/api/')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  const indiaTab = page.getByRole('link', { name: /India/i }).first()
  await expect(indiaTab).toBeVisible()

  await indiaTab.click()

  const overlay = page.locator('[data-testid="feed-loading-skeleton"]')
  await expect(overlay).toBeVisible({
    timeout: 5_000,
  })
  await expect(overlay.locator('.animate-pulse').first()).toBeVisible()

  await expect(overlay).toBeHidden({
    timeout: 15_000,
  })

  await expect(page).toHaveURL(/scope=india/)
})

test('pulse stream shows charts scope tab', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /Charts of the Week/i }).first()).toBeVisible()
})

test('charts scope tab switch shows feed skeleton before new content', async ({ page }) => {
  await page.route('**/*', async (route, request) => {
    const url = request.url()
    const headers = request.headers()
    if (
      isRscRequest(headers) &&
      url.includes('scope=charts') &&
      !url.includes('/api/')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  const chartsTab = page.getByRole('link', { name: /Charts of the Week/i }).first()
  await expect(chartsTab).toBeVisible()

  await chartsTab.click()

  const overlay = page.locator('[data-testid="feed-loading-skeleton"]')
  await expect(overlay).toBeVisible({
    timeout: 5_000,
  })
  await expect(overlay.locator('.animate-pulse').first()).toBeVisible()

  await expect(overlay).toBeHidden({
    timeout: 15_000,
  })

  await expect(page).toHaveURL(/scope=charts/)
})

test('tech x vc stream shows scope tabs without charts', async ({ page }) => {
  await page.goto('/?stream=tech_vc', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /Global/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /India/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Charts of the Week/i })).toHaveCount(0)
})

test('geopolitics stream hides scope tabs', async ({ page }) => {
  await page.goto('/?stream=geopolitics', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /^Global,/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^India,/i })).toHaveCount(0)
})

test('leadership stream hides scope tabs', async ({ page }) => {
  await page.goto('/?stream=leadership', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /^Global,/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^India,/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Leadership/i }).first()).toBeVisible()
})

test('tag filter apply shows feed skeleton', async ({ page }) => {
  await page.route('**/*', async (route, request) => {
    const url = request.url()
    const headers = request.headers()
    if (
      isRscRequest(headers) &&
      url.includes('tags=technology') &&
      !url.includes('/api/')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  const technology = page.getByRole('button', { name: 'Technology', exact: true })
  await expect(technology).toBeEnabled()

  await technology.click()

  await expect(page).toHaveURL(/tags=technology/)

  const overlay = page.locator('[data-testid="feed-loading-skeleton"]')
  await expect(overlay).toBeVisible({
    timeout: 5_000,
  })
  await expect(overlay.locator('.animate-pulse').first()).toBeVisible()
})
