'use client'

// S6-F7: PRODUCT §15.1 requires explicit confirm before unpublish.
// Follows the same confirm() pattern as DeleteArticleButton (acceptable PMF per S6-F12).

import { unpublishArticleAction } from '@/lib/actions/admin'

export function UnpublishButton({ id }: { id: string }) {
  return (
    <form
      action={unpublishArticleAction}
      onSubmit={(e) => {
        if (!confirm('Unpublish this article? It will be removed from the feed.')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-primary hover:bg-surface-raised transition-colors"
      >
        Unpublish
      </button>
    </form>
  )
}
