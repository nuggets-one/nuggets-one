#!/usr/bin/env node
/**
 * Adds NEXT_PUBLIC_FIREBASE_* keys to .env.local from legacy apiKey/authDomain/... vars.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env.local')

function parseEnv(content) {
  const lines = content.split(/\r?\n/)
  const map = new Map()
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    map.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1))
  }
  return { lines, map }
}

if (!fs.existsSync(ENV_PATH)) {
  console.error('.env.local not found')
  process.exit(1)
}

const content = fs.readFileSync(ENV_PATH, 'utf8')
const { lines, map } = parseEnv(content)

const mapping = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'apiKey',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'authDomain',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'projectId',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'appId',
}

let changed = false
for (const [target, source] of Object.entries(mapping)) {
  if (map.has(target)) continue
  const value = map.get(source)
  if (!value) continue
  lines.push(`${target}=${value}`)
  changed = true
  console.log(`Added ${target} from ${source}`)
}

if (!changed) {
  console.log('No changes needed — NEXT_PUBLIC_FIREBASE_* already present or legacy vars missing')
  process.exit(0)
}

fs.writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, 'utf8')
console.log(`Updated ${ENV_PATH}`)
