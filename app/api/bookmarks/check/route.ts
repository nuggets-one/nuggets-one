import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_IDS = 24

function parseIds(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const ids = parseIds(req.nextUrl.searchParams.get('ids'))

  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: 'Too many ids' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { bookmarkedArticleIds: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { bookmarkedArticleIds: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('article_id')
    .eq('user_id', user.id)
    .in('article_id', ids)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to check bookmarks', bookmarkedArticleIds: [] },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  return NextResponse.json(
    { bookmarkedArticleIds: (data ?? []).map((row) => row.article_id as string) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
