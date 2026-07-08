import { expect, test } from '@playwright/test'

async function requireAdminSession(page: import('@playwright/test').Page) {
  await page.goto('/admin/articles', { waitUntil: 'domcontentloaded' })
  if (!page.url().includes('/admin/')) {
    test.skip(true, 'Admin session required — log in as an admin user to run these tests')
  }
}

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
  expect(hasOverflow).toBe(false)
}

test.describe('admin mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('articles list has no horizontal overflow', async ({ page }) => {
    await requireAdminSession(page)
    await assertNoHorizontalOverflow(page)
    await expect(page.getByTestId('admin-nav')).toBeVisible()
  })

  test('create nugget form has no horizontal overflow', async ({ page }) => {
    await requireAdminSession(page)
    await page.goto('/admin/articles/new', { waitUntil: 'domcontentloaded' })
    await assertNoHorizontalOverflow(page)
    await expect(page.getByTestId('admin-form-action-bar')).toBeVisible()
  })

  test('admin nav menu button meets minimum tap target', async ({ page }) => {
    await requireAdminSession(page)
    const menuButton = page.getByRole('button', { name: 'Admin menu' })
    await expect(menuButton).toBeVisible()
    const box = await menuButton.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
