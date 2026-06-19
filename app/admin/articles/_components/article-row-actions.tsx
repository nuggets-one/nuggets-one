'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { deleteArticleAction } from '@/lib/actions/admin'
import { AdminSubmitButton } from './admin-submit-button'

type CollectionRow = { id: string; title: string }

type Props = {
  articleId: string
  editHref: string
  canAddToCollection: boolean
  availableCollections: CollectionRow[]
  returnTo: string
  addAction: (formData: FormData) => Promise<void>
}

const iconButtonClass =
  'inline-flex size-7 items-center justify-center rounded-md border border-border bg-bg text-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-40'

export function ArticleRowActions({
  articleId,
  editHref,
  canAddToCollection,
  availableCollections,
  returnTo,
  addAction,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setAddOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={rootRef} className="flex items-center justify-end gap-1">
      <Link
        href={editHref}
        aria-label="Edit nugget"
        className={iconButtonClass}
      >
        <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
      </Link>

      {canAddToCollection && (
        <div className="relative">
          <button
            type="button"
            aria-label="Add to collection"
            aria-haspopup="menu"
            aria-expanded={addOpen}
            onClick={() => setAddOpen((open) => !open)}
            className={iconButtonClass}
          >
            <FolderPlus size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {addOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-surface p-2 shadow-panel"
            >
              <form action={addAction} className="space-y-2">
                <input type="hidden" name="article_id" value={articleId} />
                <input type="hidden" name="return_to" value={returnTo} />
                <label className="block text-[11px] font-medium text-muted">
                  Collection
                  <select
                    name="collection_id"
                    defaultValue={availableCollections[0]?.id ?? ''}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {availableCollections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-accent px-2 py-1.5 text-xs font-semibold text-accent-foreground"
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <form
        action={deleteArticleAction}
        onSubmit={(e) => {
          if (!confirm('Delete this article? This cannot be undone.')) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={articleId} />
        <AdminSubmitButton
          label="Delete"
          pendingLabel="…"
          className={`${iconButtonClass} text-danger-fg hover:border-danger-border hover:bg-danger-soft hover:text-danger-fg`}
          aria-label="Delete nugget"
        >
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
        </AdminSubmitButton>
      </form>
    </div>
  )
}
