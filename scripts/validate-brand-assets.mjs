/**
 * Validates brand asset files exist and match expected pixel dimensions.
 * Run: npm run icons:validate
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** @type {{ rel: string; w: number; h: number }[]} */
const expected = [
  { rel: 'public/icon.svg', w: 512, h: 512 },
  { rel: 'public/icons/favicon-32.png', w: 32, h: 32 },
  { rel: 'public/apple-touch-icon.png', w: 180, h: 180 },
  { rel: 'public/icons/icon-192.png', w: 192, h: 192 },
  { rel: 'public/icons/icon-512.png', w: 512, h: 512 },
  { rel: 'public/icons/icon-512-maskable.png', w: 512, h: 512 },
  { rel: 'public/icons/badge-72.png', w: 72, h: 72 },
  { rel: 'public/og-default.png', w: 1200, h: 630 },
  { rel: 'public/store/play-feature-graphic.png', w: 1024, h: 500 },
  { rel: 'android/app/src/main/res/drawable-nodpi/ic_splash_icon.png', w: 512, h: 512 },
  { rel: 'android/app/src/main/res/drawable-nodpi/ic_stat_notification.png', w: 96, h: 96 },
]

const androidLauncher = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

const androidForeground = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
}

let failed = 0

async function checkPng(absPath, w, h, label) {
  if (!fs.existsSync(absPath)) {
    console.error(`FAIL missing: ${label}`)
    failed++
    return
  }
  const meta = await sharp(absPath).metadata()
  if (meta.width !== w || meta.height !== h) {
    console.error(`FAIL ${label}: expected ${w}x${h}, got ${meta.width}x${meta.height}`)
    failed++
    return
  }
  console.log(`OK   ${label} (${w}x${h})`)
}

async function checkSvg(absPath, label, { requireViewBox, requireBrandYellow } = {}) {
  if (!fs.existsSync(absPath)) {
    console.error(`FAIL missing: ${label}`)
    failed++
    return
  }
  const text = fs.readFileSync(absPath, 'utf8')
  if (requireViewBox && !text.includes(`viewBox="${requireViewBox}"`)) {
    console.error(`FAIL ${label}: missing viewBox="${requireViewBox}"`)
    failed++
    return
  }
  if (requireBrandYellow && !text.includes('#facc15') && !text.includes('#FACC15')) {
    console.error(`FAIL ${label}: expected brand yellow #facc15`)
    failed++
    return
  }
  console.log(`OK   ${label}`)
}

async function main() {
  console.log('Brand asset validation\n')

  await checkSvg(path.join(root, 'public/icon.svg'), 'public/icon.svg', {
    requireViewBox: '0 0 512 512',
    requireBrandYellow: true,
  })
  await checkSvg(path.join(root, 'public/og-default.svg'), 'public/og-default.svg', {
    requireViewBox: '0 0 1200 630',
    requireBrandYellow: true,
  })
  await checkSvg(path.join(root, 'public/store/play-feature-graphic.svg'), 'public/store/play-feature-graphic.svg', {
    requireViewBox: '0 0 1024 500',
    requireBrandYellow: true,
  })
  await checkSvg(path.join(root, 'scripts/brand-icons/icon-maskable.svg'), 'scripts/brand-icons/icon-maskable.svg', {
    requireViewBox: '0 0 512 512',
    requireBrandYellow: true,
  })
  await checkSvg(path.join(root, 'scripts/brand-icons/badge.svg'), 'scripts/brand-icons/badge.svg', {
    requireViewBox: '0 0 512 512',
  })

  for (const { rel, w, h } of expected) {
    if (rel.endsWith('.svg')) continue
    await checkPng(path.join(root, rel), w, h, rel)
  }

  for (const [density, size] of Object.entries(androidLauncher)) {
    const base = path.join(root, 'android/app/src/main/res', `mipmap-${density}`)
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await checkPng(path.join(base, name), size, size, `mipmap-${density}/${name}`)
    }
  }

  for (const [density, size] of Object.entries(androidForeground)) {
    await checkPng(
      path.join(root, 'android/app/src/main/res', `mipmap-${density}`, 'ic_launcher_foreground.png'),
      size,
      size,
      `mipmap-${density}/ic_launcher_foreground.png`,
    )
  }

  const manifestPath = path.join(root, 'public/manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('FAIL missing: public/manifest.json')
    failed++
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const iconPaths = manifest.icons?.map((i) => i.src) ?? []
    for (const src of iconPaths) {
      const abs = path.join(root, 'public', src.replace(/^\//, ''))
      if (!fs.existsSync(abs)) {
        console.error(`FAIL manifest icon 404: ${src}`)
        failed++
      }
    }
    console.log('OK   public/manifest.json icon references')
  }

  console.log('')
  if (failed > 0) {
    console.error(`${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('All brand asset checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
