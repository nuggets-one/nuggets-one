#!/usr/bin/env node
/**
 * Supabase CLI uses Go's dotenv parser, which chokes on FCM_SERVICE_ACCOUNT_JSON
 * when stored as quoted inline JSON (embedded " characters).
 *
 * Rewrites the key to a single-line base64 value (supported by push-send + edge fn).
 *
 * Usage: node scripts/fix-fcm-env-for-supabase-cli.mjs
 *        node scripts/fix-fcm-env-for-supabase-cli.mjs --check
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env.local')
const checkOnly = process.argv.includes('--check')

function parseEnvLineByLine(content) {
  const map = new Map()
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = raw.indexOf('=')
    if (i <= 0) continue
    const key = raw.slice(0, i).trim()
    let val = raw.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    map.set(key, val)
  }
  return map
}

function rewriteFcmLine(content, newValue) {
  const lines = content.split(/\r?\n/)
  let replaced = false
  const out = lines.map((raw) => {
    const trimmed = raw.trim()
    if (!trimmed.startsWith('FCM_SERVICE_ACCOUNT_JSON=')) return raw
    replaced = true
    return `FCM_SERVICE_ACCOUNT_JSON=${newValue}`
  })
  if (!replaced) {
    out.push(`FCM_SERVICE_ACCOUNT_JSON=${newValue}`)
  }
  return `${out.join('\n').replace(/\n?$/, '\n')}`
}

function normalizeFcm(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('FCM_SERVICE_ACCOUNT_JSON is empty in .env.local')

  if (trimmed.startsWith('{')) {
    JSON.parse(trimmed)
    return Buffer.from(trimmed, 'utf8').toString('base64')
  }

  // Already base64 — validate decodes to JSON
  const decoded = Buffer.from(trimmed, 'base64').toString('utf8')
  JSON.parse(decoded)
  return trimmed.replace(/\s+/g, '')
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env.local not found')
    process.exit(1)
  }

  const content = fs.readFileSync(ENV_PATH, 'utf8')
  const env = parseEnvLineByLine(content)
  const current = env.get('FCM_SERVICE_ACCOUNT_JSON') ?? ''

  if (!current) {
    console.error('FCM_SERVICE_ACCOUNT_JSON not found in .env.local')
    process.exit(1)
  }

  const base64 = normalizeFcm(current)
  const alreadyBase64Line = content
    .split(/\r?\n/)
    .some((line) => line.trim() === `FCM_SERVICE_ACCOUNT_JSON=${base64}`)

  if (alreadyBase64Line) {
    console.log('OK — FCM_SERVICE_ACCOUNT_JSON is already Supabase-CLI-safe (base64, unquoted).')
    return
  }

  if (checkOnly) {
    console.error(
      'FCM_SERVICE_ACCOUNT_JSON uses quoted inline JSON — Supabase CLI will fail to parse .env.local.'
    )
    console.error('Run: node scripts/fix-fcm-env-for-supabase-cli.mjs')
    process.exit(1)
  }

  fs.writeFileSync(ENV_PATH, rewriteFcmLine(content, base64), 'utf8')
  console.log('Updated FCM_SERVICE_ACCOUNT_JSON to base64 (single unquoted line).')
  console.log('Next.js and push-send still accept this format. Retry:')
  console.log('  supabase functions deploy push-topic-outbox --no-verify-jwt')
}

main()
