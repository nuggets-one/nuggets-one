import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.vercel.production')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\n/g, '\n')
    }
    out[key] = value
  }
  return out
}

const env = loadEnvFile(envPath)
const raw = env.FCM_SERVICE_ACCOUNT_JSON?.trim() ?? ''

if (!raw) {
  console.log('FCM_SERVICE_ACCOUNT_JSON: MISSING')
  process.exit(1)
}

let parsed
try {
  const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  parsed = JSON.parse(decoded)
} catch {
  console.log('FCM_SERVICE_ACCOUNT_JSON: INVALID_JSON')
  process.exit(1)
}

const ok = Boolean(parsed.project_id && parsed.client_email && parsed.private_key)
console.log('FCM_SERVICE_ACCOUNT_JSON: present')
console.log('FCM format valid:', ok ? 'YES' : 'NO')
console.log('Firebase project_id:', parsed.project_id ?? '(missing)')
console.log('Service account email:', parsed.client_email ?? '(missing)')
console.log('Private key present:', parsed.private_key ? 'YES' : 'NO')

if (parsed.project_id !== 'nuggets-one') {
  console.log('WARN: project_id is not nuggets-one — confirm this matches google-services.json')
}

process.exit(ok ? 0 : 1)
