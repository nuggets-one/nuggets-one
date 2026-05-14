import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LegalBody } from '@/components/legal/legal-body'
import { LegalPageToc } from '@/components/legal/legal-page-toc'
import { extractLegalTocFromMarkdown } from '@/lib/legal/extract-legal-toc'
import { getLegalPageBySlug } from '@/lib/queries/legal-pages'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const page = await getLegalPageBySlug(slug)
  if (!page) {
    return { title: 'Not found' }
  }
  return {
    title: page.pageTitle,
    robots: page.robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
  }
}

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function LegalDynamicPage(props: Props) {
  const { slug } = await props.params
  const page = await getLegalPageBySlug(slug)
  if (!page) notFound()

  const toc = extractLegalTocFromMarkdown(page.bodyMarkdown)
  const updatedLabel = formatUpdated(page.updatedAt)

  return (
    <div className="min-h-[calc(100vh-6rem)]">
      <header className="bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{page.pageTitle}</h1>
          {updatedLabel && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span>Last updated {updatedLabel}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="print:hidden">
            <LegalPageToc items={toc} articleId="legal-doc-body" />
          </aside>

          <article id="legal-doc-body" className="min-w-0" aria-label={page.pageTitle}>
            <div className="legal-content-body">
              <LegalBody markdown={page.bodyMarkdown} />
            </div>
            <p className="mt-10 text-sm">
              <Link href="/" className="font-medium text-accent underline underline-offset-2">
                Back to Home
              </Link>
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
