'use client'

import { useEffect, useMemo, useState } from 'react'

type CollectionRow = { id: string; title: string }

type Props = {
  collections: CollectionRow[]
  addAction: (formData: FormData) => Promise<void>
}

export default function ArticlesBulkAdd({ collections, addAction }: Props) {
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([])
  const [collectionId, setCollectionId] = useState<string>(collections[0]?.id ?? '')

  const checkboxIdsSet = useMemo(() => new Set(selectedArticleIds), [selectedArticleIds])

  useEffect(() => {
    // Selection is driven by native checkboxes rendered by the server component.
    const els = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-articles-bulk-checkbox]'),
    )

    const initial = els
      .filter((el) => el.checked)
      .map((el) => el.dataset.articlesBulkArticleId)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)

    setSelectedArticleIds(initial)

    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement | null
      const id = target?.dataset.articlesBulkArticleId
      if (!id) return

      setSelectedArticleIds((prev) => {
        const next = new Set(prev)
        if (target?.checked) next.add(id)
        else next.delete(id)
        return Array.from(next)
      })
    }

    for (const el of els) el.addEventListener('change', onChange)

    return () => {
      for (const el of els) el.removeEventListener('change', onChange)
    }
  }, [])

  const selectedCount = selectedArticleIds.length
  if (selectedCount === 0) return null

  const canSubmit = collections.length > 0 && collectionId.length > 0

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-raised px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-primary">
            Add {selectedCount} selected nugget{selectedCount === 1 ? '' : 's'}
          </div>
          <div className="text-xs text-muted">
            Drafts and already-in-collection items are automatically skipped.
          </div>
        </div>

        <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            <span>Select collection</span>
            <select
              name="collection_id"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-primary"
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
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40"
          >
            Add to collection
          </button>
        </form>
      </div>
    </div>
  )
}

