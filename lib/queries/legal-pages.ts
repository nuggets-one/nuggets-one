import { unstable_cache } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'

export type LegalFooterLink = {
  slug: string
  label: string
}

const DEFAULT_FOOTER_LINKS: LegalFooterLink[] = [
  { slug: 'terms', label: 'Terms of use' },
  { slug: 'privacy', label: 'Privacy policy' },
  { slug: 'contact', label: 'Contact' },
]

// PostgREST schema-cache miss (table not yet visible) and Postgres undefined_table.
// Both indicate the legal_pages migration has not been applied in this environment.
const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchLegalFooterLinks(): Promise<LegalFooterLink[]> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('legal_pages')
    .select('slug, label')
    .order('sort_order', { ascending: true })

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('listLegalFooterLinks:', error.message)
    }
    return [...DEFAULT_FOOTER_LINKS]
  }

  const rows = data as { slug?: string; label?: string }[] | null
  const parsed =
    rows
      ?.filter(
        (r): r is { slug: string; label: string } =>
          typeof r.slug === 'string' && r.slug.length > 0 &&
          typeof r.label === 'string' && r.label.length > 0
      )
      .map(({ slug, label }) => ({ slug, label })) ?? []

  return parsed.length > 0 ? parsed : [...DEFAULT_FOOTER_LINKS]
}

const cachedLegalFooterLinks = unstable_cache(
  fetchLegalFooterLinks,
  ['legal-footer-links'],
  { revalidate: 3600 }
)

/**
 * Rows from `legal_pages`; falls back when the table is empty or unreachable.
 * Result cached for 1h — legal slugs change rarely and are seeded by migration.
 */
export async function listLegalFooterLinks(): Promise<LegalFooterLink[]> {
  return cachedLegalFooterLinks()
}
