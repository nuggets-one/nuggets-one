import sharp from 'sharp'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, 'public', 'icons', 'icon-512-maskable.png')
const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

for (const [density, size] of Object.entries(sizes)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`)
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher.png'))
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher_round.png'))
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher_foreground.png'))
}

console.log('Updated Android launcher assets from public/icons/icon-512-maskable.png')
