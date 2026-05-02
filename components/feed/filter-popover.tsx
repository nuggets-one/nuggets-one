'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
}

/**
 * FilterPopover — end-of-rail "More (N)" trigger plus a `<dialog>` that lists
 * every official tag with its published-article count. Selection is staged
 * locally and committed to the `tags` nuqs param on Apply (Cancel discards).
 *
 * Mobile (`<lg`): bottom sheet via overrides on the dialog defaults.
 * Desktop (`lg+`): centered modal panel — deviates from "anchored popover" to
 * avoid the still-uneven anchor-positioning matrix; centered preserves the
 * spec's intent (flat list, search, Apply/Clear, focus trap) without a portal
 * library or per-browser fallback.
 *
 * Focus trap + Escape close are handled by the native dialog `showModal()`
 * top-layer behaviour. Backdrop click is detected by comparing the click
 * target against the dialog node itself.
 */
export function FilterPopover({ tags, counts }: Props) {
  const [tagsRaw, setTagsParam] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const committed = useMemo(
    () => (tagsRaw ? tagsRaw.split(',').filter(Boolean) : []),
    [tagsRaw]
  )

  const [open, setOpen] = useState(false)
  const [localSelected, setLocalSelected] = useState<string[]>(committed)
  const [query, setQuery] = useState('')

  // Sync local selection from the URL whenever the popover opens, so re-opens
  // reflect any out-of-band changes (e.g. chip rail toggles, Active filters
  // bar removals).
  useEffect(() => {
    if (open) {
      setLocalSelected(committed)
      setQuery('')
      requestAnimationFrame(() => {
        searchRef.current?.focus()
      })
    }
  }, [open, committed])

  const openDialog = useCallback(() => {
    setOpen(true)
    dialogRef.current?.showModal()
  }, [])

  const closeDialog = useCallback(() => {
    setOpen(false)
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }, [])

  // Native dialog `Escape` fires the `cancel` event and then `close`.
  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    const handleClose = () => setOpen(false)
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [])

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      closeDialog()
    }
  }

  function toggleLocal(slug: string) {
    setLocalSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  function clearLocal() {
    setLocalSelected([])
  }

  function applyLocal() {
    startTransition(() => {
      setTagsParam(localSelected.length ? localSelected.join(',') : null)
      closeDialog()
    })
  }

  const visibleTags = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tags
    return tags.filter(
      (t) =>
        t.label.toLowerCase().includes(needle) ||
        t.slug.toLowerCase().includes(needle)
    )
  }, [tags, query])

  const triggerLabel = `More (${tags.length})`
  const dirty =
    localSelected.length !== committed.length ||
    localSelected.some((s) => !committed.includes(s))

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="shrink-0 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 md:min-h-10"
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-label="All filters"
        className="m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div
          className="fixed inset-x-0 bottom-0 flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-border bg-surface text-primary shadow-2xl lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[80vh] lg:w-[min(480px,calc(100vw-2rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl"
          role="document"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-primary">Filter by topic</h2>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close filters"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="border-b border-border px-4 py-3">
            <label className="block">
              <span className="sr-only">Search tags</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tags…"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/60"
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {visibleTags.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No tags match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul className="flex flex-col">
                {visibleTags.map((tag) => {
                  const checked = localSelected.includes(tag.slug)
                  const count = counts[tag.slug] ?? 0
                  return (
                    <li key={tag.slug}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-raised">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLocal(tag.slug)}
                          className="h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                        />
                        <span className="flex-1 text-sm text-primary">{tag.label}</span>
                        <span className="text-xs text-muted">{count}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={clearLocal}
              disabled={isPending || localSelected.length === 0}
              className="text-sm font-medium text-muted underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLocal}
                disabled={isPending || !dirty}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-black transition-opacity hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}
