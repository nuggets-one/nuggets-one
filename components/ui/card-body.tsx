import Link from 'next/link'
import { CardPreviewYouTubeTimestamps } from '@/components/ui/card-preview-youtube-timestamps'

type Props = {
  href: string
  title: string
  cardPreviewHtml: string
  contentStream: 'standard' | 'pulse'
  displayTags: Array<{ slug: string; label: string }>
  /** When set, `#yt=` links in preview HTML open the feed mini-player. */
  youtubePreview?: { videoId: string; title: string; articleId: string }
}

export function CardBody({
  href,
  title,
  cardPreviewHtml,
  contentStream,
  displayTags,
  youtubePreview,
}: Props) {
  const previewText = cardPreviewHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const visibleTags = displayTags.slice(0, 3)
  const remainingTags = displayTags.slice(3)
  const overflowCount = Math.max(0, displayTags.length - visibleTags.length)
  const hasPreview = previewText.length > 0
  const filterHref = (slug: string) =>
    `/?stream=${encodeURIComponent(contentStream)}&tags=${encodeURIComponent(slug)}`

  return (
    <div className="flex flex-1 flex-col gap-1.5 px-4 pb-2 pt-1.5 text-left">
      {visibleTags.length > 0 && (
        <div className="flex min-w-0 flex-nowrap items-center gap-1 pb-0.5">
          {visibleTags.map((tag) => (
            <Link
              key={tag.slug}
              href={filterHref(tag.slug)}
              className="inline-flex shrink-0 items-center rounded-full border border-card-tag-border bg-card-tag-bg px-1.5 py-0.5 text-[10px] font-medium leading-4 text-card-tag-text transition-colors hover:border-card-tag-hover-border hover:bg-card-tag-hover-bg hover:text-card-tag-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
            >
              {tag.label}
            </Link>
          ))}
          {overflowCount > 0 && (
            <details className="relative shrink-0">
              <summary className="list-none cursor-pointer text-[10px] font-medium leading-4 text-muted underline underline-offset-2 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 rounded-sm">
                +{overflowCount} more
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-border bg-rail p-2 shadow-panel ring-1 ring-elevated">
                <div className="flex flex-wrap gap-1.5">
                  {remainingTags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={filterHref(tag.slug)}
                      className="inline-flex items-center rounded-full border border-card-tag-border bg-card-tag-bg px-1.5 py-0.5 text-[10px] font-medium leading-4 text-card-tag-text transition-colors hover:border-card-tag-hover-border hover:bg-card-tag-hover-bg hover:text-card-tag-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                    >
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      )}

      <Link href={href} className="flex min-h-[44px] items-start focus:outline-none">
        <h2 className="line-clamp-2 text-xs font-semibold leading-snug text-card-title transition-colors group-hover:text-slate-950 dark:group-hover:text-slate-100">
          {title}
        </h2>
      </Link>

      {hasPreview && (
        <div className="relative">
          {youtubePreview ? (
            <CardPreviewYouTubeTimestamps
              videoId={youtubePreview.videoId}
              title={youtubePreview.title}
              articleId={youtubePreview.articleId}
            >
              <div
                className="max-h-[8.75rem] overflow-hidden text-xs leading-5 text-muted [&_a]:text-body-link [&_a]:no-underline [&_a:hover]:underline [&_blockquote]:my-4 [&_blockquote]:ml-0 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted [&_em]:italic [&_p]:m-0 [&_p]:mb-1.5 [&_strong]:font-bold [&_strong]:text-primary"
                dangerouslySetInnerHTML={{ __html: cardPreviewHtml }}
              />
            </CardPreviewYouTubeTimestamps>
          ) : (
            <div
              className="max-h-[8.75rem] overflow-hidden text-xs leading-5 text-muted [&_a]:text-body-link [&_a]:no-underline [&_a:hover]:underline [&_blockquote]:my-4 [&_blockquote]:ml-0 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted [&_em]:italic [&_p]:m-0 [&_p]:mb-1.5 [&_strong]:font-bold [&_strong]:text-primary"
              dangerouslySetInnerHTML={{ __html: cardPreviewHtml }}
            />
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent md:hidden"
          />
        </div>
      )}
    </div>
  )
}
