'use client'

import { deleteArticleAction } from '@/lib/actions/admin'
import { AdminSubmitButton } from './admin-submit-button'

export function DeleteArticleButton({
  id,
  variant = 'default',
}: {
  id: string
  variant?: 'default' | 'compact'
}) {
  const buttonClass =
    variant === 'compact'
      ? 'w-full rounded-lg border border-danger-border px-3 py-2 text-sm font-medium text-danger-fg transition-colors hover:bg-danger-soft disabled:opacity-60'
      : 'rounded-lg border border-danger-border px-4 py-2 text-sm font-medium text-danger-fg transition-colors hover:bg-danger-soft disabled:opacity-60'

  return (
    <form
      action={deleteArticleAction}
      className={variant === 'compact' ? 'w-full' : undefined}
      onSubmit={(e) => {
        if (!confirm('Delete this article? This cannot be undone.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <AdminSubmitButton label="Delete" pendingLabel="Deleting…" className={buttonClass} />
    </form>
  )
}
