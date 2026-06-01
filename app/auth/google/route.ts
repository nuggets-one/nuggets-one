import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeNext } from '@/lib/auth/sanitize-next'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010').replace(/\/+$/, '')

function isTrustedOAuthHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'nuggets.one' ||
    host === 'www.nuggets.one' ||
    host.endsWith('.nuggets.one') ||
    host === 'localhost' ||
    host.endsWith('.localhost')
  )
}

function resolveOAuthOrigin(request: NextRequest): string {
  const fallbackOrigin = new URL(SITE_URL).origin
  const requestHost = request.nextUrl.hostname
  if (!isTrustedOAuthHost(requestHost)) return fallbackOrigin
  return request.nextUrl.origin
}

function sanitizePrompt(raw: string | null): 'select_account' | undefined {
  if (!raw) return undefined
  if (raw === 'select_account') return 'select_account'
  return undefined
}

export async function GET(request: NextRequest) {
  const next = sanitizeNext(request.nextUrl.searchParams.get('next'))
  const prompt = sanitizePrompt(request.nextUrl.searchParams.get('prompt'))
  const oauthOrigin = resolveOAuthOrigin(request)

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Keep callback on the same trusted host that initiated OAuth so PKCE
      // verifier cookies are available during /auth/callback exchange.
      redirectTo: `${oauthOrigin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: prompt ? { prompt } : undefined,
    },
  })

  const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
  if (error || !data?.url) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=${encodeURIComponent(error?.message ?? 'OAuth failed')}${nextParam}`
    )
  }

  const redirectResponse = NextResponse.redirect(data.url)
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie)
  }
  return redirectResponse
}
