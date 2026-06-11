#!/usr/bin/env node
/**
 * Web push setup helper — documents required Firebase Console steps and
 * generates the service worker config from env vars.
 *
 * Usage:
 *   node scripts/setup-web-push.mjs
 *
 * Prerequisites (Firebase Console → project nuggets-one):
 *   1. Add a Web app (if not present)
 *   2. Cloud Messaging → Web Push certificates → copy VAPID public key
 *   3. Add authorized domains: nuggets.one + Vercel preview URLs
 *   4. Set NEXT_PUBLIC_FIREBASE_* in .env.local and Vercel
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null) process.env[key] = value
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

const REQUIRED = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
]

console.log('Browser web push setup\n')
console.log('Required env vars (set in .env.local + Vercel Production/Preview):')
for (const key of REQUIRED) {
  const present = !!process.env[key]?.trim()
  console.log(`  ${present ? '✓' : '✗'} ${key}`)
}

console.log('\nAlso required (already used for Android push):')
console.log('  FCM_SERVICE_ACCOUNT_JSON on Vercel + Supabase Edge Function')

const gen = spawnSync('node', ['scripts/generate-firebase-messaging-config.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
})

if (gen.status !== 0) {
  process.exit(gen.status ?? 1)
}

console.log('\nNext: npm run build && deploy. Test on HTTPS (staging or production).')
