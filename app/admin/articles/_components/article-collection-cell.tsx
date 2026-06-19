'use client'

import { useState } from 'react'

type CollectionRow = { id: string; title: string }

type Props = {
  articleId: string
  status: 'draft' | 'published'
  collections: CollectionRow[]
  memberCollectionIds: string[]
  returnTo: string
  addAction: (formData: FormData) => Promise<void>
  layout?: 'inline' | 'stacked'
  dense?: boolean
}

export function ArticleCollectionCell({
  articleId,
  status,
  collections,
  memberCollectionIds,
  returnTo,
  addAction,
  layout = 'inline',
  dense = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const memberSet = new Set(memberCollectionIds)
  const memberCollections = collections.filter((c) => memberSet.has(c.id))
  const availableCollections = collections.filter((c) => !memberSet.has(c.id))
  const canAdd = status === 'published' && availableCollections.length > 0

  const visibleChips = memberCollections.slice(0, dense ? 1 : 2)
  const overflowCount = memberCollections.length - visibleChips.length

  const chipRow = (
    <div className="flex flex-wrap items-center gap-1">
      {memberCollections.length === 0 ? (
        <span className={dense ? 'text-[11px] text-muted' : 'text-xs text-muted'}>
          {dense ? '—' : 'Not in any collection'}
        </span>
      ) : (
        <>
          {visibleChips.map((c) => (
            <span
              key={c.id}
              className={`inline-flex truncate rounded-full bg-surface-raised font-medium text-primary ${
                dense
                  ? 'max-w-[120px] px-1.5 py-0 text-[11px]'
                  : 'max-w-[140px] px-2 py-0.5 text-xs'
              }`}
              title={c.title}
            >
              {c.title}
            </span>
          ))}
          {overflowCount > 0 && (
            <span
              className={`inline-flex rounded-full bg-surface-raised font-medium text-muted ${
                dense ? 'px-1.5 py-0 text-[11px]' : 'px-2 py-0.5 text-xs'
              }`}
            >
              +{overflowCount}
            </span>
          )}
        </>
      )}
    </div>
  )

  if (dense) {
    return chipRow
  }

  if (expanded) {
    return (
      <div className={layout === 'stacked' ? 'space-y-2' : 'space-y-2 min-w-[200px]'}>
        {chipRow}
        <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="article_id" value={articleId} />
          <input type="hidden" name="return_to" value={returnTo} />

          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted">Collection</span>
            <select
              name="collection_id"
              defaultValue={availableCollections[0]?.id ?? ''}
              disabled={!canAdd}
              className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {availableCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="submit"
              disabled={!canAdd}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40"
            >
              Add to collection
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted hover:text-primary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      className={
        layout === 'stacked'
          ? 'space-y-2'
          : 'flex min-w-[180px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      {chipRow}
      {canAdd && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 self-start rounded-lg border border-border bg-bg px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-border-strong hover:bg-surface sm:self-center"
        >
          Add
        </button>
      )}
    </div>
  )
}
