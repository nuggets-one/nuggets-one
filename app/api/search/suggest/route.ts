import { NextRequest, NextResponse } from 'next/server'
import { suggestArticles } from '@/lib/queries/article'
import type { ContentStream } from '@/types/article'

const VALID_STREAMS = new Set<string>(['standard', 'pulse'])

function parseStream(raw: string | null): ContentStream {
  if (raw && VALID_STREAMS.has(raw)) return raw as ContentStream
  return 'standard'
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim().slice(0, 200)
  const stream = parseStream(searchParams.get('stream'))

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const suggestions = await suggestArticles({ q, stream })
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
