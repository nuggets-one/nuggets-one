'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import Link from 'next/link'
import type { ContentStream } from '@/types/article'
import type { SuggestionRow } from '@/lib/queries/article'
import { readResponseJson } from '@/lib/http/parse-json-response'

const DEBOUNCE_MS = 180
const SUGGESTION_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function formatSuggestionDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return SUGGESTION_DATE_FORMATTER.format(date)
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export function HeaderSearch() {
  const router = useRouter()

  const [committedQ, setCommittedQ] = useQueryState('q', {
    defaultValue: '',
    shallow: false,
  })
  const [stream] = useQueryState<ContentStream>('stream', {
    defaultValue: 'standard',
    parse: (v): ContentStream => (v === 'pulse' ? 'pulse' : 'standard'),
    shallow: true,
  })

  const [inputValue, setInputValue] = useState(committedQ)
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([])
  const [suggestionsPending, setSuggestionsPending] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const lastSuggestQueryRef = useRef('')

  const debouncedInput = useDebounce(inputValue, DEBOUNCE_MS)

  const trimmed = debouncedInput.trim()
  const hasActiveSearch = committedQ.trim().length > 0
  /** While typing with q ≥ min length, surface the dropdown (matches product “suggestions UX”). */
  const suggestPanelOpen = isFocused && trimmed.length >= 2

  const collapseMobileSearch = useCallback(() => {
    setIsExpanded(false)
    setIsFocused(false)
    setInputValue(committedQ)
    setSuggestions([])
    setSuggestionsPending(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }, [committedQ])

  useEffect(() => {
    if (!isFocused) {
      setInputValue(committedQ)
    }
  }, [committedQ, isFocused])

  useEffect(() => {
    if (!isExpanded) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [isExpanded])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      if (e.matches) setIsExpanded(false)
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const qTrim = debouncedInput.trim()
    const queryKey = `${stream}:${qTrim.toLowerCase()}`

    if (qTrim.length < 2) {
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = null
      lastSuggestQueryRef.current = ''
      setSuggestionsPending(false)
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    if (queryKey === lastSuggestQueryRef.current) {
      return
    }

    lastSuggestQueryRef.current = queryKey
    suggestAbortRef.current?.abort()
    const controller = new AbortController()
    suggestAbortRef.current = controller
    let cancelled = false
    setSuggestionsPending(true)

    const params = new URLSearchParams({ q: qTrim, stream })
    fetch(`/api/search/suggest?${params}`, { signal: controller.signal })
      .then(async (r) => {
        if (cancelled) return
        if (!r.ok) {
          setSuggestions([])
          setActiveIndex(-1)
          return
        }
        const data = await readResponseJson<{ suggestions?: SuggestionRow[] }>(r)
        if (cancelled || !data) {
          setSuggestions([])
          setActiveIndex(-1)
          return
        }
        setSuggestions(data.suggestions ?? [])
        setActiveIndex(-1)
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setSuggestions([])
          setActiveIndex(-1)
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestionsPending(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [debouncedInput, stream])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
        if (isExpanded) {
          collapseMobileSearch()
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [collapseMobileSearch, isExpanded])

  const commitSearch = useCallback(
    (value: string) => {
      const trimmedValue = value.trim()
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = null
      setCommittedQ(trimmedValue || null)
      setInputValue(trimmedValue)
      setSuggestions([])
      setSuggestionsPending(false)
      setActiveIndex(-1)
      setIsFocused(false)
      setIsExpanded(false)
    },
    [setCommittedQ]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setInputValue(committedQ)
      setIsFocused(false)
      setIsExpanded(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const s = suggestions[activeIndex]
        router.push(`/nuggets/${s.id}/${s.slug}`)
        setIsFocused(false)
        setIsExpanded(false)
      } else {
        commitSearch(inputValue)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestionsPending || suggestions.length === 0) return
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestionsPending || suggestions.length === 0) return
      setActiveIndex((i) => Math.max(i - 1, -1))
      return
    }
  }

  const collapsedSearchLabel = hasActiveSearch
    ? `Search nuggets (active: ${committedQ})`
    : 'Search nuggets'

  return (
    <div ref={containerRef} className="relative w-auto md:w-full">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={collapsedSearchLabel}
          aria-expanded={false}
          className={`relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 md:hidden ${
            hasActiveSearch ? 'ring-2 ring-accent/40' : ''
          }`}
        >
          <SearchIcon className="size-5 shrink-0" />
          {hasActiveSearch ? (
            <span
              className="absolute right-2 top-2 size-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
          ) : null}
        </button>
      ) : null}

      {isExpanded ? (
        <button
          type="button"
          aria-label="Close search"
          className="fixed inset-0 z-[45] bg-black/20 motion-reduce:transition-none md:hidden"
          onClick={collapseMobileSearch}
        />
      ) : null}

      <div
        className={`relative w-full ${
          isExpanded
            ? 'fixed left-4 right-4 top-[calc(var(--header-height)+0.25rem)] z-[60] mx-0 max-w-none md:static md:z-auto md:mx-auto md:max-w-md lg:max-w-lg'
            : 'hidden md:block'
        }`}
      >
        <div className="flex h-9 items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 transition-shadow focus-within:ring-2 focus-within:ring-accent/40 motion-reduce:transition-none">
          <SearchIcon className="size-4 shrink-0 text-muted" />

          <input
            ref={inputRef}
            type="search"
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value
              setInputValue(next)
              if (next.trim().length < 2) {
                setSuggestions([])
                setSuggestionsPending(false)
                setActiveIndex(-1)
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder="Search nuggets…"
            aria-label="Search nuggets"
            aria-autocomplete="list"
            aria-expanded={suggestPanelOpen}
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            className="min-w-0 h-full flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none"
          />

          {inputValue ? (
            <button
              type="button"
              onClick={() => {
                suggestAbortRef.current?.abort()
                suggestAbortRef.current = null
                setInputValue('')
                setCommittedQ(null)
                setSuggestions([])
                setSuggestionsPending(false)
                setIsFocused(false)
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
              className="flex min-h-[44px] shrink-0 items-center rounded-md px-1 text-muted transition-colors hover:text-primary active:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
            >
              <svg
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {suggestPanelOpen ? (
          <ul
            role="listbox"
            aria-label="Search suggestions"
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-panel"
          >
            {suggestionsPending ? (
              <li className="px-4 py-3 text-sm text-muted">Searching…</li>
            ) : null}
            {!suggestionsPending && trimmed.length >= 2 && suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">
                No suggestions. Press Enter to run a full-page search.
              </li>
            ) : null}
            {!suggestionsPending &&
              trimmed.length >= 2 &&
              suggestions.map((s, i) => {
                const streamLabel = s.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
                const publishedAtLabel = formatSuggestionDate(s.published_at)
                return (
                  <li
                    key={s.id}
                    id={`suggestion-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                  >
                    <Link
                      href={`/nuggets/${s.id}/${s.slug}`}
                      onClick={() => {
                        setIsFocused(false)
                        setIsExpanded(false)
                      }}
                      className={`flex min-h-[44px] flex-col justify-center gap-0.5 px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
                        i === activeIndex
                          ? 'bg-surface-raised text-primary'
                          : 'text-primary hover:bg-surface-raised'
                      }`}
                    >
                      <span className="line-clamp-2 font-medium leading-snug">{s.title}</span>
                      <span className="text-xs text-muted">
                        {streamLabel}
                        {publishedAtLabel ? ` · ${publishedAtLabel}` : ''}
                      </span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
