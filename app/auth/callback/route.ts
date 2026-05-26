import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const msg = encodeURIComponent(error.message)
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    return NextResponse.redirect(`${origin}/login?error=${msg}${nextParam}`)
  }

  const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed${nextParam}`)
}
