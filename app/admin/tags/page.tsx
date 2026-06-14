import 'server-only'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTagAction } from '@/lib/actions/admin'
import { TagFormFields } from '@/app/admin/tags/_components/TagFormFields'

export const dynamic = 'force-dynamic'

export default async function AdminTagsPage() {
  const db = createAdminClient()

  const { data: tags } = await db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .order('label', { ascending: true })

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-primary mb-2">Tags</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Tags power Home filters and nugget classification. Each tag has one optional dimension:{' '}
        <strong className="font-medium text-primary">Format</strong>,{' '}
        <strong className="font-medium text-primary">Domain</strong>, or{' '}
        <strong className="font-medium text-primary">Subtopic</strong>, or{' '}
        <strong className="font-medium text-primary">Source</strong>. Official tags with a dimension
        appear on the Home chip rail and in the article editor. Click a row to edit label, dimension,
        official status, or slug.
      </p>

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
