'use client'

import { deleteArticleAction } from '@/lib/actions/admin'

export function DeleteArticleButton({ id }: { id: string }) {
  return (
    <form
      action={deleteArticleAction}
      onSubmit={(e) => {
        if (!confirm('Delete this article? This cannot be undone.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg border border-danger-border text-danger-fg text-sm font-medium hover:bg-danger-soft transition-colors"
      >
        Delete
      </button>
    </form>
  )
}
