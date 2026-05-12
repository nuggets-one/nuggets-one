import Link from 'next/link'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import { ShareButton } from '@/components/ui/share-button'
import { CardMoreButton } from '@/components/ui/card-more-button'

function formatCompactDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).formatToParts(new Date(iso))
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  return `${day} ${month} '${year}`.trim()
}

function getSourceChipLabel(sourceHost: string | null): string | null {
  if (!sourceHost) return 'N'

  const rootLabel = sourceHost.split('.')[0]?.replace(/[^a-z0-9]/gi, '') ?? ''
  const label = rootLabel || sourceHost.replace(/[^a-z0-9]/gi, '')

  if (!label) return 'N'
  return label.length === 1 ? label.charAt(0).toUpperCase() : label.slice(0, 2).toUpperCase()
}

type Props = {
  href: string
  title: string
  published_at: string
  sourceHost: string | null
  source_url: string | null
  articleId: string
  isAuthenticated: boolean
  initialBookmarked: boolean
}

export function CardFooter({
  href,
  title,
  published_at,
  sourceHost,
  source_url,
  articleId,
  isAuthenticated,
  initialBookmarked,
}: Props) {
  const sourceChipLabel = getSourceChipLabel(sourceHost)
  const compactDate = formatCompactDate(published_at)

  return (
    <div className="mt-auto block px-4 py-2 md:border-t md:border-border">
      <div className="flex flex-col gap-2">
        <div className="hidden items-center justify-center md:flex">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface"
          >
            <span>View Full Article</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M4.5 9L7.5 6L4.5 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span
              aria-hidden="true"
              title={sourceHost ?? 'Nuggets'}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ffea96] bg-[#fff5c8] text-[9px] font-bold text-[#ca8a04] dark:border-[#854d0e] dark:bg-[#713f12]/30 dark:text-[#facc15]"
            >
              {sourceChipLabel}
            </span>
            <span className="shrink-0">
              {compactDate}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <div className="shrink-0">
              <ShareButton title={title} href={href} variant="footer" />
            </div>
            <div className="shrink-0">
              <BookmarkButton
                articleId={articleId}
                initialBookmarked={initialBookmarked}
                isAuthenticated={isAuthenticated}
                variant="footer"
              />
            </div>
            {source_url && (
              <div className="shrink-0">
                <CardMoreButton sourceUrl={source_url} sourceHost={sourceHost} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
