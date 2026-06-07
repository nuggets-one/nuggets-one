/**
 * One-off: confirm a Supabase Auth user email via service role.
 *
 * Usage:
 *   node scripts/confirm-auth-user.mjs review@nuggets.one
 *
 * Requires in .env.local (or env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, name)
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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
        value = value.slice(1, -1)
      }
      if (process.env[key] == null) process.env[key] = value
    }
  }
}

loadEnvLocal()

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/confirm-auth-user.mjs <email>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(targetEmail) {
  const filterRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  )

  if (filterRes.ok) {
    const body = await filterRes.json()
    const users = Array.isArray(body.users) ? body.users : []
    const exact = users.find((u) => (u.email ?? '').toLowerCase() === targetEmail)
    if (exact) return exact
  }

  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)

    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === targetEmail)
    if (match) return match

    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

async function ensureProfile(userId) {
  const { data: existing, error: selectError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (selectError) {
    throw new Error(`profiles select failed: ${selectError.message}`)
  }

  if (existing) {
    return { created: false }
  }

  const { error: insertError } = await admin.from('profiles').insert({ id: userId })
  if (insertError) {
    throw new Error(`profiles insert failed: ${insertError.message}`)
  }

  return { created: true }
}

async function main() {
  console.log(`Looking up user: ${email}`)

  const user = await findUserByEmail(email)
  if (!user) {
    console.error(`No auth user found for ${email}`)
    process.exit(1)
  }

  console.log('Found user:', {
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at ?? null,
    created_at: user.created_at,
    is_admin: user.app_metadata?.is_admin === true,
  })

  if (user.email_confirmed_at) {
    console.log('Email already confirmed — no update needed.')
  } else {
    const { data: updated, error } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (error) {
      console.error(`updateUserById failed: ${error.message}`)
      process.exit(1)
    }

    console.log('Email confirmed:', {
      id: updated.user.id,
      email: updated.user.email,
      email_confirmed_at: updated.user.email_confirmed_at,
    })
  }

  const profile = await ensureProfile(user.id)
  console.log(profile.created ? 'Created missing profiles row.' : 'profiles row already exists.')

  console.log('Done.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
