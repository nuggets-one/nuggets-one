import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchSourceMetadata } from '@/lib/admin/fetch-source-metadata'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  url: z.string().trim().min(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || user?.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: z.infer<typeof bodySchema>
  try {
    const json = await request.json()
    payload = bodySchema.parse(json)
  } catch {
    return NextResponse.json({ error: 'invalid_url', code: 'invalid_url' }, { status: 400 })
  }

  const result = await fetchSourceMetadata(payload.url)
  if (!result.ok) {
    const status = result.code === 'fetch_failed' || result.code === 'no_metadata' ? 502 : 400
    return NextResponse.json({ error: result.code, code: result.code }, { status })
  }

  return NextResponse.json({ metadata: result.metadata })
}
