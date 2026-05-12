// scripts/migrate/config.ts
// Environment config for ETL scripts — loaded via dotenv, not Next.js runtime
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

dotenv.config({ path: path.join(ROOT, '.env.local'), override: false })
dotenv.config({ path: path.join(ROOT, '.env'), override: false })

export function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  get mongoUri() {
    return requireEnv('MONGODB_URI')
  },
  get supabaseUrl() {
    return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseServiceKey() {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },
}
