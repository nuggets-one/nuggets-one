import 'server-only'

import { NextResponse } from 'next/server'
import { getPushHealthSnapshot } from '@/lib/notifications/push-health'

/**
 * Push + notification queue health. No secrets exposed.
 * Use in launch checklists and ops monitoring.
 */
export async function GET() {
  try {
    const snapshot = await getPushHealthSnapshot()
    const httpStatus = snapshot.status === 'ok' ? 200 : 503
    return NextResponse.json(snapshot, { status: httpStatus })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[health/push] error:', message)
    return NextResponse.json(
      { status: 'error', configured: false, error: message },
      { status: 500 }
    )
  }
}
