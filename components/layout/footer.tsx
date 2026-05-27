import Link from 'next/link'
import { listLegalFooterLinks } from '@/lib/queries/legal-pages'

const FALLBACK_LEGAL_LINKS = [
  { slug: 'terms', label: 'Terms of use' },
  { slug: 'privacy', label: 'Privacy policy' },
  { slug: 'contact', label: 'Contact' },
]

export async function Footer() {
  let links = FALLBACK_LEGAL_LINKS
  try {
    links = await listLegalFooterLinks()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Footer legal links fallback: ${message}`)
  }
  const year = new Date().getFullYear()

  return (
    <footer role="contentinfo" className="mt-10 border-t border-border bg-surface py-6 sm:py-7">
      <div className="mx-auto max-w-[90rem] px-4 lg:px-6">
        <nav aria-label="Legal and contact">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {links.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/legal/${item.slug}`}
                  className="inline-flex items-center rounded-sm px-1 py-1 text-muted underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-5 text-xs text-muted">© {year} Nuggets</p>
      </div>
    </footer>
  )
}
