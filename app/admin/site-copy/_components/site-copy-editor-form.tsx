'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  updateSiteCopyFormStateAction,
  type SiteSettingsActionResult,
} from '@/lib/actions/site-settings'
import type { PushDigestIntervalHours } from '@/lib/queries/site-settings'

export function SiteCopyEditorForm({
  initialDisclaimer,
  initialDigestIntervalHours,
}: {
  initialDisclaimer: string
  initialDigestIntervalHours: PushDigestIntervalHours
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    updateSiteCopyFormStateAction,
    null as SiteSettingsActionResult | null
  )

  useEffect(() => {
    if (state?.ok) {
      router.refresh()
    }
  }, [state, router])

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/articles"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Site copy</h1>
        <p className="mt-1 text-sm text-muted">
          Shown at the end of nugget detail only. Markdown is supported for links, e.g.{' '}
          <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">[Terms](/legal/terms)</code>. Internal
          paths must start with <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">/</code>.
        </p>
      </div>

      {state?.ok === false && (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-fg">
          Saved.
        </div>
      )}

      <label className="block text-sm">
        <span className="font-medium text-primary">Consumer disclaimer</span>
        <textarea
          name="consumer_disclaimer"
          required
          rows={4}
          defaultValue={initialDisclaimer}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
        <span className="mt-1 block text-xs text-muted">Markdown allowed for links and emphasis. Max 4000 characters.</span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-primary">Push digest interval</span>
        <select
          name="push_digest_interval_hours"
          defaultValue={String(initialDigestIntervalHours)}
          className="mt-1 w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        >
          <option value="1">Every 1 hour</option>
          <option value="2">Every 2 hours</option>
          <option value="3">Every 3 hours</option>
        </select>
        <span className="mt-1 block text-xs text-muted">
          Default push mode batches publishes into digest windows per stream. Immediate push bypasses digest when
          enabled on publish.
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
