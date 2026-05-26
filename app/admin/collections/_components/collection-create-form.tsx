'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import {
  createCollectionFormStateAction,
  type CollectionActionResult,
} from '@/lib/actions/collections'
import { CollectionFormFields } from '@/app/admin/collections/_components/CollectionFormFields'

type RootTopic = { id: string; title: string }

export function CollectionCreateForm({
  errorMessage,
  rootTopics,
}: {
  errorMessage?: string
  rootTopics: RootTopic[]
}) {
  const [state, formAction, isPending] = useActionState(
    createCollectionFormStateAction,
    null as CollectionActionResult | null
  )

  const err = state?.ok === false ? state.error : errorMessage

  return (
    <form action={formAction} className="space-y-6">
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

      {err && (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {err}
        </div>
      )}

      <CollectionFormFields rootTopics={rootTopics} />

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create collection'}
      </button>
    </form>
  )
}
