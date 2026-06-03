import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export async function insertOutboxRowsIgnoreDuplicates(
  table: 'push_digest_outbox' | 'push_immediate_outbox',
  rows: Record<string, unknown>[]
): Promise<number> {
  if (rows.length === 0) return 0

  const adminClient = getAdminClient()
  let inserted = 0

  for (const row of rows) {
    const { error } = await adminClient.from(table).insert(row)
    if (!error) {
      inserted += 1
      continue
    }
    if (error.code !== '23505') {
      console.warn(`[insertOutboxRowsIgnoreDuplicates] ${table} insert error:`, error.message)
    }
  }

  return inserted
}
