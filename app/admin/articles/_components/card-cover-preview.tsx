'use client'

import type { CardCoverPreview } from '@/lib/ui/resolve-article-hero'

type Props = {
  preview: CardCoverPreview
}

export function CardCoverPreviewPanel({ preview }: Props) {
  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
      aria-live="polite"
      aria-label="Feed card cover preview"
    >
      <div className="mb-3 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Feed card cover (preview)</p>
        <p className="text-xs text-muted">{preview.summary}</p>
      </div>

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-border-strong bg-bg">
        <div className="relative aspect-video w-full">
          {preview.posterUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.posterUrl} alt="" className="h-full w-full object-cover" />
              {preview.kind === 'youtube' ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30">
                    <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs font-medium text-muted">
              No preview
            </div>
          )}
        </div>
      </div>

    </section>
  )
}
