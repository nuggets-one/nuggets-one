/**
 * Regenerates legacy mipmap PNGs from brand sources.
 * Adaptive icons (API 26+) use @drawable/ic_launcher_foreground vector + yellow background.
 *
 * Run: npm run icons:android  (after npm run icons:generate)
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')
const brandDir = path.join(root, 'scripts', 'brand-icons')

const fullIcon = path.join(root, 'public', 'icons', 'icon-512.png')
const glyphSvg = path.join(brandDir, 'n-glyph.svg')

const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

if (!fs.existsSync(fullIcon)) {
  throw new Error(`Missing ${fullIcon} — run npm run icons:generate first.`)
}

for (const [density, size] of Object.entries(sizes)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })

  await sharp(fullIcon)
    .resize(size, size, { fit: 'contain', background: '#facc15' })
    .png()
    .toFile(path.join(dir, 'ic_launcher.png'))

  await sharp(fullIcon)
    .resize(size, size, { fit: 'contain', background: '#facc15' })
    .png()
    .toFile(path.join(dir, 'ic_launcher_round.png'))

  // Match adaptive-icon safe zone: glyph ~72/108 of foreground canvas
  const fgSize = Math.round(size * (72 / 108))
  const pad = Math.round((size - fgSize) / 2)
  await sharp(glyphSvg)
    .resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: size - fgSize - pad,
      left: pad,
      right: size - fgSize - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'))
}

console.log('Updated Android mipmap PNGs (legacy fallback) from brand icon sources')
