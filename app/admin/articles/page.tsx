import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminArticlesPage() {
  const db = createAdminClient()

  const { data: articles } = await db
    .from('articles')
    .select('id, slug, title, status, content_stream, published_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New article
        </Link>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Stream</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Published</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(articles ?? []).map((a) => (
              <tr key={a.id as string} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 font-medium text-primary max-w-xs truncate">
                  {a.title as string}
                </td>
                <td className="px-4 py-3 text-muted">
                  {a.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === 'published'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {a.status as string}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted text-xs">
                  {a.published_at
                    ? new Date(a.published_at as string).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/articles/${a.id as string}`}
                    className="text-sm text-primary underline underline-offset-2"
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
