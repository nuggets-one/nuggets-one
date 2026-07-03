import { NextRequest, NextResponse } from 'next/server'
import { suggestArticles } from '@/lib/queries/article'
import { isSuggestRateLimited } from '@/lib/search/rate-limit'
import { effectiveFeedScope, isScopeEnabledStream, parseFeedScope } from '@/lib/feed/scope'
import { parseFeedStream } from '@/lib/copy/streams'

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
      { suggestions: [] },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const suggestions = await suggestArticles({ q, stream, scope })
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/search/suggest] Error:', message)
    return NextResponse.json(
      { suggestions: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
