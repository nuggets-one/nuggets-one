import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  addCollectionEntryAction,
  removeCollectionEntryAction,
  reorderCollectionEntryAction,
  updateCollectionFromFormAction,
} from '@/lib/actions/collections'
import {
  getCollectionAdminById,
  listRootCollectionsAdmin,
  searchPublishedArticlesForPicker,
} from '@/lib/queries/collections-admin'
import { CollectionFormFields } from '@/app/admin/collections/_components/CollectionFormFields'
import { DeleteCollectionButton } from '@/app/admin/collections/_components/DeleteCollectionButton'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCollectionEditPage({ params, searchParams }: Props) {
  const { id } = await params
  const resolved = (await searchParams) ?? {}
  const q = typeof resolved.q === 'string' ? resolved.q.trim() : ''
  const error =
    typeof resolved.error === 'string'
      ? resolved.error === 'already_in_collection'
        ? 'That nugget is already in this collection.'
        : resolved.error
      : undefined
  const saved = resolved.saved === '1'

  const [collection, rootTopics] = await Promise.all([
    getCollectionAdminById(id),
    listRootCollectionsAdmin(),
  ])
  if (!collection) notFound()

  const excludeIds = collection.entries.map((e) => e.article_id)
  const searchResults =
    q.length >= 2 ? await searchPublishedArticlesForPicker(q, excludeIds) : []

  return (
    <div className="space-y-10">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/collections"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to collections
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">{collection.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {collection.entry_count} nugget{collection.entry_count === 1 ? '' : 's'} ·{' '}
              <span className="font-medium text-primary">{collection.status}</span>
            </p>
          </div>
          <Link
            href={`/collections/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            View on site →
          </Link>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary">
          Collection saved.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Collection details</h2>
        <form action={updateCollectionFromFormAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <CollectionFormFields
            collection={collection}
            rootTopics={rootTopics}
            selfId={collection.id}
          />
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Save details
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Nuggets in this collection</h2>
        <p className="text-sm text-muted">
          Order controls the public grid on{' '}
          <code className="rounded bg-surface-raised px-1">/collections/{id}</code>. Only{' '}
          <strong className="font-medium text-primary">published</strong> nuggets can be added.
        </p>

        <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Add nugget</h3>

          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="font-medium text-primary">Search by title</span>
              <input
                name="q"
                type="search"
                defaultValue={q}
                minLength={2}
                placeholder="Type at least 2 characters…"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-primary hover:bg-surface"
            >
              Search
            </button>
            {q.length > 0 && (
              <Link
                href={`/admin/collections/${id}`}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-primary"
              >
                Clear
              </Link>
            )}
          </form>

          {q.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-muted">No published nuggets match &quot;{q}&quot;.</p>
          )}

          {searchResults.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
              {searchResults.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{article.title}</p>
                    <p className="text-xs text-muted">
                      {article.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'} ·{' '}
                      <span className="font-mono">{article.id}</span>
                    </p>
                  </div>
                  <form action={addCollectionEntryAction}>
                    <input type="hidden" name="collection_id" value={id} />
                    <input type="hidden" name="article_id" value={article.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                    >
                      Add
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addCollectionEntryAction} className="flex flex-col gap-2 sm:flex-row sm:items-end border-t border-border pt-4">
            <label className="flex-1 text-sm">
              <span className="font-medium text-primary">Or paste article UUID</span>
              <input
                name="article_id"
                type="text"
                required
                pattern="[0-9a-fA-F-]{36}"
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-primary"
              />
            </label>
            <input type="hidden" name="collection_id" value={id} />
            <button
              type="submit"
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-primary hover:bg-surface"
            >
              Add by ID
            </button>
          </form>
        </div>

        {collection.entries.length === 0 ? (
          <p className="text-sm text-muted">No nuggets in this collection yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Stream</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collection.entries.map((entry, index) => (
                  <tr key={entry.article_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/articles/${entry.article_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {entry.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {entry.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <form action={reorderCollectionEntryAction}>
                          <input type="hidden" name="collection_id" value={id} />
                          <input type="hidden" name="article_id" value={entry.article_id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
                          >
                            ↑
                          </button>
                        </form>
                        <form action={reorderCollectionEntryAction}>
                          <input type="hidden" name="collection_id" value={id} />
                          <input type="hidden" name="article_id" value={entry.article_id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === collection.entries.length - 1}
                            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </form>
                        <form action={removeCollectionEntryAction}>
                          <input type="hidden" name="collection_id" value={id} />
                          <input type="hidden" name="article_id" value={entry.article_id} />
                          <button
                            type="submit"
                            className="text-xs text-danger-fg hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-danger-fg mb-3">Danger zone</h2>
        <DeleteCollectionButton id={id} title={collection.title} />
      </section>
    </div>
  )
}
