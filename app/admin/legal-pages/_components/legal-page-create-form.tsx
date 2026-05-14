'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  createLegalPageFormStateAction,
  type LegalPageActionResult,
} from '@/lib/actions/legal-pages'
import { LegalMarkdownPreview } from '@/components/admin/legal-markdown-preview'

export function LegalPageCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createLegalPageFormStateAction,
    null as LegalPageActionResult | null
  )
  const [body, setBody] = useState('')

  return (
    <form action={formAction} className="space-y-6">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/legal-pages"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to legal pages
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">New legal page</h1>
        <p className="mt-1 text-sm text-muted">Slug becomes the URL path: /legal/your-slug</p>
      </div>

      {state?.ok === false && (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-primary">Slug</span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, hyphens only"
            placeholder="e.g. cookie-policy"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-primary">Nav label</span>
          <input
            name="label"
            type="text"
            required
            placeholder="Short link label"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-primary">Page title (H1)</span>
        <input
          name="page_title"
          type="text"
          required
          placeholder="Full document title"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
      </label>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="inline-flex items-center gap-2 font-medium text-primary">
          <input type="checkbox" name="is_enabled" defaultChecked className="rounded border-border" />
          Enabled (public page)
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-primary">
          <input type="checkbox" name="show_in_footer" defaultChecked className="rounded border-border" />
          Show in footer
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-primary">
          <input type="checkbox" name="show_in_account_menu" defaultChecked className="rounded border-border" />
          Show in account menu
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-primary">
          <input type="checkbox" name="robots_index" defaultChecked className="rounded border-border" />
          Allow search indexing
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <span className="text-sm font-medium text-primary">Markdown</span>
          <textarea
            name="body_markdown"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={28}
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm text-primary"
            spellCheck={false}
          />
        </div>
        <div>
          <span className="text-sm font-medium text-primary">Preview</span>
          <div className="mt-1">
            <LegalMarkdownPreview markdown={body} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <Link
          href="/admin/legal-pages"
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create page'}
        </button>
      </div>
    </form>
  )
}
