#!/usr/bin/env node
/**
 * Deploy push-topic-outbox Edge Function.
 * Ensures .env.local is Supabase-CLI-safe before deploy (FCM JSON format).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('node', ['scripts/fix-fcm-env-for-supabase-cli.mjs'])
run('supabase', ['functions', 'deploy', 'push-topic-outbox', '--no-verify-jwt'])
