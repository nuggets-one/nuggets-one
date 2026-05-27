import 'server-only'

/** Server-side Supabase URL — prefers SUPABASE_URL, falls back to NEXT_PUBLIC_* for Vercel parity. */
export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing Supabase public env vars')
  return url
}

/** Server-side anon key — prefers SUPABASE_ANON_KEY, falls back to NEXT_PUBLIC_* for Vercel parity. */
export function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing Supabase public env vars')
  return key
}
