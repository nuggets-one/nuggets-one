#!/usr/bin/env node
/**
 * Stash or install GoogleService-Info.plist for iOS push.
 *
 * Usage:
 *   # Stash downloaded plist (ios/ not required):
 *   npm run setup:ios-push -- --google-service-info "C:\Downloads\GoogleService-Info.plist"
 *
 *   # After ios/ exists (Codemagic bootstrap):
 *   npm run setup:ios-push -- --google-service-info secrets\GoogleService-Info.plist
 *
 *   # Verify stashed plist only:
 *   npm run setup:ios-push -- --verify
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STASH_PATH = path.join(ROOT, 'secrets', 'GoogleService-Info.plist')
const IOS = path.join(ROOT, 'ios')
const PLIST_DESTS = [
  path.join(IOS, 'App', 'App', 'GoogleService-Info.plist'),
  path.join(IOS, 'App', 'GoogleService-Info.plist'),
]
const EXPECTED_BUNDLE_ID = 'nuggets.one'

function parseArgs(argv) {
  const out = { verify: false, stash: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--google-service-info') out.googleServiceInfo = argv[++i]
    else if (arg === '--verify') out.verify = true
    else if (arg === '--stash') out.stash = true
  }
  return out
}

function readPlistSource(filePath) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }
  const raw = fs.readFileSync(abs, 'utf8')
  if (!raw.includes('GOOGLE_APP_ID')) {
    console.error('File does not look like a valid GoogleService-Info.plist')
    process.exit(1)
  }
  return { abs, raw }
}

function verifyBundleId(raw) {
  const bundleMatch =
    raw.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)<\/string>/) ??
    raw.match(/BUNDLE_ID.*?=.*?([^\s;]+)/)
  const bundleId = bundleMatch?.[1]?.trim()
  if (bundleId && bundleId !== EXPECTED_BUNDLE_ID) {
    console.warn(`Warning: BUNDLE_ID is "${bundleId}" — expected ${EXPECTED_BUNDLE_ID}`)
    return false
  }
  if (bundleId) {
    console.log(`BUNDLE_ID: ${bundleId}`)
  }
  return true
}

function stashPlist(srcAbs) {
  fs.mkdirSync(path.dirname(STASH_PATH), { recursive: true })
  fs.copyFileSync(srcAbs, STASH_PATH)
  console.log(`Stashed → ${STASH_PATH}`)
  console.log('(gitignored — safe to keep until ios/ exists or Codemagic bootstrap)')
}

function installToIos(srcAbs) {
  const destDir = path.dirname(PLIST_DESTS[0])
  if (!fs.existsSync(destDir)) {
    console.error(`Expected Capacitor ios path missing: ${destDir}`)
    console.error('Bootstrap ios/ via Codemagic or npx cap add ios first.')
    process.exit(1)
  }
  for (const dest of PLIST_DESTS) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(srcAbs, dest)
    console.log(`Copied → ${dest}`)
  }
}

function printUsage() {
  console.error(`Usage:
  npm run setup:ios-push -- --google-service-info <path-to-GoogleService-Info.plist>
  npm run setup:ios-push -- --verify

When ios/ is missing, the plist is stashed to secrets/GoogleService-Info.plist automatically.
See docs/IOS_TESTFLIGHT.md`)
}

const args = parseArgs(process.argv.slice(2))

if (args.verify) {
  if (!fs.existsSync(STASH_PATH)) {
    console.error(`No stashed plist at ${STASH_PATH}`)
    console.error('Run: npm run setup:ios-push -- --google-service-info <path>')
    process.exit(1)
  }
  const raw = fs.readFileSync(STASH_PATH, 'utf8')
  verifyBundleId(raw)
  console.log('Stashed GoogleService-Info.plist looks valid.')
  process.exit(0)
}

if (!args.googleServiceInfo) {
  printUsage()
  process.exit(1)
}

const { abs: srcAbs, raw } = readPlistSource(args.googleServiceInfo)
verifyBundleId(raw)

const hasIosDir = fs.existsSync(IOS)

if (args.stash || !hasIosDir) {
  stashPlist(srcAbs)
  if (!hasIosDir) {
    console.log('\nios/ not generated yet — expected before TestFlight.')
    console.log('Next (when Apple Developer + Codemagic ready):')
    console.log('  1. First Codemagic iOS build bootstraps ios/')
    console.log('  2. npm run setup:ios-push -- --verify  (re-copy from stash if needed)')
    console.log('  3. Upload APNs .p8 to Firebase Cloud Messaging')
    console.log('Guide: docs/IOS_TESTFLIGHT.md')
    process.exit(0)
  }
}

installToIos(srcAbs)
stashPlist(srcAbs)
console.log('\nNext: Push Notifications capability in Xcode → Codemagic/TestFlight build')
console.log('Guide: docs/IOS_TESTFLIGHT.md')
