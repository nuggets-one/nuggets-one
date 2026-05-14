import { unstable_cache } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'
import { CACHE_TAGS } from '@/lib/cache'

export type LegalFooterLink = {
  slug: string
  label: string
}

export type LegalPublicPage = {
  slug: string
  label: string
  pageTitle: string
  bodyMarkdown: string
  updatedAt: string
  robotsIndex: boolean
}

const DEFAULT_FOOTER_LINKS: LegalFooterLink[] = [
  { slug: 'terms', label: 'Terms of use' },
  { slug: 'privacy', label: 'Privacy policy' },
  { slug: 'contact', label: 'Contact' },
]

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

function mapFooterRow(r: { slug?: string; label?: string }): LegalFooterLink | null {
  if (typeof r.slug === 'string' && r.slug.length > 0 && typeof r.label === 'string' && r.label.length > 0) {
    return { slug: r.slug, label: r.label }
  }
  return null
}

async function fetchLegalFooterLinksUncached(): Promise<LegalFooterLink[]> {
  const supabase = getPublicClient()

  const filtered = await supabase
    .from('legal_pages')
    .select('slug, label, is_enabled, show_in_footer')
    .eq('is_enabled', true)
    .eq('show_in_footer', true)
    .order('sort_order', { ascending: true })

  if (filtered.error) {
    const missingCmsColumn =
      filtered.error.message?.includes('is_enabled') ||
      filtered.error.message?.includes('show_in_footer') ||
      filtered.error.message?.includes('page_title')
    if (!missingCmsColumn && !PENDING_MIGRATION_CODES.has(filtered.error.code ?? '')) {
      console.error('listLegalFooterLinks:', filtered.error.message)
    }
    const legacy = await supabase.from('legal_pages').select('slug, label').order('sort_order', { ascending: true })
    if (legacy.error) {
      if (!PENDING_MIGRATION_CODES.has(legacy.error.code ?? '')) {
        console.error('listLegalFooterLinks (legacy):', legacy.error.message)
      }
      return [...DEFAULT_FOOTER_LINKS]
    }
    const legacyParsed =
      (legacy.data as { slug?: string; label?: string }[] | null)
        ?.map(mapFooterRow)
        .filter((x): x is LegalFooterLink => x !== null) ?? []
    return legacyParsed.length > 0 ? legacyParsed : [...DEFAULT_FOOTER_LINKS]
  }

  const rows = filtered.data as { slug?: string; label?: string }[] | null
  const parsed = rows?.map(mapFooterRow).filter((x): x is LegalFooterLink => x !== null) ?? []
  return parsed
}

const cachedLegalFooterLinks = unstable_cache(fetchLegalFooterLinksUncached, ['legal-footer-links'], {
  tags: [CACHE_TAGS.legalDocuments],
  revalidate: false,
})

export async function listLegalFooterLinks(): Promise<LegalFooterLink[]> {
  return cachedLegalFooterLinks()
}

async function fetchLegalAccountMenuLinksUncached(): Promise<LegalFooterLink[]> {
  const supabase = getPublicClient()

  const filtered = await supabase
    .from('legal_pages')
    .select('slug, label, is_enabled, show_in_account_menu')
    .eq('is_enabled', true)
    .eq('show_in_account_menu', true)
    .order('sort_order', { ascending: true })

  if (filtered.error) {
    const missingCmsColumn =
      filtered.error.message?.includes('is_enabled') ||
      filtered.error.message?.includes('show_in_account_menu') ||
      filtered.error.message?.includes('page_title')
    if (!missingCmsColumn && !PENDING_MIGRATION_CODES.has(filtered.error.code ?? '')) {
      console.error('listAccountMenuLegalLinks:', filtered.error.message)
    }
    const legacy = await supabase.from('legal_pages').select('slug, label').order('sort_order', { ascending: true })
    if (legacy.error) {
      if (!PENDING_MIGRATION_CODES.has(legacy.error.code ?? '')) {
        console.error('listAccountMenuLegalLinks (legacy):', legacy.error.message)
      }
      return [...DEFAULT_FOOTER_LINKS]
    }
    const legacyParsed =
      (legacy.data as { slug?: string; label?: string }[] | null)
        ?.map(mapFooterRow)
        .filter((x): x is LegalFooterLink => x !== null) ?? []
    return legacyParsed.length > 0 ? legacyParsed : [...DEFAULT_FOOTER_LINKS]
  }

  const rows = filtered.data as { slug?: string; label?: string }[] | null
  const parsed = rows?.map(mapFooterRow).filter((x): x is LegalFooterLink => x !== null) ?? []
  return parsed
}

const cachedLegalAccountMenuLinks = unstable_cache(fetchLegalAccountMenuLinksUncached, ['legal-account-menu-links'], {
  tags: [CACHE_TAGS.legalDocuments],
  revalidate: false,
})

export async function listAccountMenuLegalLinks(): Promise<LegalFooterLink[]> {
  return cachedLegalAccountMenuLinks()
}

async function fetchLegalPageBySlugUncached(slug: string): Promise<LegalPublicPage | null> {
  const supabase = getPublicClient()
  const { data, error } = await supabase
    .from('legal_pages')
    .select('slug, label, page_title, body_markdown, updated_at, robots_index')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    const missingCmsColumn =
      error.message?.includes('page_title') || error.message?.includes('body_markdown')
    if (!missingCmsColumn && !PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('getLegalPageBySlug:', error.message)
    }
    return null
  }

  const row = data as {
    slug?: string
    label?: string
    page_title?: string | null
    body_markdown?: string | null
    updated_at?: string | null
    robots_index?: boolean | null
  } | null

  if (!row || typeof row.slug !== 'string') return null

  const label = typeof row.label === 'string' ? row.label : ''
  const pageTitle =
    typeof row.page_title === 'string' && row.page_title.trim().length > 0 ? row.page_title.trim() : label
  const bodyMarkdown = typeof row.body_markdown === 'string' ? row.body_markdown : ''
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString()
  const robotsIndex = row.robots_index !== false

  return {
    slug: row.slug,
    label,
    pageTitle,
    bodyMarkdown,
    updatedAt,
    robotsIndex,
  }
}

export async function getLegalPageBySlug(slug: string): Promise<LegalPublicPage | null> {
  const runner = unstable_cache(
    async () => fetchLegalPageBySlugUncached(slug),
    ['legal-page', slug],
    { tags: [CACHE_TAGS.legalDocuments], revalidate: false }
  )
  return runner()
}
