#!/usr/bin/env node
/**
 * Preflight before uploading an iOS TestFlight release.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IOS = path.join(ROOT, 'ios')
const STASH_PLIST = path.join(ROOT, 'secrets', 'GoogleService-Info.plist')
const CAP_CONFIG = path.join(ROOT, 'capacitor.config.ts')
const PACKAGE_JSON = path.join(ROOT, 'package.json')
const CODEMAGIC = path.join(ROOT, 'codemagic.yaml')
const NATIVE_PUSH = path.join(ROOT, 'components/push/native-push-registration.tsx')

const PLIST_CANDIDATES = [
  path.join(IOS, 'App', 'App', 'GoogleService-Info.plist'),
  path.join(IOS, 'App', 'GoogleService-Info.plist'),
  STASH_PLIST,
]

function findPlist() {
  return PLIST_CANDIDATES.find((p) => fs.existsSync(p)) ?? null
}

function readIosVersion() {
  const pbxproj = path.join(IOS, 'App', 'App.xcodeproj', 'project.pbxproj')
  if (!fs.existsSync(pbxproj)) return null
  const text = fs.readFileSync(pbxproj, 'utf8')
  const marketing = text.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim() ?? '?'
  const build = text.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)?.[1]?.trim() ?? '?'
  return { marketing, build }
}

const hasIosDir = fs.existsSync(IOS)
const plistPath = findPlist()
const hasPlist = Boolean(plistPath)
const plistStashed = fs.existsSync(STASH_PLIST)
const hasNativePush = fs.existsSync(NATIVE_PUSH)
const hasCodemagic = fs.existsSync(CODEMAGIC)
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'))
const hasCapIosDep =
  Boolean(pkg.devDependencies?.['@capacitor/ios']) || Boolean(pkg.dependencies?.['@capacitor/ios'])
const capConfig = fs.existsSync(CAP_CONFIG) ? fs.readFileSync(CAP_CONFIG, 'utf8') : ''
const appId = capConfig.match(/appId:\s*['"]([^'"]+)['"]/)?.[1] ?? '?'
const version = hasIosDir ? readIosVersion() : null

console.log('=== Nuggets iOS TestFlight preflight ===\n')
console.log('Push release decision:')
console.log('  • Website/Vercel: push APIs, NativePushRegistration UI, FCM send (deploy production).')
console.log('  • TestFlight upload: native push plugin, GoogleService-Info.plist, push entitlements.\n')
console.log(`Capacitor appId: ${appId} (expect nuggets.one)`)
console.log(`@capacitor/ios in package.json: ${hasCapIosDep ? 'yes' : 'MISSING'}`)
console.log(`codemagic.yaml: ${hasCodemagic ? 'present' : 'MISSING'}`)
console.log(`ios/ project: ${hasIosDir ? 'present' : 'MISSING — bootstrap via Codemagic or npx cap add ios'}`)
console.log(
  `GoogleService-Info.plist: ${
    hasPlist
      ? `present (${path.relative(ROOT, plistPath)})`
      : 'MISSING — npm run setup:ios-push -- --google-service-info <path>'
  }`
)
console.log(`Stashed plist (secrets/): ${plistStashed ? 'yes' : 'no'}`)
console.log(`NativePushRegistration: ${hasNativePush ? 'present' : 'MISSING'}`)
if (version) {
  console.log(`Next release: MARKETING_VERSION ${version.marketing}, CURRENT_PROJECT_VERSION ${version.build}`)
}
console.log('\nBuild (after Apple Developer + ios/):')
console.log("  $env:CAPACITOR_SERVER_URL='https://www.nuggets.one'")
console.log('  npm run cap:sync')
console.log('  Codemagic workflow: nuggets-ios-testflight')
console.log('Guide: docs/IOS_TESTFLIGHT.md\n')

let failed = false
if (!hasCapIosDep) failed = true
if (!hasNativePush) failed = true
if (hasIosDir && !hasPlist) failed = true
if (!hasIosDir) {
  console.log('Note: ios/ not generated yet — expected before first TestFlight.')
  if (plistStashed) console.log('Stashed plist ready for Codemagic when Apple Developer is active.')
  process.exit(0)
}
process.exit(failed ? 1 : 0)
