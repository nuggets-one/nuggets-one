import { expect, test, type Page } from '@playwright/test'

type CopiedWindow = Window & {
  __copiedTexts?: string[]
}

async function gotoHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main article').first()).toBeVisible()
  // Client-side interception depends on Link hydration being ready.
  await page.waitForTimeout(400)
}

async function getFirstDetailHref(page: Page): Promise<string> {
  await gotoHome(page)
  const href = await page.locator('main article').first().evaluate((article) => {
    const link = article.querySelector<HTMLAnchorElement>('a[href^="/nuggets/"]')
    return link?.getAttribute('href') ?? null
  })
  expect(href).toBeTruthy()
  return href as string
}

async function openInterceptedDetail(page: Page) {
  const href = await getFirstDetailHref(page)
  await page.locator(`main article a[href="${href}"]`).first().click()

  const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => new URL(page.url()).pathname).toBe(href)

  return { dialog, href }
}

function buildStaleSlugHref(href: string) {
  const [, , id] = href.split('/')
  return `/nuggets/${id}/stale-slug-${id.slice(0, 6)}`
}

test('detail route: View Full Article opens intercepted sheet', async ({ page }) => {
  await gotoHome(page)
  const cta = page.getByRole('link', { name: 'View full article' }).first()
  await expect(cta).toBeVisible()

  const href = await cta.getAttribute('href')
  expect(href).toMatch(/^\/nuggets\//)

  await cta.click()

  const dialog = page.getByRole('dialog', { name: 'Nugget detail' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => new URL(page.url()).pathname).toBe(href)
})

test('detail route: feed click opens intercepted sheet and Escape closes it', async ({ page }) => {
  const { href } = await openInterceptedDetail(page)

  await page.keyboard.press('Escape')

  await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).pathname).not.toBe(href)
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')
})

test('detail route: browser back and backdrop dismiss close the intercepted sheet', async ({
  page,
}) => {
  await openInterceptedDetail(page)

  await page.goBack()
  await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')

  await openInterceptedDetail(page)
  await page
    .getByRole('button', { name: 'Dismiss nugget detail' })
    .click({ position: { x: 10, y: 10 } })

  await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')
})

test('detail route: direct hits render the full page and stale slugs redirect canonically', async ({
  page,
}) => {
  const href = await getFirstDetailHref(page)

  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)
  await expect(page.locator('article').first()).toBeVisible()
  await expect.poll(() => new URL(page.url()).pathname).toBe(href)

  await page.goto(buildStaleSlugHref(href), { waitUntil: 'domcontentloaded' })
  await expect.poll(() => new URL(page.url()).pathname).toBe(href)
  await expect(page.getByRole('dialog', { name: 'Nugget detail' })).toHaveCount(0)
})

test('detail route: sheet share button copies the canonical route URL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__copiedTexts', {
      value: [],
      configurable: true,
    })

    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          ;(window as CopiedWindow).__copiedTexts?.push(text)
        },
      },
      configurable: true,
    })
  })

  const { dialog, href } = await openInterceptedDetail(page)
  const canonicalUrl = new URL(href, page.url()).toString()

  await dialog.getByRole('button', { name: 'Share this nugget' }).click()

  await expect
    .poll(() => page.evaluate(() => (window as CopiedWindow).__copiedTexts ?? []))
    .toContain(canonicalUrl)
})
