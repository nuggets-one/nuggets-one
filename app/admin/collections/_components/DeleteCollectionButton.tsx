'use client'

import { deleteCollectionAction } from '@/lib/actions/collections'

export function DeleteCollectionButton({
  id,
  title,
  variant = 'default',
}: {
  id: string
  title: string
  variant?: 'default' | 'compact'
}) {
  const buttonClass =
    variant === 'compact'
      ? 'text-sm text-danger-fg underline underline-offset-2 hover:text-danger-fg/80'
      : 'px-4 py-2 rounded-lg border border-danger-border text-danger-fg text-sm font-medium hover:bg-danger-soft transition-colors'

  return (
    <form
      action={deleteCollectionAction}
      onSubmit={(e) => {
        if (!confirm(`Delete collection "${title}"? All nugget links will be removed.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={buttonClass}>
        Delete
      </button>
    </form>
  )
}
