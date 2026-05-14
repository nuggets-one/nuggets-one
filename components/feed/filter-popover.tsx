'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import {
  FEED_DIMENSION_KEYS,
  FEED_DIMENSION_LABELS,
  filterTagsVisibleInPicker,
  groupedSortedByCount,
} from '@/lib/feed/group-official-tags'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
  /** Primary CTA when no tag filters in URL (default: More filters). */
  idleTriggerLabel?: string
}

function filterList(list: TagSummary[], needle: string): TagSummary[] {
  if (!needle) return [...list]
  return list.filter(
    (t) =>
      t.label.toLowerCase().includes(needle) || t.slug.toLowerCase().includes(needle)
  )
}

function MegaColumn({
  title,
  list,
  localSelected,
  toggleLocal,
  counts,
}: {
  title: string
  list: TagSummary[]
  localSelected: string[]
  toggleLocal: (slug: string) => void
  counts: TagCounts
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-surface-raised/60 px-3 py-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          {title}
        </h3>
      </div>
      {list.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-relaxed text-muted">No tags in this category.</p>
      ) : (
        <ul className="max-h-[min(48vh,420px)] list-none overflow-y-auto overscroll-y-contain px-1.5 py-2 lg:max-h-[min(52vh,480px)]">
          {list.map((tag) => {
            const checked = localSelected.includes(tag.slug)
            const count = counts[tag.slug] ?? 0
            return (
              <li key={tag.slug}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm leading-snug text-primary transition-colors hover:bg-surface-raised">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLocal(tag.slug)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={checked ? 'font-semibold' : 'font-normal'}>{tag.label}</span>
                    <span className="ml-1 tabular-nums text-xs text-muted">({count})</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * More filters — opens a `<dialog>` with a three-column mega layout (Format /
 * Domain / Subtopic) plus optional Uncategorized row. Staged selection,
 * Apply commits to `tags` nuqs param.
 *
 * Tag rows are exactly `listOfficialTags()` (Supabase `tags` where
 * `is_official = true`), grouped only by `tags.dimension` — nothing is merged
 * in from articles or hardcoded lists. Zero-count tags are hidden unless
 * currently staged so curators can still clear rare selections.
 */
export function FilterPopover({
  tags,
  counts,
  idleTriggerLabel = 'More filters',
}: Props) {
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

  const grouped = useMemo(() => groupedSortedByCount(tags, counts), [tags, counts])

  const groupedFiltered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const afterSearch = {
      format: filterList(grouped.format, needle),
      domain: filterList(grouped.domain, needle),
      subtopic: filterList(grouped.subtopic, needle),
      uncategorized: filterList(grouped.uncategorized, needle),
    }
    return {
      format: filterTagsVisibleInPicker(afterSearch.format, counts, localSelected),
      domain: filterTagsVisibleInPicker(afterSearch.domain, counts, localSelected),
      subtopic: filterTagsVisibleInPicker(afterSearch.subtopic, counts, localSelected),
      uncategorized: filterTagsVisibleInPicker(
        afterSearch.uncategorized,
        counts,
        localSelected
      ),
    }
  }, [grouped, query, counts, localSelected])

  const openDialog = useCallback(() => {
    setLocalSelected(committed)
    setQuery('')
    setOpen(true)
    dialogRef.current?.showModal()
    requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
  }, [committed])

  const closeDialog = useCallback(() => {
    setOpen(false)
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }, [])

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

  const anySectionVisible =
    groupedFiltered.format.length > 0 ||
    groupedFiltered.domain.length > 0 ||
    groupedFiltered.subtopic.length > 0 ||
    groupedFiltered.uncategorized.length > 0

  const activeCount = committed.length
  const triggerLabel =
    activeCount > 0 ? `${idleTriggerLabel} (${activeCount})` : idleTriggerLabel
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
        aria-label="Open filters"
        className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
          activeCount > 0
            ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text shadow-chip-active hover:bg-chip-active-bg'
            : 'border-border bg-surface-raised text-primary shadow-sm hover:bg-surface-raised/80 hover:text-primary'
        }`}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 ${activeCount > 0 ? 'opacity-70' : 'text-primary/80'}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-label="Topic filters"
        className="m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        <div
          className="fixed inset-x-0 bottom-0 flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-border bg-surface text-primary shadow-panel lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(90vh,720px)] lg:w-[min(960px,calc(100vw-2rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl"
          role="document"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold tracking-tight text-primary">
              Filter by topic
              <span className="ml-2 text-xs font-medium text-muted">
                {localSelected.length} selected
              </span>
            </h2>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close filters"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
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

          <div className="shrink-0 border-b border-border px-4 py-3">
            <label className="block">
              <span className="sr-only">Search tags</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all topics…"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/60"
              />
            </label>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!anySectionVisible ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                No tags match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
                  {FEED_DIMENSION_KEYS.map((key) => (
                    <MegaColumn
                      key={key}
                      title={FEED_DIMENSION_LABELS[key]}
                      list={groupedFiltered[key]}
                      localSelected={localSelected}
                      toggleLocal={toggleLocal}
                      counts={counts}
                    />
                  ))}
                </div>
                {groupedFiltered.uncategorized.length > 0 ? (
                  <div className="shrink-0 border-t border-border bg-surface-raised/30 px-3 py-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                      Uncategorized
                    </h3>
                    <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                      {groupedFiltered.uncategorized.map((tag) => {
                        const checked = localSelected.includes(tag.slug)
                        const count = counts[tag.slug] ?? 0
                        return (
                          <li key={tag.slug}>
                            <label
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                checked
                                  ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
                                  : 'border-border bg-surface text-primary hover:bg-surface-raised'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLocal(tag.slug)}
                                className="h-3.5 w-3.5 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                              />
                              <span>{tag.label}</span>
                              <span className="tabular-nums text-muted">({count})</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
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
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLocal}
                disabled={isPending || !dirty}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
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
