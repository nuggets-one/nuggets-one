import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createTagAction } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

export default async function AdminTagsPage() {
  const db = createAdminClient()

  const { data: tags } = await db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .order('label', { ascending: true })

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-primary mb-6">Tags</h1>

      <form
        action={createTagAction}
        className="flex flex-col gap-3 mb-8 p-4 rounded-xl border border-border bg-surface-raised"
      >
        <h2 className="text-sm font-semibold text-primary">New tag</h2>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Label *</span>
          <input
            type="text"
            name="label"
            required
            placeholder="Fintech"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Dimension</span>
          <select
            name="dimension"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">None</option>
            <option value="domain">Domain</option>
            <option value="format">Format</option>
            <option value="subtopic">Subtopic</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
          <input type="checkbox" name="is_official" className="rounded" />
          Show on Home chip rail (official)
        </label>

        <button
          type="submit"
          className="self-start px-4 py-2 rounded-lg bg-accent text-black text-sm font-medium hover:opacity-90"
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(tags ?? []).map((tag) => (
              <tr key={tag.id as string} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 font-medium text-primary">{tag.label as string}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{tag.slug as string}</td>
                <td className="px-4 py-3 text-muted">{(tag.dimension as string | null) ?? '—'}</td>
                <td className="px-4 py-3">
                  {tag.is_official && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent">
                      ✓ Official
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
