#!/usr/bin/env node
/**
 * Copies misnamed Firebase web config vars on Vercel to NEXT_PUBLIC_FIREBASE_* names.
 * Run after pulling production env: node scripts/sync-firebase-vercel-env.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
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

const env = loadEnvFile(path.join(ROOT, '.env.local'))

const mapping = {
  NEXT_PUBLIC_FIREBASE_API_KEY: env.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: env.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.projectId,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: env.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: env.appId,
}

const missing = Object.entries(mapping).filter(([, v]) => !v?.trim())
if (missing.length) {
  console.error('Missing legacy Firebase vars in .env.local:', missing.map(([k]) => k).join(', '))
  console.error('Run: npx vercel env pull .env.local --environment=production --yes')
  process.exit(1)
}

for (const [name, value] of Object.entries(mapping)) {
  for (const target of ['production', 'preview']) {
    const result = spawnSync(
      'npx',
      ['vercel', 'env', 'add', name, target, '--force', '--yes'],
      {
        cwd: ROOT,
        input: value,
        encoding: 'utf8',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )

    if (result.status !== 0) {
      console.error(`Failed to set ${name} for ${target}:`)
      console.error(result.stderr || result.stdout)
      process.exit(1)
    }

    console.log(`Set ${name} → ${target}`)
  }
}

console.log('\nDone. Redeploy production for Next.js to pick up NEXT_PUBLIC_* vars.')
