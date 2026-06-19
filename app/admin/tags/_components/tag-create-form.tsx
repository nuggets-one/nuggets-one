'use client'

import Link from 'next/link'
import { AdminSubmitButton } from '@/app/admin/articles/_components/admin-submit-button'
import { TagErrorAlert } from '@/app/admin/tags/_components/tag-alerts'
import { TagFormFields } from '@/app/admin/tags/_components/TagFormFields'
import { createTagAction } from '@/lib/actions/admin'

type Props = {
  errorMessage?: string | null
}

export function TagCreateForm({ errorMessage }: Props) {
  return (
    <form action={createTagAction} className="max-w-2xl space-y-6">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/tags"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to tags
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">New tag</h1>
        <p className="mt-1 text-sm text-muted">
          Slug is generated automatically from the label when you create the tag.
        </p>
      </div>

      {errorMessage ? <TagErrorAlert message={errorMessage} /> : null}

      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <TagFormFields />
      </div>

      <AdminSubmitButton
        label="Create tag"
        pendingLabel="Creating…"
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
      />
    </form>
  )
}
