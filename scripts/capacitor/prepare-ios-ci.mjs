/**
 * Codemagic / CI bootstrap for Capacitor iOS (hosted mode).
 * - Ensures ios/ exists (npx cap add ios)
 * - Injects GoogleService-Info.plist from env or stash
 * - Runs cap sync with CAPACITOR_SERVER_URL
 *
 * Env:
 *   CAPACITOR_SERVER_URL (default https://www.nuggets.one)
 *   GOOGLE_SERVICE_INFO_PLIST_BASE64 — optional, plist contents base64
 *   GOOGLE_SERVICE_INFO_PLIST_PATH — optional, path to plist file
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const IOS = path.join(ROOT, 'ios')

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || 'https://www.nuggets.one'
process.env.CAPACITOR_SERVER_URL = serverUrl

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CAPACITOR_SERVER_URL: serverUrl },
    ...opts,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function writePlistToIos(content) {
  const dests = [
    path.join(IOS, 'App', 'App', 'GoogleService-Info.plist'),
    path.join(IOS, 'App', 'GoogleService-Info.plist'),
  ]
  for (const dest of dests) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content, 'utf8')
    console.log(`Wrote ${dest}`)
  }
}

function injectGoogleServicePlist() {
  const b64 = process.env.GOOGLE_SERVICE_INFO_PLIST_BASE64?.trim()
  if (b64) {
    writePlistToIos(Buffer.from(b64, 'base64').toString('utf8'))
    return
  }

  const filePath = process.env.GOOGLE_SERVICE_INFO_PLIST_PATH?.trim()
  if (filePath && fs.existsSync(filePath)) {
    writePlistToIos(fs.readFileSync(filePath, 'utf8'))
    return
  }

  const stash = path.join(ROOT, 'secrets', 'GoogleService-Info.plist')
  if (fs.existsSync(stash)) {
    writePlistToIos(fs.readFileSync(stash, 'utf8'))
    return
  }

  console.warn(
    'No GoogleService-Info.plist injected (set GOOGLE_SERVICE_INFO_PLIST_BASE64 in Codemagic). Push may fail until added.'
  )
}

console.log(`CAPACITOR_SERVER_URL=${serverUrl}`)
run('npm', ['run', 'cap:build'])

if (!fs.existsSync(IOS)) {
  console.log('ios/ missing — running npx cap add ios')
  run('npx', ['cap', 'add', 'ios'])
}

injectGoogleServicePlist()
run('npx', ['cap', 'sync', 'ios'])

console.log('iOS CI prep complete.')
