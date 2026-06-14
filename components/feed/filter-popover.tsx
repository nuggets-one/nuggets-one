'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  useTransition,
} from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import {
  FEED_DIMENSION_KEYS,
  FEED_DIMENSION_LABELS,
  filterTagsVisibleInPicker,
  groupedSortedByCount,
} from '@/lib/feed/group-official-tags'
import { useScrollLock } from '@/lib/ui/use-scroll-lock'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
  /** Primary CTA when no tag filters in URL (default: More filters). */
  idleTriggerLabel?: string
  /** Compact icon+count trigger on mobile, desktop keeps label. */
  triggerVariant?: 'default' | 'iconCount'
}

type GroupKey = (typeof FEED_DIMENSION_KEYS)[number] | 'uncategorized'

type GroupVisibility = Record<GroupKey, boolean>

const DEFAULT_EXPANDED: GroupVisibility = {
  format: true,
  domain: false,
  subtopic: false,
  source: false,
  uncategorized: false,
}

function filterList(list: TagSummary[], needle: string): TagSummary[] {
  if (!needle) return [...list]
  return list.filter(
    (t) =>
      t.label.toLowerCase().includes(needle) || t.slug.toLowerCase().includes(needle)
  )
}

function countSelected(list: TagSummary[], selected: ReadonlySet<string>): number {
  let selectedCount = 0
  for (const item of list) {
    if (selected.has(item.slug)) selectedCount += 1
  }
  return selectedCount
}

function TagCheckboxRow({
  tag,
  checked,
  count,
  onToggle,
}: {
  tag: TagSummary
  checked: boolean
  count: number
  onToggle: (slug: string) => void
}) {
  const id = `feed-filter-${tag.slug}`
  return (
    <li>
      <label
        htmlFor={id}
        className={`group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] leading-tight transition-colors focus-within:bg-surface-raised ${
          checked ? 'bg-surface-raised/70' : 'hover:bg-surface-raised/60'
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(tag.slug)}
          className="h-4 w-4 shrink-0 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
        />
        <span className="min-w-0 flex-1 text-primary">
          <span className={checked ? 'font-medium' : 'font-normal'}>{tag.label}</span>
          <span className="ml-1.5 tabular-nums text-xs text-muted">({count})</span>
        </span>
      </label>
    </li>
  )
}

function FilterAccordionSection({
  groupKey,
  title,
  list,
  counts,
  selectedSet,
  isExpanded,
  onToggleExpanded,
  toggleLocal,
}: {
  groupKey: GroupKey
  title: string
  list: TagSummary[]
  counts: TagCounts
  selectedSet: ReadonlySet<string>
  isExpanded: boolean
  onToggleExpanded: (key: GroupKey) => void
  toggleLocal: (slug: string) => void
}) {
  const selectedCount = useMemo(() => countSelected(list, selectedSet), [list, selectedSet])
  const contentId = `filter-group-${groupKey}`

  return (
    <section className="min-w-0 border-b border-border lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:border-b-0">
      <div className="shrink-0 lg:border-b lg:border-border lg:bg-surface-raised/40">
        <button
          type="button"
          onClick={() => onToggleExpanded(groupKey)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left lg:hidden"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-primary">
            {title}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="tabular-nums">
              {selectedCount}/{list.length}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>
        </button>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          <span className="hidden items-center justify-between px-3 py-2.5 lg:flex">
            <span>{title}</span>
            <span className="tabular-nums text-[11px] font-medium normal-case tracking-normal text-muted">
              {selectedCount}/{list.length}
            </span>
          </span>
        </h3>
      </div>
      <div id={contentId} className={`${isExpanded ? 'block' : 'hidden'} lg:block lg:min-h-0 lg:flex-1`}>
        {list.length === 0 ? (
          <p className="px-4 py-4 text-xs leading-relaxed text-muted">No tags in this category.</p>
        ) : (
          <ul className="list-none px-1.5 py-2">
            {list.map((tag) => (
              <TagCheckboxRow
                key={tag.slug}
                tag={tag}
                checked={selectedSet.has(tag.slug)}
                count={counts[tag.slug] ?? 0}
                onToggle={toggleLocal}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * More filters — opens a `<dialog>` with a four-column mega layout (Format /
 * Domain / Subtopic / Source) plus optional Uncategorized row. Staged selection,
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
  triggerVariant = 'default',
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
  useScrollLock(open)
  const [localSelected, setLocalSelected] = useState<string[]>(committed)
  const [query, setQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<GroupVisibility>(DEFAULT_EXPANDED)

  const grouped = useMemo(() => groupedSortedByCount(tags, counts), [tags, counts])

  const groupedFiltered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const afterSearch = {
      format: filterList(grouped.format, needle),
      domain: filterList(grouped.domain, needle),
      subtopic: filterList(grouped.subtopic, needle),
      source: filterList(grouped.source, needle),
      uncategorized: filterList(grouped.uncategorized, needle),
    }
    return {
      format: filterTagsVisibleInPicker(afterSearch.format, counts, localSelected),
      domain: filterTagsVisibleInPicker(afterSearch.domain, counts, localSelected),
      subtopic: filterTagsVisibleInPicker(afterSearch.subtopic, counts, localSelected),
      source: filterTagsVisibleInPicker(afterSearch.source, counts, localSelected),
      uncategorized: filterTagsVisibleInPicker(
        afterSearch.uncategorized,
        counts,
        localSelected
      ),
    }
  }, [grouped, query, counts, localSelected])

  const selectedSet = useMemo(() => new Set(localSelected), [localSelected])
  const committedSet = useMemo(() => new Set(committed), [committed])
  const slugToLabel = useMemo(
    () => new Map(tags.map((tag) => [tag.slug, tag.label] as const)),
    [tags]
  )
  const searchActive = query.trim().length > 0

  const autoExpanded = useMemo<GroupVisibility>(
    () => ({
      format: groupedFiltered.format.length > 0,
      domain: groupedFiltered.domain.length > 0,
      subtopic: groupedFiltered.subtopic.length > 0,
      source: groupedFiltered.source.length > 0,
      uncategorized: groupedFiltered.uncategorized.length > 0,
    }),
    [groupedFiltered]
  )

  const getIsExpanded = useCallback(
    (key: GroupKey) => (searchActive ? autoExpanded[key] : expandedGroups[key]),
    [autoExpanded, expandedGroups, searchActive]
  )

  const openDialog = useCallback(() => {
    setLocalSelected(committed)
    setQuery('')
    setExpandedGroups(DEFAULT_EXPANDED)
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

  function onBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      closeDialog()
    }
  }

  const toggleLocal = useCallback((slug: string) => {
    setLocalSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }, [])

  const clearLocal = useCallback(() => {
    setLocalSelected([])
  }, [])

  const applyLocal = useCallback(() => {
    startTransition(() => {
      setTagsParam(localSelected.length ? localSelected.join(',') : null)
      closeDialog()
    })
  }, [closeDialog, localSelected, setTagsParam])

  const toggleExpanded = useCallback((key: GroupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const anySectionVisible =
    groupedFiltered.format.length > 0 ||
    groupedFiltered.domain.length > 0 ||
    groupedFiltered.subtopic.length > 0 ||
    groupedFiltered.source.length > 0 ||
    groupedFiltered.uncategorized.length > 0

  const activeCount = committed.length
  const triggerLabel =
    activeCount > 0 ? `${idleTriggerLabel} (${activeCount})` : idleTriggerLabel
  const triggerAriaLabel =
    activeCount > 0 ? `Open filters, ${activeCount} selected` : 'Open filters'
  const compactTrigger = triggerVariant === 'iconCount'
  const dirty =
    selectedSet.size !== committedSet.size ||
    [...selectedSet].some((slug) => !committedSet.has(slug))
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        className={`inline-flex shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
          compactTrigger
            ? 'min-h-[36px] gap-1.5 px-3.5 py-1.5 text-xs font-semibold tracking-[0.01em]'
            : 'min-h-10 gap-1.5 px-3 py-2 text-sm font-medium'
        } ${
          activeCount > 0
            ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text shadow-chip-active hover:bg-chip-active-bg'
            : 'border-border bg-surface-raised text-primary shadow-sm hover:bg-surface-raised/80 hover:text-primary'
        }`}
      >
        {compactTrigger ? (
          <>
            <SlidersHorizontal
              className={`h-3.5 w-3.5 shrink-0 ${activeCount > 0 ? 'opacity-90' : 'text-primary/85'}`}
              strokeWidth={2}
              aria-hidden="true"
            />
            {activeCount > 0 ? (
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent-foreground">
                {activeCount}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span>{triggerLabel}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 ${activeCount > 0 ? 'opacity-70' : 'text-primary/80'}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-label="Topic filters"
        className="m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        <div
          className="fixed inset-x-0 bottom-0 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface text-primary shadow-panel lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(90vh,720px)] lg:w-[min(960px,calc(100vw-2rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl"
          role="document"
        >
          <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm">
            <div className="border-b border-border px-4 pb-2 pt-2">
              <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-border" aria-hidden="true" />
              <div className="flex min-h-11 items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-tight text-primary">Filters</h2>
                  <p className="text-xs text-muted">{localSelected.length} selected</p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  aria-label="Close filters"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {localSelected.length > 0 ? (
              <div className="border-b border-border px-4 py-2" role="status" aria-label="Active filters">
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {localSelected.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleLocal(slug)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-chip-active-border bg-chip-active-bg px-3 text-[13px] font-medium text-chip-active-text transition-colors hover:bg-chip-active-bg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                      aria-label={`Remove ${slugToLabel.get(slug) ?? slug} filter`}
                    >
                      <span>{slugToLabel.get(slug) ?? slug}</span>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-b border-border bg-surface px-4 py-2.5">
            <label className="block">
              <span className="sr-only">Search topics</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics"
                autoComplete="off"
                className="h-11 w-full rounded-full border border-border bg-bg px-4 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/60"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            {!anySectionVisible ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                No tags match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-border lg:grid lg:grid-cols-4 lg:divide-y-0 lg:[&>*:not(:last-child)]:border-r lg:[&>*]:border-border">
                  {FEED_DIMENSION_KEYS.map((key) => (
                    <FilterAccordionSection
                      key={key}
                      groupKey={key}
                      title={FEED_DIMENSION_LABELS[key]}
                      list={groupedFiltered[key]}
                      counts={counts}
                      selectedSet={selectedSet}
                      isExpanded={getIsExpanded(key)}
                      onToggleExpanded={toggleExpanded}
                      toggleLocal={toggleLocal}
                    />
                  ))}
                </div>
                {groupedFiltered.uncategorized.length > 0 ? (
                  <div className="border-t border-border bg-surface-raised/20">
                    <FilterAccordionSection
                      groupKey="uncategorized"
                      title="Uncategorized"
                      list={groupedFiltered.uncategorized}
                      counts={counts}
                      selectedSet={selectedSet}
                      isExpanded={getIsExpanded('uncategorized')}
                      onToggleExpanded={toggleExpanded}
                      toggleLocal={toggleLocal}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-surface/95 px-4 pt-2.5 backdrop-blur-sm"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
          >
            <div className="flex items-center gap-3 lg:justify-between">
              <button
                type="button"
                onClick={clearLocal}
                disabled={isPending || localSelected.length === 0}
                className="min-h-11 shrink-0 rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-raised hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyLocal}
                disabled={isPending || !dirty}
                className="min-h-11 min-w-[7.5rem] flex-1 rounded-full bg-accent px-6 text-[14px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 lg:flex-none"
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
