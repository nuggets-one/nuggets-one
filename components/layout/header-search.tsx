'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import Link from 'next/link'
import type { ContentStream } from '@/types/article'
import type { SuggestionRow } from '@/lib/queries/article'

const DEBOUNCE_MS = 180

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
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
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedInput = useDebounce(inputValue, DEBOUNCE_MS)

  const effectiveSuggestions =
    debouncedInput.trim().length >= 2 ? suggestions : []
  const isOpen = isFocused && effectiveSuggestions.length > 0

  useEffect(() => {
    if (debouncedInput.trim().length < 2) {
      return
    }

    let cancelled = false
    const params = new URLSearchParams({ q: debouncedInput.trim(), stream })
    fetch(`/api/search/suggest?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setSuggestions(data.suggestions ?? [])
        setActiveIndex(-1)
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })

    return () => { cancelled = true }
  }, [debouncedInput, stream])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const commitSearch = useCallback((value: string) => {
    const trimmed = value.trim()
    setCommittedQ(trimmed || null)
    setInputValue(trimmed)
    setIsFocused(false)
  }, [setCommittedQ])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setInputValue(committedQ)
      setIsFocused(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const s = suggestions[activeIndex]
        router.push(`/nuggets/${s.id}/${s.slug}`)
        setIsFocused(false)
      } else {
        commitSearch(inputValue)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
      return
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 h-9 focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
        <svg
          className="shrink-0 w-4 h-4 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value
            setInputValue(next)
            if (next.trim().length < 2) {
              setSuggestions([])
              setActiveIndex(-1)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder="Search nuggets…"
          aria-label="Search nuggets"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none min-w-0 h-full"
        />

        {inputValue && (
          <button
            onClick={() => {
              setInputValue('')
              setCommittedQ(null)
              setSuggestions([])
              setIsFocused(false)
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="shrink-0 text-muted hover:text-primary transition-colors min-h-[44px] flex items-center"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && effectiveSuggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Search suggestions"
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {effectiveSuggestions.map((s, i) => (
            <li
              key={s.id}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <Link
                href={`/nuggets/${s.id}/${s.slug}`}
                onClick={() => setIsFocused(false)}
                className={`flex flex-col gap-0.5 px-4 py-2.5 text-sm min-h-[44px] justify-center transition-colors ${
                  i === activeIndex
                    ? 'bg-surface-raised text-primary'
                    : 'text-primary hover:bg-surface-raised'
                }`}
              >
                <span className="line-clamp-1 font-medium">{s.title}</span>
                <span className="text-xs text-muted">
                  {s.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
