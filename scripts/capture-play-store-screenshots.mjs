#!/usr/bin/env node
/**
 * Capture phone screenshots for Google Play store listing.
 * Uses Playwright at Pixel 7 viewport (1080×2400); crops to 1080×1920 (9:16).
 *
 * Usage:
 *   npm run store:screenshots
 *   PLAYWRIGHT_BASE_URL=https://www.nuggets.one npm run store:screenshots
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from '@playwright/test'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'store-listing', 'screenshots', 'phone')

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || 'https://www.nuggets.one'

const DETAIL_PATH =
  process.env.STORE_SCREENSHOT_DETAIL_PATH?.trim() ||
  '/nuggets/f8b4e0d5-5a69-407e-84fe-85d522604ff5/andy-haldane-the-uk-economy-is-fixable-heres-how-27-apr-2026-merryn-talks-money-bloomberg-f8b4e0'

const VIEWPORT = { width: 1080, height: 2400 }
const CROP_HEIGHT = 1920

/** @type {{ name: string; setup: (page: import('@playwright/test').Page) => Promise<void> }[]} */
const shots = [
  {
    name: '01-home-feed-light',
    async setup(page) {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(800)
    },
  },
  {
    name: '02-home-feed-dark',
    async setup(page) {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      const toggle = page.getByRole('button', { name: /Switch to dark mode/i })
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click()
      } else {
        await page.evaluate(() => document.documentElement.classList.add('dark'))
      }
      await page.waitForTimeout(600)
      await page.evaluate(() => window.scrollTo(0, 0))
    },
  },
  {
    name: '03-article-detail',
    async setup(page) {
      await page.goto(DETAIL_PATH, { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('article').first().waitFor({ state: 'visible', timeout: 30_000 })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(800)
    },
  },
  {
    name: '04-search',
    async setup(page) {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      const searchBtn = page.getByRole('button', { name: /Search nuggets/i }).first()
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click()
      }
      const input = page.getByRole('searchbox').first()
      await input.waitFor({ state: 'visible', timeout: 10_000 })
      await input.fill('economy')
      await page.waitForTimeout(1200)
    },
  },
  {
    name: '05-collections',
    async setup(page) {
      await page.goto('/collections', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      await page.waitForTimeout(800)
    },
  },
  {
    name: '06-stream-filters',
    async setup(page) {
      await page.goto('/?stream=pulse', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      const filterBtn = page.getByRole('button', { name: /Topic filters|Filters/i }).first()
      if (await filterBtn.isVisible().catch(() => false)) {
        await filterBtn.click()
        await page.waitForTimeout(600)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
    },
  },
  {
    name: '07-market-pulse',
    async setup(page) {
      await page.goto('/?stream=pulse', { waitUntil: 'networkidle', timeout: 60_000 })
      await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
      const pulseTab = page.getByRole('tab', { name: /Market Pulse/i }).first()
      if (await pulseTab.isVisible().catch(() => false)) {
        await pulseTab.click()
        await page.waitForTimeout(600)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
    },
  },
  {
    name: '08-bookmarks-signin',
    async setup(page) {
      await page.goto('/bookmarks', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30_000 })
      await page.waitForTimeout(1200)
    },
  },
]

async function cropToPlayAspect(pngBuffer) {
  return sharp(pngBuffer)
    .extract({ left: 0, top: 0, width: VIEWPORT.width, height: CROP_HEIGHT })
    .png()
    .toBuffer()
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const pixel7 = devices['Pixel 7']
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...pixel7,
    viewport: VIEWPORT,
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
  })
  const page = await context.newPage()

  console.log(`Capturing Play Store screenshots from ${baseURL}`)
  console.log(`Output: ${OUT_DIR}\n`)

  const written = []

  for (const shot of shots) {
    const outPath = path.join(OUT_DIR, `${shot.name}.png`)
    try {
      await shot.setup(page)
      const raw = await page.screenshot({ type: 'png', fullPage: false })
      const cropped = await cropToPlayAspect(raw)
      fs.writeFileSync(outPath, cropped)
      written.push(outPath)
      console.log(`  ✓ ${shot.name}.png`)
    } catch (err) {
      console.error(`  ✗ ${shot.name}: ${err instanceof Error ? err.message : err}`)
    }
  }

  await browser.close()

  console.log(`\nDone: ${written.length}/${shots.length} screenshots`)
  if (written.length < 2) {
    console.error('Need at least 2 screenshots for Play Store. Check network and base URL.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
