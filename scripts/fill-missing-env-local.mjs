#!/usr/bin/env node
/**
 * Interactively fill remaining .env.local secrets (Vercel CLI cannot decrypt locally).
 * Run: node scripts/fill-missing-env-local.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env.local')

const PROMPTS = [
  {
    key: 'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
    label: 'Firebase Web Push VAPID key',
    hint: 'Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Key pair',
  },
  {
    key: 'FCM_SERVICE_ACCOUNT_JSON',
    label: 'FCM service account JSON',
    hint: 'Firebase Console → Project settings → Service accounts → Generate new private key (paste full JSON or base64)',
    multiline: true,
  },
  {
    key: 'NEXT_PUBLIC_GA_ID',
    label: 'Google Analytics 4 Measurement ID',
    hint: 'analytics.google.com → Admin → Data Streams → Web → Measurement ID (G-XXXXXXXXXX). Leave blank to skip.',
    optional: true,
  },
]

function parseEnv(content) {
  const map = new Map()
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
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

function quote(val) {
  return `"${String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function isEmpty(v) {
  return !v || !String(v).trim()
}

async function promptValue(rl, spec) {
  console.log(`\n${spec.label}`)
  console.log(`  ${spec.hint}`)
  const existing = parseEnv(fs.readFileSync(ENV_PATH, 'utf8')).get(spec.key)
  if (!isEmpty(existing)) {
    console.log(`  Already set (${existing.length} chars). Press Enter to keep, or paste new value.`)
  }

  if (spec.multiline) {
    console.log('  Paste value, then a blank line to finish:')
    const lines = []
    while (true) {
      const line = await rl.question('  > ')
      if (!line.trim() && lines.length > 0) break
      if (!line.trim() && lines.length === 0 && !isEmpty(existing)) return null
      lines.push(line)
    }
    const value = lines.join('\n').trim()
    return value || null
  }

  const value = await rl.question('  > ')
  if (!value.trim() && !isEmpty(existing)) return null
  if (!value.trim() && spec.optional) return null
  if (!value.trim()) {
    console.log('  Skipped (empty).')
    return null
  }
  return value.trim()
}

async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env.local not found')
    process.exit(1)
  }

  const env = parseEnv(fs.readFileSync(ENV_PATH, 'utf8'))
  const missing = PROMPTS.filter((p) => isEmpty(env.get(p.key)))
  if (missing.length === 0) {
    console.log('All prompted keys already set in .env.local')
    return
  }

  console.log('Fill missing .env.local values (input stays in your terminal, not chat).')
  console.log('Missing:', missing.map((p) => p.key).join(', '))

  const rl = readline.createInterface({ input, output })
  const updates = new Map()

  try {
    for (const spec of missing) {
      const value = await promptValue(rl, spec)
      if (value) updates.set(spec.key, value)
    }
  } finally {
    rl.close()
  }

  if (updates.size === 0) {
    console.log('\nNo changes made.')
    return
  }

  const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
  const seen = new Set()
  const out = []

  for (const raw of lines) {
    const line = raw.trimEnd()
    const t = line.trim()
    if (!t || t.startsWith('#')) {
      out.push(line)
      continue
    }
    const i = t.indexOf('=')
    if (i <= 0) {
      out.push(line)
      continue
    }
    const key = t.slice(0, i).trim()
    seen.add(key)
    if (updates.has(key)) out.push(`${key}=${quote(updates.get(key))}`)
    else out.push(line)
  }

  for (const [key, val] of updates) {
    if (!seen.has(key)) out.push(`${key}=${quote(val)}`)
  }

  fs.writeFileSync(ENV_PATH, `${out.join('\n')}\n`, 'utf8')
  console.log(`\nUpdated ${updates.size} key(s) in .env.local`)
  console.log('Run: npm run generate:firebase-config && npm run validate:env')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
