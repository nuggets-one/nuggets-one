'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { BrowserPushToggle } from '@/components/push/browser-push-toggle'
import {
  markNotificationReadAction,
  markBatchNotificationsReadAction,
  markAllReadAction,
  lazyCreatePreferencesAction,
  updatePreferencesAction,
} from '@/lib/actions/notifications'
import type { NotificationRow } from '@/lib/queries/notifications'
import { readResponseJson } from '@/lib/http/parse-json-response'
import { useScrollLock } from '@/lib/ui/use-scroll-lock'

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
      className="relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary active:bg-surface-raised/80"
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
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-0.5 leading-none pointer-events-none">
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
  const displayTitle =
    row.kind === 'digest'
      ? (row.title ?? 'New updates')
      : (row.title ?? 'New article')

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
          {displayTitle}
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

function CloseIcon() {
  return (
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function PanelHeader({
  onMarkAllRead,
  showMarkAllRead,
  onClose,
  showClose,
}: {
  onMarkAllRead: () => void
  showMarkAllRead: boolean
  onClose?: () => void
  showClose?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
      <span className="text-sm font-semibold text-primary">Notifications</span>
      <div className="flex items-center gap-2 shrink-0">
        {showMarkAllRead && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Mark all as read
          </button>
        )}
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function PanelBody({
  isLoading,
  error,
  notifications,
  onRetry,
  onRowClick,
}: {
  isLoading: boolean
  error: string | null
  notifications: NotificationWithSlug[]
  onRetry: () => void
  onRowClick: (row: NotificationWithSlug) => void
}) {
  if (isLoading) return <SkeletonRows count={3} />
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-accent hover:text-accent-hover hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }
  return <NotificationList rows={notifications} onRowClick={onRowClick} />
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
      <BrowserPushToggle variant="compact" disabled={prefs.mute_all} />
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function NotificationPanel({
  initialUnreadCount = 0,
}: {
  initialUnreadCount?: number
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  useScrollLock(isOpen)
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
  const mobileSheetRef = useRef<HTMLDivElement>(null)
  const [portalReady, setPortalReady] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/list', { cache: 'no-store' })
      const json = await readResponseJson<ListResponse>(res)
      if (!res.ok || !json) throw new Error('Failed to load')
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
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (mobileSheetRef.current?.contains(target)) return
      closePanel()
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
      if (row.kind === 'digest' && row.batch_key) {
        setNotifications((prev) => {
          const batchUnread = prev.filter(
            (n) => n.batch_key === row.batch_key && !n.is_read
          ).length
          setUnreadCount((c) => Math.max(0, c - batchUnread))
          return prev.map((n) =>
            n.batch_key === row.batch_key ? { ...n, is_read: true } : n
          )
        })
        await markBatchNotificationsReadAction(row.batch_key)
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === row.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - (row.is_read ? 0 : 1)))
        await markNotificationReadAction(row.id)
      }

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

  const showMarkAllRead = notifications.some((n) => !n.is_read)

  const mobileOverlay =
    isOpen && portalReady
      ? createPortal(
          <div className="sm:hidden fixed inset-0 z-[80] flex flex-col justify-end overscroll-none">
            <button
              type="button"
              aria-label="Dismiss notifications"
              className="absolute inset-0 z-[79] bg-scrim"
              onClick={closePanel}
            />
            <div
              ref={mobileSheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              className="
                relative z-[80] flex w-full flex-col
                max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top,0px)-4.5rem))]
                rounded-t-2xl border-t border-border bg-rail shadow-panel
                pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]
              "
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              <PanelHeader
                onMarkAllRead={handleMarkAllRead}
                showMarkAllRead={showMarkAllRead}
                onClose={closePanel}
                showClose
              />

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <PanelBody
                  isLoading={isLoading}
                  error={error}
                  notifications={notifications}
                  onRetry={fetchNotifications}
                  onRowClick={handleRowClick}
                />
              </div>

              <PreferencesSection prefs={prefs} onChange={handlePrefsChange} />
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={panelRef} className="relative shrink-0">
      <BellButton unreadCount={unreadCount} onClick={togglePanel} />

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="
            hidden sm:flex flex-col
            absolute right-0 top-full z-50 mt-2
            max-h-[32rem] w-96 overflow-hidden
            rounded-xl border border-border bg-rail shadow-panel
          "
        >
          <PanelHeader
            onMarkAllRead={handleMarkAllRead}
            showMarkAllRead={showMarkAllRead}
          />

          <div className="flex-1 overflow-y-auto">
            <PanelBody
              isLoading={isLoading}
              error={error}
              notifications={notifications}
              onRetry={fetchNotifications}
              onRowClick={handleRowClick}
            />
          </div>

          <PreferencesSection prefs={prefs} onChange={handlePrefsChange} />
        </div>
      )}

      {mobileOverlay}
    </div>
  )
}
