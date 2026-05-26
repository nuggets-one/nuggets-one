import { createServerClient } from '@supabase/ssr'
import { sanitizeNext } from '@/lib/auth/sanitize-next'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  if (oauthError) {
    const msg = encodeURIComponent(oauthErrorDescription ?? oauthError)
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/login?error=${msg}${nextParam}`)
  }

  if (code) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const successResponse = NextResponse.redirect(`${origin}${next}`)
      for (const cookie of response.cookies.getAll()) {
        successResponse.cookies.set(cookie)
      }
      return successResponse
    }
    const msg = encodeURIComponent(error.message)
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/login?error=${msg}${nextParam}`)
  }

  const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed${nextParam}`)
}
