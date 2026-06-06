/**
 * Renders brand SVGs into PNGs under public/.
 * Source: docs/BRAND_ASSET_HANDOFF.md — edit public/icon.svg and scripts/brand-icons/*.svg, then run:
 *   npm run icons:generate
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const iconsDir = path.join(publicDir, 'icons')
const brandDir = path.join(__dirname, 'brand-icons')

async function pngFromSvg(absSvgPath, outPath, size) {
  const svg = fs.readFileSync(absSvgPath)
  await sharp(svg).resize(size, size).png().toFile(outPath)
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true })

  const master = path.join(publicDir, 'icon.svg')
  if (!fs.existsSync(master)) {
    throw new Error(`Missing ${master} — add the master SVG first (see docs/BRAND_ASSET_HANDOFF.md).`)
  }

  await pngFromSvg(master, path.join(iconsDir, 'icon-192.png'), 192)
  await pngFromSvg(master, path.join(iconsDir, 'icon-512.png'), 512)
  await pngFromSvg(
    path.join(brandDir, 'icon-maskable.svg'),
    path.join(iconsDir, 'icon-512-maskable.png'),
    512,
  )
  await pngFromSvg(path.join(brandDir, 'badge.svg'), path.join(iconsDir, 'badge-72.png'), 72)
  await pngFromSvg(master, path.join(iconsDir, 'favicon-32.png'), 32)
  await pngFromSvg(master, path.join(publicDir, 'apple-touch-icon.png'), 180)

  const ogSvg = path.join(publicDir, 'og-default.svg')
  if (fs.existsSync(ogSvg)) {
    const svg = fs.readFileSync(ogSvg)
    await sharp(svg).resize(1200, 630).png().toFile(path.join(publicDir, 'og-default.png'))
  }

  const storeDir = path.join(publicDir, 'store')
  const featureSvg = path.join(storeDir, 'play-feature-graphic.svg')
  if (fs.existsSync(featureSvg)) {
    fs.mkdirSync(storeDir, { recursive: true })
    const svg = fs.readFileSync(featureSvg)
    await sharp(svg).resize(1024, 500).png().toFile(path.join(storeDir, 'play-feature-graphic.png'))
  }

  console.log(
    'Brand icons written to public/icons, public/apple-touch-icon.png, public/og-default.png, and public/store/play-feature-graphic.png',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
