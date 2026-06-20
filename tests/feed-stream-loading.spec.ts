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
      url.includes('stream=pulse') &&
      !url.includes('/api/')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  const pulseTab = page.getByRole('link', { name: /Market Pulse/i }).first()
  await expect(pulseTab).toBeVisible()

  await pulseTab.click()

  const overlay = page.locator('[data-testid="feed-loading-skeleton"]')
  await expect(overlay).toBeVisible({
    timeout: 5_000,
  })
  await expect(overlay.locator('.animate-pulse').first()).toBeVisible()

  await expect(overlay).toBeHidden({
    timeout: 15_000,
  })

  await expect(page).toHaveURL(/stream=pulse/)
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

  await page.goto('/?stream=pulse', { waitUntil: 'networkidle' })
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

test('tech x vc stream shows scope tabs', async ({ page }) => {
  await page.goto('/?stream=tech_vc', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /Global/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /India/i }).first()).toBeVisible()
})

test('geopolitics stream hides scope tabs', async ({ page }) => {
  await page.goto('/?stream=geopolitics', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-feed-content-version]', { state: 'attached' })

  await expect(page.getByRole('link', { name: /^Global,/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^India,/i })).toHaveCount(0)
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

  await page.goto('/?stream=pulse', { waitUntil: 'networkidle' })
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
