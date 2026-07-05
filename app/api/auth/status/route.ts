import { NextResponse } from 'next/server'
import { getServerAuthStatus } from '@/lib/auth/server-auth-status'

export async function GET() {
  const status = await getServerAuthStatus()

  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
