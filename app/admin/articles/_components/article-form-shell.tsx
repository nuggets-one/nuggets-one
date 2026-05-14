import Link from 'next/link'

type ArticleFormShellProps = {
  title: string
  description?: string
  statusLabel?: string
  statusTone?: 'draft' | 'published'
  errorMessage?: string
  /** Non-blocking warning after publish (e.g. notification fan-out). */
  warningMessage?: string
  /** Informational banner (e.g. large recipient queue). */
  noticeMessage?: string
  liveHref?: string
  children: React.ReactNode
}

export function ArticleFormShell({
  title,
  description,
  statusLabel,
  statusTone = 'draft',
  errorMessage,
  warningMessage,
  noticeMessage,
  liveHref,
  children,
}: ArticleFormShellProps) {
  const statusClass =
    statusTone === 'published'
      ? 'border-success-border bg-success-soft text-success-fg'
      : 'border-border bg-surface-raised text-muted'

  return (
    <section className="w-full">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/articles"
            className="mb-3 inline-flex text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Back to articles
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {statusLabel && (
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
              {statusLabel}
            </span>
          )}

          {liveHref && (
            <Link
              href={liveHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-primary"
            >
              View live
            </Link>
          )}
        </div>
      </header>

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {errorMessage}
        </div>
      )}

      {warningMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-primary"
        >
          {warningMessage}
        </div>
      )}

      {noticeMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-muted"
        >
          {noticeMessage}
        </div>
      )}

      {children}
    </section>
  )
}
