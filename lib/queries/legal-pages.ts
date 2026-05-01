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

/**
 * Rows from `legal_pages`; falls back when the table is empty or unreachable.
 */
export async function listLegalFooterLinks(): Promise<LegalFooterLink[]> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('legal_pages')
    .select('slug, label')
    .order('sort_order', { ascending: true })

  if (error) {
    const pendingMigration =
      error.message.includes('Could not find the table') &&
      error.message.includes('legal_pages')
    if (!pendingMigration) {
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
