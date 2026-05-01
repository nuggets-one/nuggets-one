'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'

type Variant = 'card' | 'detail'
type Status = 'idle' | 'copied' | 'failed'

type Props = {
  title: string
  /** Relative path on this site (e.g. `/nuggets/{id}/{slug}`). Resolved to absolute at click time. */
  href: string
  variant?: Variant
}

// Phase 8 placeholder. Replace with real telemetry POST once the helper lands.
function logShare(channel: 'native' | 'copy', surface: Variant) {
  if (typeof window !== 'undefined') {
    console.log('[telemetry]', { event: 'share_initiated', surface, channel })
  }
}

export function ShareButton({ title, href, variant = 'card' }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [pending, setPending] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  function scheduleReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus('idle'), 1500)
  }

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    setPending(true)

    const url = `${window.location.origin}${href}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        logShare('native', variant)
      } catch {
        // User dismissed or share rejected — no fallback per spec.
      }
      setPending(false)
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      logShare('copy', variant)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    scheduleReset()
    setPending(false)
  }

  const label =
    status === 'copied' ? 'Copied!' : status === 'failed' ? 'Copy failed' : 'Share'
  const ariaLabel = status === 'idle' ? 'Share this nugget' : label

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 transition-colors min-h-[44px] min-w-[44px] justify-center ${
        variant === 'detail'
          ? 'px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-surface-raised active:bg-surface-raised/80'
          : 'p-1 rounded hover:bg-surface-raised active:bg-surface-raised/80'
      } ${
        status === 'failed' ? 'text-muted' : 'text-muted hover:text-primary'
      } ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4m0 0L8 6m4-4v14"
        />
      </svg>
      {variant === 'detail' && <span aria-live="polite">{label}</span>}
      {variant === 'card' && status !== 'idle' && (
        <span className="sr-only" aria-live="polite">
          {label}
        </span>
      )}
    </button>
  )
}
