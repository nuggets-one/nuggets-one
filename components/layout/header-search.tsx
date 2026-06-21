'use client'

import { useEffect, useRef, useState, useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { ContentStream } from '@/types/article'
import { getStreamLabel, parseContentStream } from '@/lib/copy/streams'
import {
  effectiveFeedScope,
  isScopeEnabledStream,
  parseFeedScope,
} from '@/lib/feed/scope'
import type { SuggestionRow } from '@/lib/queries/article'
import { readResponseJson } from '@/lib/http/parse-json-response'
import { useMobileSearchControls } from '@/components/layout/mobile-search-context'
import { useFeedPendingOptional } from '@/components/feed/feed-pending-context'
import { useScrollLock } from '@/lib/ui/use-scroll-lock'

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

type SearchFieldProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  inputValue: string
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus: () => void
  suggestPanelOpen: boolean
  activeIndex: number
  onClear: () => void
  showCloseButton?: boolean
  onClose?: () => void
  suggestionsListId: string
}

function SearchField({
  inputRef,
  inputValue,
  onInputChange,
  onKeyDown,
  onFocus,
  suggestPanelOpen,
  activeIndex,
  onClear,
  showCloseButton,
  onClose,
  suggestionsListId,
}: SearchFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {showCloseButton ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
        >
          <X className="size-5 shrink-0" aria-hidden="true" />
        </button>
      ) : null}

      <div className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 transition-shadow focus-within:ring-2 focus-within:ring-accent/40 motion-reduce:transition-none">
        <SearchIcon className="size-4 shrink-0 text-muted" />

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder="Search nuggets…"
          aria-label="Search nuggets"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={suggestPanelOpen}
          aria-controls={suggestPanelOpen ? suggestionsListId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          className="min-w-0 h-full flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none"
        />

        {inputValue ? (
          <button
            type="button"
            onClick={onClear}
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
    </div>
  )
}

type SuggestionsListProps = {
  listId: string
  suggestPanelOpen: boolean
  suggestionsPending: boolean
  trimmed: string
  suggestions: SuggestionRow[]
  activeIndex: number
  onSuggestionNavigate: () => void
  className?: string
}

function SuggestionsList({
  listId,
  suggestPanelOpen,
  suggestionsPending,
  trimmed,
  suggestions,
  activeIndex,
  onSuggestionNavigate,
  className = 'absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-panel',
}: SuggestionsListProps) {
  if (!suggestPanelOpen) return null

  return (
    <ul id={listId} role="listbox" aria-label="Search suggestions" className={className}>
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
          const streamLabel = getStreamLabel(parseContentStream(s.content_stream))
          const publishedAtLabel = formatSuggestionDate(s.published_at)
          return (
            <li key={s.id} id={`suggestion-${i}`} role="option" aria-selected={i === activeIndex}>
              <Link
                href={`/nuggets/${s.id}/${s.slug}`}
                onClick={onSuggestionNavigate}
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
  )
}

type Props = {
  utilities: ReactNode
}

const SEARCH_SUGGESTIONS_LIST_ID = 'header-search-suggestions'

export function HeaderSearch({ utilities }: Props) {
  const router = useRouter()
  const { setExpanded: setMobileSearchExpanded } = useMobileSearchControls()
  const feedPending = useFeedPendingOptional()

  const [committedQ, setCommittedQ] = useQueryState('q', {
    defaultValue: '',
    shallow: false,
  })
  const [stream] = useQueryState<ContentStream>('stream', {
    defaultValue: 'standard',
    parse: (v): ContentStream => parseContentStream(v),
    shallow: true,
  })
  const [scopeRaw] = useQueryState('scope', {
    defaultValue: '',
    shallow: true,
  })
  const feedScope = isScopeEnabledStream(stream)
    ? effectiveFeedScope(stream, parseFeedScope(scopeRaw || null))
    : undefined

  const [draftValue, setDraftValue] = useState(committedQ)
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([])
  const [suggestionsPending, setSuggestionsPending] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const portalReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const desktopContainerRef = useRef<HTMLDivElement>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const lastSuggestQueryRef = useRef('')

  const debouncedInput = useDebounce(draftValue, DEBOUNCE_MS)

  const trimmed = debouncedInput.trim()
  const hasActiveSearch = committedQ.trim().length > 0
  const suggestPanelOpen = isFocused && trimmed.length >= 2
  const inputValue = isFocused ? draftValue : committedQ

  useScrollLock(isExpanded)

  const collapseMobileSearch = useCallback(() => {
    setIsExpanded(false)
    setIsFocused(false)
    setDraftValue(committedQ)
    setSuggestions([])
    setSuggestionsPending(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }, [committedQ])

  const expandMobileSearch = useCallback(() => {
    setIsExpanded(true)
  }, [])

  useEffect(() => {
    setMobileSearchExpanded(isExpanded)
    return () => setMobileSearchExpanded(false)
  }, [isExpanded, setMobileSearchExpanded])

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
    const queryKey = `${stream}:${feedScope ?? 'none'}:${qTrim.toLowerCase()}`

    if (qTrim.length < 2) {
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = null
      lastSuggestQueryRef.current = ''
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
    if (feedScope === 'india') params.set('scope', 'india')
    if (feedScope === 'charts') params.set('scope', 'charts')
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
  }, [debouncedInput, stream, feedScope])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isExpanded) return
      if (desktopContainerRef.current && !desktopContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isExpanded])

  const commitSearch = useCallback(
    (value: string) => {
      const trimmedValue = value.trim()
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = null
      const applyCommit = () => {
        setCommittedQ(trimmedValue || null)
      }
      if (feedPending) {
        feedPending.beginFeedTransition(applyCommit)
      } else {
        applyCommit()
      }
      setDraftValue(trimmedValue)
      setSuggestions([])
      setSuggestionsPending(false)
      setActiveIndex(-1)
      setIsFocused(false)
      setIsExpanded(false)
    },
    [feedPending, setCommittedQ]
  )

  const handleInputChange = useCallback((next: string) => {
    setDraftValue(next)
    if (next.trim().length < 2) {
      setSuggestions([])
      setSuggestionsPending(false)
      setActiveIndex(-1)
    }
  }, [])

  const handleClearInput = useCallback(() => {
    suggestAbortRef.current?.abort()
    suggestAbortRef.current = null
    const applyClear = () => {
      setCommittedQ(null)
    }
    if (feedPending) {
      feedPending.beginFeedTransition(applyClear)
    } else {
      applyClear()
    }
    setDraftValue('')
    setSuggestions([])
    setSuggestionsPending(false)
    setIsFocused(true)
    inputRef.current?.focus()
  }, [feedPending, setCommittedQ])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setDraftValue(committedQ)
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

  const searchFieldProps: SearchFieldProps = {
    inputRef,
    inputValue,
    onInputChange: handleInputChange,
    onKeyDown: handleKeyDown,
    onFocus: () => {
      setDraftValue(committedQ)
      setIsFocused(true)
    },
    suggestPanelOpen,
    activeIndex,
    onClear: handleClearInput,
    suggestionsListId: SEARCH_SUGGESTIONS_LIST_ID,
  }

  const suggestionsProps: SuggestionsListProps = {
    listId: SEARCH_SUGGESTIONS_LIST_ID,
    suggestPanelOpen,
    suggestionsPending,
    trimmed,
    suggestions,
    activeIndex,
    onSuggestionNavigate: () => {
      setIsFocused(false)
      setIsExpanded(false)
    },
  }

  const mobileOverlay =
    isExpanded && portalReady
      ? createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col overscroll-none md:hidden">
            <button
              type="button"
              aria-label="Close search"
              className="absolute inset-0 z-[71] bg-scrim motion-reduce:transition-none"
              onClick={collapseMobileSearch}
            />

            <div
              role="search"
              className="relative z-[72] shrink-0 border-b border-border bg-header px-4 py-2 shadow-sm"
            >
              <SearchField
                {...searchFieldProps}
                showCloseButton
                onClose={collapseMobileSearch}
              />

              <SuggestionsList
                {...suggestionsProps}
                className="mt-2 max-h-[min(50dvh,calc(100dvh-var(--header-height)-6rem))] overflow-y-auto overscroll-y-contain rounded-lg border border-border bg-surface shadow-panel [-webkit-overflow-scrolling:touch]"
              />
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        ref={desktopContainerRef}
        className="relative hidden min-w-0 md:col-start-2 md:flex md:justify-center md:px-4 lg:px-6"
      >
        <div className="relative w-full max-w-md lg:max-w-lg">
          <SearchField {...searchFieldProps} />
          <SuggestionsList {...suggestionsProps} />
        </div>
      </div>

      <div
        className={`col-start-2 flex shrink-0 items-center gap-1.5 sm:gap-2 md:col-start-3 ${
          isExpanded ? 'max-md:hidden' : ''
        }`}
      >
        {!isExpanded ? (
          <button
            type="button"
            onClick={expandMobileSearch}
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
        {utilities}
      </div>

      {mobileOverlay}
    </>
  )
}
