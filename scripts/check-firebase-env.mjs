#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const env = {
  ...loadEnvFile(path.join(ROOT, '.env.local')),
  ...loadEnvFile(path.join(ROOT, '.env')),
  ...process.env,
}

const legacy = {
  NEXT_PUBLIC_FIREBASE_API_KEY: env.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: env.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.projectId,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: env.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: env.appId,
}

for (const key of [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  ...Object.keys(legacy),
]) {
  const v = env[key] ?? legacy[key] ?? ''
  console.log(`${key}: ${v.length ? `${v.length} chars` : 'EMPTY'}`)
}
