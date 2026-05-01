import Link from 'next/link'
import { listLegalFooterLinks } from '@/lib/queries/legal-pages'

const DISCLAIMER =
  'Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.'

export async function Footer() {
  const links = await listLegalFooterLinks()
  const year = new Date().getFullYear()

  return (
    <footer role="contentinfo" className="border-t border-border bg-surface pb-10 pt-10">
      <div className="mx-auto max-w-[1800px] px-4 lg:px-6">
        <p className="max-w-3xl text-xs leading-snug text-muted">{DISCLAIMER}</p>

        <nav aria-label="Legal and contact" className="mt-5">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium">
            {links.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/legal/${item.slug}`}
                  className="text-primary underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 min-h-[44px] inline-flex items-center rounded-sm px-1"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 text-xs text-muted">© {year} Nuggets</p>
      </div>
    </footer>
  )
}
