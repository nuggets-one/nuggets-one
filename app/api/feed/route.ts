// Feed pagination API — called by FeedPager (client component) for pages 2+.
// Page 1 is server-rendered by the Home RSC — this route only serves continuation pages.
//
// Cache posture (BLUEPRINT §10):
//   - pulse stream:    short TTL (120s) — freshness SLA
//   - standard stream: longer TTL (300s) — less volatile
//   - Any cursor param: no-store — paginated pages are not worth caching at CDN
//   - Any q param:      no-store — search results not cached

import { NextRequest, NextResponse } from 'next/server'
import { getFeedPage } from '@/lib/queries/feed'
import type { ContentStream, FeedCursor } from '@/types/article'

const VALID_STREAMS = new Set(['standard', 'pulse'])
const MAX_TAGS = 5
const MAX_Q_LENGTH = 200

function parseStream(raw: string | null): ContentStream {
  if (raw && VALID_STREAMS.has(raw)) return raw as ContentStream
  return 'standard'
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 80)
    .slice(0, MAX_TAGS)
}

function parseQ(raw: string | null): string {
  if (!raw) return ''
  return raw.trim().slice(0, MAX_Q_LENGTH)
}

function parseCursor(
  pubRaw: string | null,
  idRaw: string | null
): FeedCursor | undefined {
  if (!pubRaw || !idRaw) return undefined
  const ts = Date.parse(pubRaw)
  if (isNaN(ts)) return undefined
  if (idRaw.length !== 36 || idRaw.split('-').length !== 5) return undefined
  return { published_at: pubRaw, id: idRaw }
}

function getCacheControl(
  stream: ContentStream,
  hasCursor: boolean,
  hasQ: boolean
): string {
  if (hasCursor || hasQ) return 'no-store'
  const maxAge = stream === 'pulse' ? 120 : 300
  return `public, max-age=${maxAge}, stale-while-revalidate=60`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const stream = parseStream(searchParams.get('stream'))
  const tags = parseTags(searchParams.get('tags'))
  const q = parseQ(searchParams.get('q'))
  const cursor = parseCursor(
    searchParams.get('cursor_pub'),
    searchParams.get('cursor_id')
  )

  const hasCursor = cursor !== undefined
  const hasQ = q.length > 0

  try {
    const result = await getFeedPage({ stream, tags, q, cursor })

    return NextResponse.json(
      result,
      {
      headers: {
        'Cache-Control': getCacheControl(stream, hasCursor, hasQ),
        Vary: 'Accept',
      },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/feed] Error:', message)

    return NextResponse.json(
      { error: 'Failed to load feed', articles: [], nextCursor: null },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
