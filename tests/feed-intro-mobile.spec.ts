import { expect, test } from '@playwright/test'
import { STREAM_INTRO_COPY } from '../lib/copy/streams'

test.describe('mobile feed intro context', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('shows Nuggets stream summary on standard stream', async ({ page }) => {
    await page.goto('/?stream=standard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main article').first()).toBeVisible()

    await expect(
      page.getByText(STREAM_INTRO_COPY.standard.mobileSummary, { exact: true }),
    ).toBeVisible()
  })

  test('shows Market Pulse stream summary on pulse stream', async ({ page }) => {
    await page.goto('/?stream=pulse', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main article').first()).toBeVisible()

    await expect(
      page.getByText(STREAM_INTRO_COPY.pulse.mobileSummary, { exact: true }),
    ).toBeVisible()
  })

  test('shows Market Pulse summary on charts scope under pulse', async ({ page }) => {
    await page.goto('/?stream=pulse&scope=charts', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByText(STREAM_INTRO_COPY.pulse.mobileSummary, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('Charts', { exact: true }),
    ).toBeVisible()
  })

  test('redirects legacy charts stream URL to pulse charts scope', async ({ page }) => {
    await page.goto('/?stream=charts', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\?stream=pulse&scope=charts/)
  })

  test('updates intro when switching streams via bottom nav', async ({ page }) => {
    await page.goto('/?stream=standard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main article').first()).toBeVisible()

    await expect(
      page.getByText(STREAM_INTRO_COPY.standard.mobileSummary, { exact: true }),
    ).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Primary destinations' })
    await nav.getByRole('link', { name: STREAM_INTRO_COPY.pulse.label }).click()
    await expect(
      page.getByText(STREAM_INTRO_COPY.pulse.mobileSummary, { exact: true }),
    ).toBeVisible()
  })

  test('switches to Charts via pulse scope tab', async ({ page }) => {
    await page.goto('/?stream=pulse', { waitUntil: 'domcontentloaded' })

    const chartsTab = page.getByRole('link', { name: /Charts of the Week/i }).first()
    await chartsTab.click()

    await expect(page).toHaveURL(/\?stream=pulse&scope=charts/)
    await expect(
      page.getByText(STREAM_INTRO_COPY.pulse.mobileSummary, { exact: true }),
    ).toBeVisible()
  })

  test('switches to Tech via bottom nav', async ({ page }) => {
    await page.goto('/?stream=standard', { waitUntil: 'domcontentloaded' })

    const nav = page.getByRole('navigation', { name: 'Primary destinations' })
    await nav.getByRole('link', { name: STREAM_INTRO_COPY.tech_vc.label }).click()

    await expect(page).toHaveURL(/\?stream=tech_vc/)
    await expect(
      page.getByText(STREAM_INTRO_COPY.tech_vc.mobileSummary, { exact: true }),
    ).toBeVisible()
  })

  test('switches to Geo via bottom nav', async ({ page }) => {
    await page.goto('/?stream=standard', { waitUntil: 'domcontentloaded' })

    const nav = page.getByRole('navigation', { name: 'Primary destinations' })
    await nav.getByRole('link', { name: STREAM_INTRO_COPY.geopolitics.label }).click()

    await expect(page).toHaveURL(/\?stream=geopolitics/)
    await expect(
      page.getByText(STREAM_INTRO_COPY.geopolitics.mobileSummary, { exact: true }),
    ).toBeVisible()
  })
})
