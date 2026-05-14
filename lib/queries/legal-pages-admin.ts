import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import type { LegalPageAdminRow } from '@/lib/types/legal-pages'

function mapRow(raw: Record<string, unknown>): LegalPageAdminRow | null {
  const id = raw.id
  const slug = raw.slug
  const label = raw.label
  if (typeof id !== 'string' || typeof slug !== 'string' || typeof label !== 'string') return null

  return {
    id,
    slug,
    label,
    page_title: typeof raw.page_title === 'string' ? raw.page_title : null,
    body_markdown: typeof raw.body_markdown === 'string' ? raw.body_markdown : '',
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 0,
    is_enabled: raw.is_enabled !== false,
    show_in_footer: raw.show_in_footer !== false,
    show_in_account_menu: raw.show_in_account_menu !== false,
    robots_index: raw.robots_index !== false,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : '',
  }
}

export async function listLegalPagesAdmin(): Promise<LegalPageAdminRow[]> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('legal_pages')
    .select(
      'id, slug, label, page_title, body_markdown, sort_order, is_enabled, show_in_footer, show_in_account_menu, robots_index, updated_at'
    )
    .order('sort_order', { ascending: true })
    .order('slug', { ascending: true })

  if (error) {
    const missingCmsColumn =
      error.message?.includes('page_title') || error.message?.includes('body_markdown')
    if (!missingCmsColumn) {
      console.error('listLegalPagesAdmin:', error.message)
    }
    return []
  }

  const rows = (data as Record<string, unknown>[] | null) ?? []
  return rows.map(mapRow).filter((r): r is LegalPageAdminRow => r !== null)
}

export async function getLegalPageAdminBySlug(slug: string): Promise<LegalPageAdminRow | null> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('legal_pages')
    .select(
      'id, slug, label, page_title, body_markdown, sort_order, is_enabled, show_in_footer, show_in_account_menu, robots_index, updated_at'
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    const missingCmsColumn =
      error.message?.includes('page_title') || error.message?.includes('body_markdown')
    if (!missingCmsColumn) {
      console.error('getLegalPageAdminBySlug:', error.message)
    }
    return null
  }

  if (!data || typeof data !== 'object') return null
  return mapRow(data as Record<string, unknown>)
}
