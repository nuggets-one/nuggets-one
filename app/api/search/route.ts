import { NextRequest, NextResponse } from 'next/server'
import { getFeedPage } from '@/lib/queries/feed'
import type { ContentStream } from '@/types/article'

const VALID_STREAMS = new Set<string>(['standard', 'pulse'])
const MAX_Q_LENGTH = 200
const MAX_TAGS = 5

function parseStream(raw: string | null): ContentStream {
  if (raw && VALID_STREAMS.has(raw)) return raw as ContentStream
  return 'standard'
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_Q_LENGTH)
  const stream = parseStream(searchParams.get('stream'))
  const tags = parseTags(searchParams.get('tags'))

  if (!q) {
    return NextResponse.json(
      { articles: [], nextCursor: null, stream },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const result = await getFeedPage({ stream, tags, q })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/search] Error:', message)
    return NextResponse.json(
      { error: 'Failed to search', articles: [], nextCursor: null, stream },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
