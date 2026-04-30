import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies so downstream Server Components see the fresh session
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Rebuild the pass-through response with the updated request
          supabaseResponse = NextResponse.next({ request })
          // Set-Cookie headers on the response so the browser stores the refreshed tokens
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // getUser() refreshes the session token when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // S7-F2: API routes must receive JSON 401, not an HTML redirect.
    // BookmarkButton and other fetch() callers check res.ok — a 307 to /login
    // gives res.ok=true (after redirect) with HTML body, silently breaking JSON parsing.
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/bookmarks',
    '/account/:path*',
    '/api/bookmarks/:path*',
    // NOT: /api/collections/* — fully public GET
    // NOT: /collections/:path* — fully public, anonymous-accessible
  ],
}
