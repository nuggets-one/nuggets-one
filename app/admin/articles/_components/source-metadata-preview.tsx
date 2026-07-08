import type { SourceMetadata } from '@/lib/admin/source-metadata-types'
import { AdminCardImagePreview } from './admin-card-image-preview'

export function SourceMetadataPreview({
  metadata,
  onApply,
  onReplaceAll,
  applyEmptyOnly,
}: {
  metadata: SourceMetadata
  onApply: () => void
  onReplaceAll: () => void
  applyEmptyOnly: boolean
}) {
  const description =
    metadata.provider === 'youtube' && metadata.author
      ? `Channel: ${metadata.author}`
      : metadata.description

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-3">
      <div className="flex flex-col gap-3 max-sm:items-stretch sm:flex-row sm:flex-wrap sm:items-start">
        {metadata.imageUrl ? (
          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
            <AdminCardImagePreview url={metadata.imageUrl} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Fetched preview · {providerLabel(metadata.provider)}
          </p>
          {metadata.title ? (
            <p className="text-sm font-semibold text-primary">{metadata.title}</p>
          ) : (
            <p className="text-sm text-muted">No title found — add one manually.</p>
          )}
          {description ? (
            <p className="line-clamp-2 text-xs text-muted">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 max-sm:w-full">
          <button
            type="button"
            onClick={onApply}
            className="min-h-11 flex-1 rounded-lg border border-accent bg-chip-active-bg px-3 py-1.5 text-xs font-semibold text-chip-active-text transition hover:opacity-90 sm:flex-none"
          >
            {applyEmptyOnly ? 'Apply to empty fields' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={onReplaceAll}
            className="min-h-11 flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-primary sm:flex-none"
          >
            Replace all
          </button>
        </div>
      </div>
    </div>
  )
}

function providerLabel(provider: SourceMetadata['provider']): string {
  if (provider === 'youtube') return 'YouTube'
  if (provider === 'image') return 'Image URL'
  return 'Web page'
}
