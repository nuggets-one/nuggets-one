'use client'

import { AdminSubmitButton } from '@/app/admin/articles/_components/admin-submit-button'
import { TagFormFields } from '@/app/admin/tags/_components/TagFormFields'
import { updateTagAction } from '@/lib/actions/admin'
import type { TagAdminDetail } from '@/lib/queries/tags-admin'

type Props = {
  tag: TagAdminDetail
}

export function TagEditForm({ tag }: Props) {
  return (
    <form action={updateTagAction} className="space-y-4">
      <input type="hidden" name="id" value={tag.id} />
      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <TagFormFields tag={tag} />
      </div>
      <AdminSubmitButton
        label="Save tag"
        pendingLabel="Saving…"
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
      />
    </form>
  )
}
