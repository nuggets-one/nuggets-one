import Link from 'next/link'
import type { RelatedArticlePreview } from '@/types/article'

type Props = {
  items: RelatedArticlePreview[]
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function ArticleDetailRelated({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="related-nuggets-heading" className="border-t border-border pt-10 sm:pt-12">
      <div className="space-y-4">
        <h2 id="related-nuggets-heading" className="text-lg font-semibold tracking-tight text-primary">
          Related nuggets
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/nuggets/${item.id}/${item.slug}`}
              className="group rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:bg-surface-raised"
            >
              <p className="text-xs text-muted">{formatDateShort(item.published_at)}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-primary transition-colors group-hover:text-primary/90">
                {item.title}
              </h3>
              {item.excerpt ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.excerpt}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
