'use client'

import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createCollectionFromFormAction } from '@/lib/actions/collections'
import { CollectionFormFields } from '@/app/admin/collections/_components/CollectionFormFields'

type RootTopic = { id: string; title: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
    >
      {pending ? 'Creating…' : 'Create collection'}
    </button>
  )
}

export function CollectionCreateForm({
  errorMessage,
  rootTopics,
}: {
  errorMessage?: string
  rootTopics: RootTopic[]
}) {
  return (
    <form action={createCollectionFromFormAction} className="space-y-6">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/collections"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to collections
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">New collection</h1>
        <p className="mt-1 text-sm text-muted">
          Save metadata first, then add nuggets on the edit page.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {errorMessage}
        </div>
      )}

      <CollectionFormFields rootTopics={rootTopics} />

      <SubmitButton />
    </form>
  )
}
