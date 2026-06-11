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

  test('updates intro when switching streams via bottom nav', async ({ page }) => {
    await page.goto('/?stream=standard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main article').first()).toBeVisible()

    await expect(
      page.getByText(STREAM_INTRO_COPY.standard.mobileSummary, { exact: true }),
    ).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Primary destinations' })
    await nav.getByRole('link', { name: 'Market Pulse' }).click()
    await expect(
      page.getByText(STREAM_INTRO_COPY.pulse.mobileSummary, { exact: true }),
    ).toBeVisible()
  })
})
