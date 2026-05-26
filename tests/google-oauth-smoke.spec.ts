import { test, expect } from '@playwright/test'

/**
 * Smoke: Google OAuth starts correctly (does not complete sign-in — no test Google account).
 * Run against production:
 *   PLAYWRIGHT_BASE_URL=https://www.nuggets.one npx playwright test tests/google-oauth-smoke.spec.ts
 */
test.describe('Google OAuth smoke', () => {
  test('login page starts Google OAuth redirect', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()

    const nav = page.waitForURL(
      (u) =>
        /accounts\.google\.com/.test(u.href) ||
        /supabase\.co\/auth\/v1\/authorize/.test(u.href) ||
        /\/login\?error=/.test(u.href),
      { timeout: 25_000, waitUntil: 'commit' }
    )

    await page.getByRole('button', { name: 'Continue with Google' }).click()
    await nav

    const url = page.url()
    if (/\/login\?error=/.test(url)) {
      const alert = page.getByRole('alert')
      const msg = (await alert.textContent().catch(() => '')) ?? ''
      throw new Error(`OAuth did not start — ${url} — ${msg}`)
    }

    const onGoogle = /accounts\.google\.com/.test(url)
    const onSupabaseAuth = /supabase\.co\/auth\/v1\/authorize/.test(url)
    expect(onGoogle || onSupabaseAuth).toBeTruthy()
  })
})
