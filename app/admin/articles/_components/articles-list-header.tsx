import Link from 'next/link'

export function ArticlesListHeader() {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Articles</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Manage nuggets across streams. Only{' '}
          <strong className="font-medium text-primary">published</strong> nuggets can be added to
          community collections.
        </p>
      </div>
      <Link
        href="/admin/articles/new"
        className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        Create nugget
      </Link>
    </div>
  )
}
