'use client'

import { deleteArticleAction } from '@/lib/actions/admin'

export function DeleteArticleButton({
  id,
  variant = 'default',
}: {
  id: string
  variant?: 'default' | 'compact'
}) {
  const buttonClass =
    variant === 'compact'
      ? 'text-sm text-danger-fg underline underline-offset-2 hover:text-danger-fg/80'
      : 'px-4 py-2 rounded-lg border border-danger-border text-danger-fg text-sm font-medium hover:bg-danger-soft transition-colors'

  return (
    <form
      action={deleteArticleAction}
      onSubmit={(e) => {
        if (!confirm('Delete this article? This cannot be undone.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={buttonClass}>
        Delete
      </button>
    </form>
  )
}
