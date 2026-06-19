/**
 * iOS App Store icon ? 1024x1024 PNG, no alpha.
 * Run: npm run icons:ios  (after npm run icons:generate)
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')
const fullIcon = path.join(root, 'public', 'icons', 'icon-512.png')
const maskableIcon = path.join(root, 'public', 'icons', 'icon-512-maskable.png')
const storeDir = path.join(root, 'public', 'store')
const outPath = path.join(storeDir, 'ios-app-store-icon-1024.png')

if (!fs.existsSync(fullIcon)) throw new Error(`Missing ${fullIcon} ? run npm run icons:generate first.`)

const source = fs.existsSync(maskableIcon) ? maskableIcon : fullIcon
fs.mkdirSync(storeDir, { recursive: true })

await sharp(source)
  .resize(1024, 1024, { fit: 'contain', background: '#facc15' })
  .flatten({ background: '#facc15' })
  .png()
  .toFile(outPath)

console.log(`Wrote App Store icon: ${outPath}`)
