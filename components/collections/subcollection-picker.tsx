'use client'

import { useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, X } from 'lucide-react'

type SubcollectionOption = {
  id: string
  title: string
  entry_count: number
}

type Props = {
  parentTitle: string
  options: SubcollectionOption[]
  selectedSubId: string | null
}

function toParams(searchParams: URLSearchParams): URLSearchParams {
  return new URLSearchParams(searchParams.toString())
}

function sectionKeyForTitle(title: string): string {
  const first = title.trim().charAt(0).toUpperCase()
  if (!first) return '#'
  return /[A-Z]/.test(first) ? first : '#'
}

export function SubcollectionPicker({ parentTitle, options, selectedSubId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const quickOptions = options.slice(0, 10)
  const selectedSub = options.find((item) => item.id === selectedSubId) ?? null

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((item) => item.title.toLowerCase().includes(needle))
  }, [options, query])

  const groupedOptions = useMemo(() => {
    const map = new Map<string, SubcollectionOption[]>()
    for (const option of filteredOptions) {
      const key = sectionKeyForTitle(option.title)
      const list = map.get(key) ?? []
      list.push(option)
      map.set(key, list)
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === '#') return 1
        if (b === '#') return -1
        return a.localeCompare(b)
      })
      .map(([letter, list]) => ({
        letter,
        options: list.sort((a, b) => a.title.localeCompare(b.title)),
      }))
  }, [filteredOptions])

  function navigateWithSub(nextSubId: string | null) {
    const next = toParams(searchParams)
    if (nextSubId) next.set('sub', nextSubId)
    else next.delete('sub')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function openDialog() {
    setQuery('')
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  function jumpTo(letter: string) {
    const container = scrollRef.current
    if (!container) return
    const target = container.querySelector<HTMLElement>(`[data-letter="${letter}"]`)
    if (!target) return
    container.scrollTo({
      top: target.offsetTop - 8,
      behavior: 'smooth',
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => navigateWithSub(null)}
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
            !selectedSub
              ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
              : 'border-border bg-surface-raised text-primary hover:bg-surface'
          }`}
        >
          All in {parentTitle}
        </button>

        {quickOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => navigateWithSub(option.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
              selectedSub?.id === option.id
                ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
                : 'border-border bg-surface-raised text-primary hover:bg-surface'
            }`}
          >
            <span>{option.title}</span>
            <span className="tabular-nums text-[11px] opacity-75">({option.entry_count})</span>
          </button>
        ))}

        {options.length > quickOptions.length && (
          <button
            type="button"
            onClick={openDialog}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-primary hover:bg-surface"
          >
            All sub-collections
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog()
        }}
        className="m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        <div className="fixed inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border border-border bg-surface p-4 shadow-panel md:inset-auto md:left-1/2 md:top-1/2 md:w-[min(920px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-primary">
              Sub-collections in {parentTitle}
            </h3>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-full border border-border p-2 text-muted hover:bg-surface-raised"
              aria-label="Close sub-collections picker"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="mb-3 block">
            <span className="sr-only">Search sub-collections</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sub-collections"
              className="h-9 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/60"
            />
          </label>

          {groupedOptions.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {groupedOptions.map((section) => (
                <button
                  key={section.letter}
                  type="button"
                  onClick={() => jumpTo(section.letter)}
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface-raised px-1.5 text-[11px] font-medium text-muted hover:text-primary"
                >
                  {section.letter}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="max-h-[58vh] overflow-y-auto pr-1">
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  navigateWithSub(null)
                  closeDialog()
                }}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                  !selectedSub
                    ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
                    : 'border-border bg-surface-raised text-primary hover:bg-surface'
                }`}
              >
                All in {parentTitle}
              </button>
            </div>

            <div className="space-y-3">
              {groupedOptions.map((section) => (
                <section key={section.letter} data-letter={section.letter}>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {section.letter}
                  </h4>
                  <ul className="flex flex-wrap gap-1.5">
                    {section.options.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => {
                            navigateWithSub(option.id)
                            closeDialog()
                          }}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            selectedSub?.id === option.id
                              ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
                              : 'border-border bg-surface-raised text-primary hover:bg-surface'
                          }`}
                        >
                          <span>{option.title}</span>
                          <span className="tabular-nums text-[11px] opacity-75">({option.entry_count})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  )
}
