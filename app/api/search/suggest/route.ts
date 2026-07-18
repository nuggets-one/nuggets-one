import { NextRequest, NextResponse } from 'next/server'
import { SuggestUnavailableError, suggestArticles } from '@/lib/queries/article'
import { isSuggestRateLimited } from '@/lib/search/rate-limit'
import { effectiveFeedScope, isScopeEnabledStream, parseFeedScope } from '@/lib/feed/scope'
import { parseFeedStream } from '@/lib/copy/streams'

const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim().slice(0, 200)
  const stream = parseFeedStream(searchParams.get('stream'))
  const scope = isScopeEnabledStream(stream)
    ? effectiveFeedScope(stream, parseFeedScope(searchParams.get('scope')))
    : undefined
  const rateKey =
    req.headers.get('x-vercel-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonymous'

  if (isSuggestRateLimited(rateKey)) {
    return NextResponse.json(
      { suggestions: [], error: 'rate_limited' },
      { status: 429, headers: NO_STORE }
    )
  }

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] }, { headers: NO_STORE })
  }

  try {
    const suggestions = await suggestArticles({ q, stream, scope })
    return NextResponse.json({ suggestions }, { headers: NO_STORE })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/search/suggest] Error:', message)
    const status = err instanceof SuggestUnavailableError ? 503 : 500
    return NextResponse.json(
      { suggestions: [], error: 'suggest_unavailable' },
      { status, headers: NO_STORE }
    )
  }
}
