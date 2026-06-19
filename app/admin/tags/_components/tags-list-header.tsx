import Link from 'next/link'
import type { TagsAdminStats } from '@/lib/queries/tags-admin'

type Props = {
  stats: TagsAdminStats
}

export function TagsListHeader({ stats }: Props) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-primary">Tags</h1>
          <span className="text-xs text-muted">
            {stats.total} tag{stats.total === 1 ? '' : 's'} · {stats.official} official
          </span>
        </div>
        <Link
          href="/admin/tags/new"
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          New tag
        </Link>
      </div>
      <p className="mt-1 text-xs leading-snug text-muted">
        Power Home filters and nugget classification. Optional dimensions:{' '}
        <strong className="font-medium text-primary">Format</strong>,{' '}
        <strong className="font-medium text-primary">Domain</strong>,{' '}
        <strong className="font-medium text-primary">Subtopic</strong>,{' '}
        <strong className="font-medium text-primary">Source</strong>. Official + dimension → Home
        chip rail and article editor. Chart providers (Bloomberg, Goldman Sachs, JPMorgan) are under
        Source — edit those rows, don&apos;t recreate.
      </p>
    </div>
  )
}
