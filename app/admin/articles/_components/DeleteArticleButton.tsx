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
        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 transition-colors"
      >
        Delete
      </button>
    </form>
  )
}
