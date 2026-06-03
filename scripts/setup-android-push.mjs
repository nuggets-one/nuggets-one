#!/usr/bin/env node
/**
 * Finish Android push setup after Firebase Console steps.
 *
 * Usage:
 *   node scripts/setup-android-push.mjs \
 *     --google-services "C:\Downloads\google-services.json" \
 *     --service-account "C:\Downloads\nuggets-firebase-adminsdk.json"
 *
 * Then rebuild Android:
 *   npm run cap:sync
 *   cd android && gradlew assembleRelease
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--google-services') out.googleServices = argv[++i]
    if (arg === '--service-account') out.serviceAccount = argv[++i]
    if (arg === '--skip-vercel') out.skipVercel = true
  }
  return out
}

function readJsonFile(filePath) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }
  const raw = fs.readFileSync(abs, 'utf8')
  JSON.parse(raw)
  return abs
}

const args = parseArgs(process.argv.slice(2))

if (!args.googleServices && !args.serviceAccount) {
  console.error(`Missing inputs. Provide at least one of:
  --google-services <path-to-google-services.json>
  --service-account <path-to-firebase-adminsdk.json>`)
  process.exit(1)
}

if (args.googleServices) {
  const src = readJsonFile(args.googleServices)
  const dest = path.join(ROOT, 'android/app/google-services.json')
  fs.copyFileSync(src, dest)
  console.log(`Copied google-services.json → ${dest}`)
}

if (args.serviceAccount && !args.skipVercel) {
  const src = readJsonFile(args.serviceAccount)
  const json = fs.readFileSync(src, 'utf8').trim()

  const add = spawnSync(
    'npx',
    ['vercel', 'env', 'add', 'FCM_SERVICE_ACCOUNT_JSON', 'production', 'preview', '--force'],
    {
      cwd: ROOT,
      input: json,
      encoding: 'utf8',
      shell: true,
    }
  )

  if (add.status !== 0) {
    console.error('Failed to set FCM_SERVICE_ACCOUNT_JSON on Vercel:')
    console.error(add.stderr || add.stdout)
    console.error('\nSet manually: Vercel → nuggets-one → Settings → Environment Variables')
    console.error('Name: FCM_SERVICE_ACCOUNT_JSON')
    console.error('Value: paste full service account JSON (Production + Preview)')
    process.exit(1)
  }

  console.log('Set FCM_SERVICE_ACCOUNT_JSON on Vercel (production + preview)')
  console.log('Redeploy production: npx vercel deploy --prod --yes')
}

if (args.serviceAccount && args.skipVercel) {
  console.log('Skipped Vercel env (--skip-vercel). Add FCM_SERVICE_ACCOUNT_JSON manually.')
}

console.log('\nNext: npm run cap:sync && cd android && gradlew assembleRelease')
