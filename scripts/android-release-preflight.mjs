#!/usr/bin/env node
/**
 * Preflight before uploading an Android internal-testing release.
 * Prints push release decision and checks common blockers.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ANDROID = path.join(ROOT, 'android')
const BUILD_GRADLE = path.join(ANDROID, 'app', 'build.gradle')
const GOOGLE_SERVICES = path.join(ANDROID, 'app', 'google-services.json')
const KEYSTORE_PROPS = path.join(ANDROID, 'keystore.properties')

function readVersion() {
  const text = fs.readFileSync(BUILD_GRADLE, 'utf8')
  const code = text.match(/versionCode\s+(\d+)/)?.[1] ?? '?'
  const name = text.match(/versionName\s+"([^"]+)"/)?.[1] ?? '?'
  return { code, name }
}

const { code, name } = readVersion()
const hasGoogleServices = fs.existsSync(GOOGLE_SERVICES)
const hasKeystore = fs.existsSync(KEYSTORE_PROPS)
const manifest = fs.readFileSync(
  path.join(ANDROID, 'app', 'src/main/AndroidManifest.xml'),
  'utf8'
)
const hasPostNotifications = manifest.includes('POST_NOTIFICATIONS')

console.log('=== Nuggets Android internal testing preflight ===\n')

console.log('Push release decision:')
console.log('  • Website/Vercel: push APIs, registration UI, FCM send (deploy production).')
console.log('  • Play upload: native push plugin, google-services.json, POST_NOTIFICATIONS.')
console.log('  • Testers on Play versionCode 1 need BOTH a new .aab AND Vercel for full push.\n')

console.log(`Next release: versionCode ${code}, versionName "${name}"`)
console.log(`google-services.json: ${hasGoogleServices ? 'present' : 'MISSING — run setup:android-push'}`)
console.log(`POST_NOTIFICATIONS in manifest: ${hasPostNotifications ? 'yes' : 'no'}`)
console.log(
  `keystore.properties: ${hasKeystore ? 'present (signed bundleRelease)' : 'missing — bundle may be unsigned; use Play App Signing or add keystore.properties'}`
)

console.log('\nBuild:')
console.log('  $env:CAPACITOR_SERVER_URL=\'https://www.nuggets.one\'')
console.log('  npm run android:bundle')
console.log('  (or: npm run cap:sync && npm run cap:bundle:android)')
console.log('\nUpload: Play Console → Testing → Internal testing → new release')
console.log('Guide: docs/ANDROID_INTERNAL_TESTING.md\n')

let failed = false
if (!hasGoogleServices) failed = true
if (!hasPostNotifications) failed = true
if (Number(code) < 2) {
  console.warn('Warning: versionCode < 2 — bump before upload if Play already has version 1.')
}

process.exit(failed ? 1 : 0)
