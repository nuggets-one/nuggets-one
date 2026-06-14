import 'server-only'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTagAction } from '@/lib/actions/admin'
import { TagFormFields } from '@/app/admin/tags/_components/TagFormFields'
import { StatusBlock } from '@/components/ui/status-block'

export const dynamic = 'force-dynamic'

const TAG_ERRORS: Record<string, string> = {
  missing_label: 'Label is required.',
  invalid_slug: 'Could not derive a valid slug from that label. Use letters or numbers.',
  invalid_dimension: 'That dimension is not supported.',
  duplicate_slug:
    'A tag with this slug already exists. Edit the existing tag instead of creating a duplicate.',
  dimension_not_supported:
    'The database does not accept the Source dimension yet. Apply migration 20240001000027_tag_dimension_source.sql, then retry.',
  save_failed: 'Could not save the tag. Please try again.',
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminTagsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error
  const db = createAdminClient()

  const { data: tags, error } = await db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .order('label', { ascending: true })

  if (error) {
    return (
      <StatusBlock
        heading="Could not load tags"
        body={error.message}
        linkHref="/admin/tags"
        linkLabel="Retry"
      />
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-primary mb-2">Tags</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Tags power Home filters and nugget classification. Each tag has one optional dimension:{' '}
        <strong className="font-medium text-primary">Format</strong>,{' '}
        <strong className="font-medium text-primary">Domain</strong>,{' '}
        <strong className="font-medium text-primary">Subtopic</strong>, or{' '}
        <strong className="font-medium text-primary">Source</strong>. Official tags with a dimension
        appear on the Home chip rail and in the article editor. Chart providers (Bloomberg, Goldman
        Sachs, JPMorgan) are already seeded under Source — edit those rows instead of recreating them.
      </p>

      {errorCode ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg"
        >
          {TAG_ERRORS[errorCode] ?? 'Something went wrong. Please try again.'}
        </div>
      ) : null}

      <form
        action={createTagAction}
        className="flex flex-col gap-3 mb-8 p-4 rounded-xl border border-border bg-surface-raised"
      >
        <h2 className="text-sm font-semibold text-primary">New tag</h2>
        <TagFormFields />
        <button
          type="submit"
          className="self-start px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Create tag
        </button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Label</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Dimension</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Official</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(tags ?? []).map((tag) => (
              <tr key={tag.id as string} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 font-medium text-primary">
                  <Link href={`/admin/tags/${tag.id as string}`} className="hover:underline">
                    {tag.label as string}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{tag.slug as string}</td>
                <td className="px-4 py-3 text-muted">{(tag.dimension as string | null) ?? '—'}</td>
                <td className="px-4 py-3">
                  {tag.is_official && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-emphasis">
                      ✓ Official
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/tags/${tag.id as string}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
