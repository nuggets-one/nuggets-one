import Link from 'next/link'
import type { CollectionEntryAdminRow } from '@/lib/queries/collections-admin'
import {
  removeCollectionEntryAction,
  reorderCollectionEntryAction,
} from '@/lib/actions/collections'
import { getStreamLabel, parseContentStream } from '@/lib/copy/streams'

type Props = {
  collectionId: string
  entries: CollectionEntryAdminRow[]
}

export function CollectionEntriesMobile({ collectionId, entries }: Props) {
  return (
    <div className="space-y-2 md:hidden">
      {entries.map((entry, index) => (
        <article
          key={entry.article_id}
          className="rounded-lg border border-border bg-surface-raised p-3"
        >
          <div className="mb-2 flex items-start gap-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-primary">
                <Link href={`/admin/articles/${entry.article_id}`} className="hover:underline">
                  {entry.title}
                </Link>
              </h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {getStreamLabel(parseContentStream(entry.content_stream))}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2">
            <form action={reorderCollectionEntryAction}>
              <input type="hidden" name="collection_id" value={collectionId} />
              <input type="hidden" name="article_id" value={entry.article_id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={index === 0}
                aria-label="Move up"
                className="flex min-h-11 min-w-11 items-center justify-center rounded border border-border text-sm disabled:opacity-40"
              >
                ↑
              </button>
            </form>
            <form action={reorderCollectionEntryAction}>
              <input type="hidden" name="collection_id" value={collectionId} />
              <input type="hidden" name="article_id" value={entry.article_id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={index === entries.length - 1}
                aria-label="Move down"
                className="flex min-h-11 min-w-11 items-center justify-center rounded border border-border text-sm disabled:opacity-40"
              >
                ↓
              </button>
            </form>
            <form action={removeCollectionEntryAction}>
              <input type="hidden" name="collection_id" value={collectionId} />
              <input type="hidden" name="article_id" value={entry.article_id} />
              <button
                type="submit"
                className="min-h-11 rounded-lg px-3 text-xs font-medium text-danger-fg hover:underline"
              >
                Remove
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  )
}
