'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  markNotificationReadAction,
  markAllReadAction,
  lazyCreatePreferencesAction,
  updatePreferencesAction,
} from '@/lib/actions/notifications'
import type { NotificationRow } from '@/lib/queries/notifications'

type Prefs = {
  mute_all: boolean
  stream_standard: boolean
  stream_pulse: boolean
}

type NotificationWithSlug = NotificationRow & {
  article?: { slug: string } | null
}

type ListResponse = {
  notifications: NotificationWithSlug[]
  unreadCount: number
  preferences: Prefs | null
}

// ── Sub-components ──────────────────────────────────────────────────────────

function BellButton({
  unreadCount,
  onClick,
}: {
  unreadCount: number
  onClick: () => void
}) {
  const display = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-primary hover:bg-surface-raised active:bg-surface-raised/80 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {display && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-0.5 leading-none pointer-events-none">
          {display}
        </span>
      )}
    </button>
  )
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 px-4 py-3 border-b border-border last:border-0">
          <div className="h-3.5 w-3/4 rounded bg-surface-raised animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-surface-raised animate-pulse" />
        </div>
      ))}
    </>
  )
}

function NotificationRowItem({
  row,
  onActivate,
}: {
  row: NotificationWithSlug
  onActivate: (row: NotificationWithSlug) => void
}) {
  const timeLabel = new Date(row.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const streamLabel = row.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'

  return (
    <button
      type="button"
      onClick={() => onActivate(row)}
      className={`w-full text-left flex flex-col gap-0.5 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-raised transition-colors ${
        row.is_read ? 'opacity-60' : ''
      }`}
    >
      {!row.is_read && (
        <span className="sr-only">Unread: </span>
      )}
      <span className="flex items-start gap-2">
        {!row.is_read && (
          <span
            className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-accent"
            aria-hidden="true"
          />
        )}
        <span className={`text-sm text-primary leading-snug ${row.is_read ? '' : 'font-medium'}`}>
          {row.title ?? 'New article'}
        </span>
      </span>
      <span className="text-xs text-muted pl-4">
        {streamLabel} · {timeLabel}
      </span>
    </button>
  )
}

function NotificationList({
  rows,
  onRowClick,
}: {
  rows: NotificationWithSlug[]
  onRowClick: (row: NotificationWithSlug) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <p className="text-sm text-muted">You&apos;re all caught up</p>
      </div>
    )
  }

  return (
    <div>
      {rows.map((row) => (
        <NotificationRowItem key={row.id} row={row} onActivate={onRowClick} />
      ))}
    </div>
  )
}

function PreferencesSection({
  prefs,
  onChange,
}: {
  prefs: Prefs
  onChange: (update: Partial<Prefs>) => void
}) {
  return (
    <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
        Notifications
      </p>
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-sm text-primary">Nuggets</span>
        <input
          type="checkbox"
          checked={prefs.stream_standard}
          onChange={(e) => onChange({ stream_standard: e.target.checked })}
          className="w-4 h-4 accent-accent"
          disabled={prefs.mute_all}
        />
      </label>
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-sm text-primary">Market Pulse</span>
        <input
          type="checkbox"
          checked={prefs.stream_pulse}
          onChange={(e) => onChange({ stream_pulse: e.target.checked })}
          className="w-4 h-4 accent-accent"
          disabled={prefs.mute_all}
        />
      </label>
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-sm text-primary">Mute all</span>
        <input
          type="checkbox"
          checked={prefs.mute_all}
          onChange={(e) => onChange({ mute_all: e.target.checked })}
          className="w-4 h-4 accent-accent"
        />
      </label>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function NotificationPanel({
  initialUnreadCount,
}: {
  initialUnreadCount: number
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationWithSlug[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [prefs, setPrefs] = useState<Prefs>({
    mute_all: false,
    stream_standard: true,
    stream_pulse: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/list', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const json: ListResponse = await res.json()
      setNotifications(json.notifications)
      setUnreadCount(json.unreadCount)
      if (json.preferences) setPrefs(json.preferences)
    } catch {
      setError("Couldn't load notifications")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openPanel = useCallback(async () => {
    setIsOpen(true)
    await Promise.all([fetchNotifications(), lazyCreatePreferencesAction()])
  }, [fetchNotifications])

  const closePanel = useCallback(() => {
    setIsOpen(false)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const togglePanel = useCallback(() => {
    if (isOpen) {
      closePanel()
    } else {
      openPanel()
    }
  }, [isOpen, openPanel, closePanel])

  // Start 60s polling when open, stop when closed
  useEffect(() => {
    if (isOpen) {
      pollRef.current = setInterval(fetchNotifications, 60_000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isOpen, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closePanel])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closePanel])

  const handleRowClick = useCallback(
    async (row: NotificationWithSlug) => {
      // Mark read optimistically
      setNotifications((prev) =>
        prev.map((n) => (n.id === row.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - (row.is_read ? 0 : 1)))

      await markNotificationReadAction(row.id)

      if (row.kind === 'single' && row.article_id) {
        const slug = row.article?.slug
        if (slug) {
          closePanel()
          router.push(`/nuggets/${row.article_id}/${slug}`)
        }
      } else if (row.content_stream) {
        closePanel()
        router.push(`/?stream=${row.content_stream}`)
      }
    },
    [router, closePanel]
  )

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllReadAction()
  }, [])

  const handlePrefsChange = useCallback(async (update: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...update }))
    await updatePreferencesAction(update)
  }, [])

  return (
    <div ref={panelRef} className="relative shrink-0">
      <BellButton unreadCount={unreadCount} onClick={togglePanel} />

      {isOpen && (
        <>
          {/* Desktop panel */}
          <div
            role="dialog"
            aria-label="Notifications"
            className="
              hidden sm:flex flex-col
              absolute right-0 top-full mt-2
              w-96 max-h-[32rem]
              bg-bg border border-border rounded-xl shadow-lg
              overflow-hidden z-50
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-primary">Notifications</span>
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <SkeletonRows count={3} />
              ) : error ? (
                <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                  <p className="text-sm text-muted">{error}</p>
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    className="text-xs text-accent hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <NotificationList rows={notifications} onRowClick={handleRowClick} />
              )}
            </div>

            <PreferencesSection prefs={prefs} onChange={handlePrefsChange} />
          </div>

          {/* Mobile bottom sheet */}
          <div
            role="dialog"
            aria-label="Notifications"
            className="
              sm:hidden fixed inset-x-0 bottom-0 z-50
              bg-bg border-t border-border rounded-t-2xl
              flex flex-col max-h-[85dvh]
              shadow-[0_-4px_24px_rgba(0,0,0,0.12)]
            "
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-primary">Notifications</span>
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <SkeletonRows count={3} />
              ) : error ? (
                <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                  <p className="text-sm text-muted">{error}</p>
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    className="text-xs text-accent hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <NotificationList rows={notifications} onRowClick={handleRowClick} />
              )}
            </div>

            <PreferencesSection prefs={prefs} onChange={handlePrefsChange} />
          </div>

          {/* Mobile backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-black/40 z-40"
            aria-hidden="true"
            onClick={closePanel}
          />
        </>
      )}
    </div>
  )
}
