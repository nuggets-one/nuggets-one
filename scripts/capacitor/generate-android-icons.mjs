/**
 * Android icons from the same master mark as the website (public/icon.svg → icon-512.png).
 * Every surface uses the full yellow tile + bold N — no separate glyph layer.
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
const maskableIcon = path.join(root, 'public', 'icons', 'icon-512-maskable.png')
const badgeSvg = path.join(brandDir, 'badge.svg')

const launcherSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

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

const adaptiveSource = fs.existsSync(maskableIcon) ? maskableIcon : fullIcon

// Remove Capacitor robot / broken vector foregrounds if they reappear.
for (const stale of [
  path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-v24', 'ic_launcher_foreground.xml'),
  path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_foreground.xml'),
  path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_stat_notification.xml'),
]) {
  if (fs.existsSync(stale)) fs.unlinkSync(stale)
}

async function writeFullIcon(outPath, size) {
  await sharp(adaptiveSource)
    .resize(size, size, { fit: 'contain', background: '#facc15' })
    .png()
    .toFile(outPath)
}

for (const [density, size] of Object.entries(launcherSizes)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })
  await writeFullIcon(path.join(dir, 'ic_launcher.png'), size)
  await writeFullIcon(path.join(dir, 'ic_launcher_round.png'), size)
}

for (const [density, size] of Object.entries(adaptiveForegroundSizes)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })
  await writeFullIcon(path.join(dir, 'ic_launcher_foreground.png'), size)
}

const nodpiDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi')
fs.mkdirSync(nodpiDir, { recursive: true })

await writeFullIcon(path.join(nodpiDir, 'ic_splash_icon.png'), 512)
await sharp(badgeSvg).resize(96, 96).png().toFile(path.join(nodpiDir, 'ic_stat_notification.png'))

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
  const iconSize = Math.round(size * 0.35)
  const tile = await sharp(fullIcon).resize(iconSize, iconSize, { fit: 'contain', background: '#facc15' }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#facc15' } })
    .composite([{ input: tile, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'splash.png'))
}

console.log('Updated Android icons from website master mark (yellow tile + N)')
