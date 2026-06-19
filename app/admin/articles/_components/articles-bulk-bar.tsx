'use client'

import { useMemo, useState } from 'react'
import { useArticlesBulkSelection } from '@/app/admin/articles/_components/articles-select-all'

type CollectionRow = { id: string; title: string }

type Props = {
  collections: CollectionRow[]
  addAction: (formData: FormData) => Promise<void>
}

export function ArticlesBulkBar({ collections, addAction }: Props) {
  const {
    selectedArticleIds,
    selectedCount,
    clearSelection,
  } = useArticlesBulkSelection()

  const [collectionId, setCollectionId] = useState<string>(collections[0]?.id ?? '')

  const checkboxIdsSet = useMemo(() => new Set(selectedArticleIds), [selectedArticleIds])

  if (selectedCount === 0) return null

  const canSubmit = collections.length > 0 && collectionId.length > 0

  return (
    <div className="sticky top-12 z-10 mb-4 rounded-xl border border-accent/30 border-l-4 border-l-accent bg-surface-raised px-3 py-2.5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-sm font-semibold text-primary">
              {selectedCount} nugget{selectedCount === 1 ? '' : 's'} selected
            </div>
            <div className="text-xs text-muted">
              Drafts and already-in-collection items are skipped automatically.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              <span>Collection</span>
              <select
                name="collection_id"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="min-w-[180px] rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                disabled={!canSubmit}
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>

            {Array.from(checkboxIdsSet).map((id) => (
              <input key={id} type="hidden" name="article_id" value={id} />
            ))}

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Add to collection
            </button>
          </form>

          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-primary"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
