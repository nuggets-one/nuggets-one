import Link from 'next/link'
import { TagDimensionBadge } from '@/app/admin/tags/_components/tag-dimension-badge'
import { TagOfficialBadge } from '@/app/admin/tags/_components/tag-official-badge'
import type { TagAdminRow } from '@/lib/queries/tags-admin'

type Props = {
  rows: TagAdminRow[]
}

export function TagsListMobile({ rows }: Props) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((tag) => (
        <article
          key={tag.id}
          className="rounded-lg border border-border bg-surface-raised px-2.5 py-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-primary">
                <Link href={`/admin/tags/${tag.id}`} className="hover:text-accent hover:underline">
                  {tag.label}
                </Link>
              </h2>
              <p className="truncate font-mono text-[11px] text-muted">{tag.slug}</p>
            </div>
            <Link
              href={`/admin/tags/${tag.id}`}
              className="shrink-0 text-xs font-medium text-accent hover:underline"
            >
              Edit
            </Link>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <TagDimensionBadge dimension={tag.dimension} compact />
            <TagOfficialBadge isOfficial={tag.is_official} compact />
            <span className="tabular-nums">
              · {tag.article_count} nugget{tag.article_count === 1 ? '' : 's'}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}
