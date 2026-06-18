'use client'

import { publishArticleAction } from '@/lib/actions/admin'
import { AdminSubmitButton } from './admin-submit-button'

export function PublishArticleControls({ id }: { id: string }) {
  return (
    <form action={publishArticleAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="push_notify_immediately"
          className="size-4 rounded border-border"
        />
        Send push immediately (skip digest)
      </label>
      <AdminSubmitButton
        label="Publish Nugget"
        pendingLabel="Publishing…"
        className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-inverse transition-colors hover:bg-success-hover disabled:opacity-60"
      />
    </form>
  )
}
