/**
 * Production Google OAuth verification (read-only).
 * Usage: node scripts/verify-google-oauth.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVER_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const SERVER_ANON = process.env.SUPABASE_ANON_KEY ?? ''

const PROD_LOGIN = 'https://www.nuggets.one/login'
const EXPECTED_SITE = 'https://nuggets.one'
const CALLBACK = `${EXPECTED_SITE}/auth/callback`

function pass(label) {
  console.log(`PASS: ${label}`)
}
function fail(label, detail = '') {
  console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
}
function warn(label, detail = '') {
  console.log(`WARN: ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('=== Local / .env.local (Vercel parity check) ===\n')

if (!SITE_URL) fail('NEXT_PUBLIC_SITE_URL set')
else if (SITE_URL === EXPECTED_SITE) pass(`NEXT_PUBLIC_SITE_URL = ${EXPECTED_SITE}`)
else fail('NEXT_PUBLIC_SITE_URL', `got ${SITE_URL}, expected ${EXPECTED_SITE}`)

if (!SUPABASE_URL) fail('NEXT_PUBLIC_SUPABASE_URL set')
else if (/^https:\/\/[^/]+\.supabase\.co$/.test(SUPABASE_URL)) pass('NEXT_PUBLIC_SUPABASE_URL shape')
else fail('NEXT_PUBLIC_SUPABASE_URL shape', SUPABASE_URL)

if (SUPABASE_URL && SERVER_URL && SUPABASE_URL === SERVER_URL) pass('SUPABASE_URL matches NEXT_PUBLIC_SUPABASE_URL')
else fail('SUPABASE_URL matches NEXT_PUBLIC_SUPABASE_URL')

if (ANON_KEY && SERVER_ANON && ANON_KEY === SERVER_ANON) pass('SUPABASE_ANON_KEY matches NEXT_PUBLIC_SUPABASE_ANON_KEY')
else fail('anon key pair match')

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1] ?? ''
if (projectRef) pass(`Supabase project ref: ${projectRef}`)

console.log('\n=== Supabase OAuth initiation (same as googleSignInAction) ===\n')

if (!SUPABASE_URL || !ANON_KEY) {
  console.log('SKIP: missing Supabase env for OAuth probe')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: false },
})

const redirectTo = `${SITE_URL || EXPECTED_SITE}/auth/callback?next=${encodeURIComponent('/')}`
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo, skipBrowserRedirect: true },
})

if (error) {
  fail('signInWithOAuth', error.message)
} else if (!data?.url) {
  fail('signInWithOAuth', 'no authorization URL returned')
} else {
  pass('signInWithOAuth returned authorization URL')
  try {
    const u = new URL(data.url)
    if (u.hostname.includes('supabase.co')) pass('Auth URL host is Supabase')
    else fail('Auth URL host', u.hostname)
    const provider = u.searchParams.get('provider') ?? u.pathname
    if (provider.includes('google') || u.searchParams.get('provider') === 'google') {
      pass('Provider is Google')
    } else {
      warn('Could not confirm Google provider in URL', u.pathname)
    }
    const redirectParam =
      u.searchParams.get('redirect_to') ?? u.searchParams.get('redirect_uri') ?? ''
    if (redirectParam.includes('/auth/callback')) pass('redirect_to includes /auth/callback')
    else warn('redirect_to param', redirectParam.slice(0, 120))
  } catch (e) {
    fail('parse auth URL', String(e))
  }
}

console.log('\n=== Production site probes ===\n')

try {
  const apex = await fetch('https://nuggets.one/login', { redirect: 'manual' })
  const loc = apex.headers.get('location') ?? ''
  if (apex.status === 307 && loc.includes('www.nuggets.one')) {
    warn('apex nuggets.one redirects to www', loc)
  } else if (apex.ok) {
    pass('https://nuggets.one/login reachable')
  } else {
    warn('apex login status', String(apex.status))
  }
} catch (e) {
  fail('apex fetch', String(e))
}

try {
  const www = await fetch(PROD_LOGIN)
  if (www.ok) pass('https://www.nuggets.one/login returns 200')
  else fail('www login status', String(www.status))
  const html = await www.text()
  if (html.includes('Continue with Google')) pass('Login page has Google button')
  else fail('Google button copy missing on production login')
} catch (e) {
  fail('www login fetch', String(e))
}

console.log('\n=== Redirect URL allowlist probe (apex vs www) ===\n')

for (const site of [EXPECTED_SITE, 'https://www.nuggets.one']) {
  const to = `${site}/auth/callback?next=${encodeURIComponent('/')}`
  const { error: e } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: to, skipBrowserRedirect: true },
  })
  if (e) fail(`signInWithOAuth redirectTo ${site}`, e.message)
  else pass(`signInWithOAuth accepts redirectTo ${site}`)
}

console.log('\n=== Google authorize redirect (provider wiring) ===\n')

if (data?.url) {
  try {
    const res = await fetch(data.url, { redirect: 'manual' })
    const loc = res.headers.get('location') ?? ''
    if (res.status >= 300 && res.status < 400 && loc.includes('accounts.google.com')) {
      pass('Supabase → Google redirect (Google OAuth client wired)')
    } else if (res.status >= 300 && loc) {
      if (loc.includes('error')) fail('OAuth redirect error', loc.slice(0, 200))
      else warn('Unexpected redirect', `${res.status} → ${loc.slice(0, 120)}`)
    } else {
      warn('No redirect to Google', `status ${res.status}`)
    }
  } catch (e) {
    fail('fetch authorize URL', String(e))
  }
}

console.log('\n=== Manual dashboard checklist (cannot automate) ===\n')
console.log(`Supabase → Auth → URL Configuration → Redirect URLs must include:\n  ${CALLBACK}`)
console.log(`  https://www.nuggets.one/auth/callback  (apex redirects to www)`)
if (projectRef) {
  console.log(`Google Cloud → OAuth client → Authorized redirect URIs must include:\n  ${SUPABASE_URL}/auth/v1/callback`)
}
console.log(`Vercel production: NEXT_PUBLIC_SITE_URL should be ${EXPECTED_SITE} (local .env may differ)`)
