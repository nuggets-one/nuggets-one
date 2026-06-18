'use client'

// S6-F7: PRODUCT §15.1 requires explicit confirm before unpublish.
// Follows the same confirm() pattern as DeleteArticleButton (acceptable PMF per S6-F12).

import { unpublishArticleAction } from '@/lib/actions/admin'
import { AdminSubmitButton } from './admin-submit-button'

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
      <AdminSubmitButton
        label="Unpublish"
        pendingLabel="Unpublishing…"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary disabled:opacity-60"
      />
    </form>
  )
}
