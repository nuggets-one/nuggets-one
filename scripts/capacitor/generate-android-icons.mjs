/**
 * Regenerates Android mipmap PNGs + splash screens from brand SVGs.
 * Adaptive icons use @mipmap/ic_launcher_foreground (PNG) + yellow @color background.
 * No vector drawable/ic_launcher_foreground.xml — avoids AAPT linking failures.
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

/** Legacy launcher icon (pre–API 26). */
const launcherSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

/** Adaptive-icon foreground layer is 108dp — use full density px to avoid blur on upscale. */
const adaptiveForegroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
}

if (!fs.existsSync(fullIcon)) {
  throw new Error(`Missing ${fullIcon} — run npm run icons:generate first.`)
}

// Capacitor default robot foreground overrides branded assets on API 24+ if left in place.
const capRobotForeground = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'res',
  'drawable-v24',
  'ic_launcher_foreground.xml',
)
if (fs.existsSync(capRobotForeground)) {
  fs.unlinkSync(capRobotForeground)
}
const brandedVectorForeground = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'res',
  'drawable',
  'ic_launcher_foreground.xml',
)
if (fs.existsSync(brandedVectorForeground)) {
  fs.unlinkSync(brandedVectorForeground)
}

for (const [density, size] of Object.entries(launcherSizes)) {
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
}

for (const [density, fgCanvas] of Object.entries(adaptiveForegroundSizes)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })

  // N sits in adaptive safe zone (~72dp of 108dp canvas)
  const glyphSize = Math.round(fgCanvas * (72 / 108))
  const pad = Math.round((fgCanvas - glyphSize) / 2)
  await sharp(glyphSvg)
    .resize(glyphSize, glyphSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: fgCanvas - glyphSize - pad,
      left: pad,
      right: fgCanvas - glyphSize - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'))
}

// Density-independent splash glyph (512px) — sharp on all devices; bg color is set in styles.xml
const nodpiDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi')
fs.mkdirSync(nodpiDir, { recursive: true })
const splashGlyphSize = 288
await sharp(glyphSvg)
  .resize(splashGlyphSize, splashGlyphSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: Math.round((512 - splashGlyphSize) / 2),
    bottom: Math.round((512 - splashGlyphSize) / 2),
    left: Math.round((512 - splashGlyphSize) / 2),
    right: Math.round((512 - splashGlyphSize) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(path.join(nodpiDir, 'ic_splash_icon.png'))

/** Legacy Capacitor splash PNGs — yellow field + centered N (matches launch theme). */
const splashTargets = [
  { dir: 'drawable', size: 480 },
  { dir: 'drawable-port-mdpi', size: 320 },
  { dir: 'drawable-port-hdpi', size: 480 },
  { dir: 'drawable-port-xhdpi', size: 720 },
  { dir: 'drawable-port-xxhdpi', size: 1080 },
  { dir: 'drawable-port-xxxhdpi', size: 1440 },
  { dir: 'drawable-land-mdpi', size: 320 },
  { dir: 'drawable-land-hdpi', size: 480 },
  { dir: 'drawable-land-xhdpi', size: 720 },
  { dir: 'drawable-land-xxhdpi', size: 1080 },
  { dir: 'drawable-land-xxxhdpi', size: 1440 },
]

for (const { dir, size } of splashTargets) {
  const outDir = path.join(root, 'android', 'app', 'src', 'main', 'res', dir)
  fs.mkdirSync(outDir, { recursive: true })
  const glyphSize = Math.round(size * 0.22)
  const glyph = await sharp(glyphSvg)
    .resize(glyphSize, glyphSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#facc15' },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'splash.png'))
}

console.log('Updated Android mipmap PNGs and splash screens from brand icon sources')
