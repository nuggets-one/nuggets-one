'use client'

import { useEffect, useState, useTransition } from 'react'
import { isFirebaseWebPushConfigured } from '@/lib/push/firebase-web-config'
import {
  disableWebPush,
  enableWebPush,
  getWebPushUiState,
  subscribeWebPushState,
  type WebPushUiState,
} from '@/lib/push/web-push'

type Props = {
  /** Compact row for bell panel vs full section on account page */
  variant?: 'compact' | 'section'
  disabled?: boolean
}

export function BrowserPushToggle({ variant = 'compact', disabled = false }: Props) {
  const [state, setState] = useState<WebPushUiState>(() => getWebPushUiState())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => subscribeWebPushState(setState), [])

  if (state === 'unsupported') {
    const hasBrowserApis =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator

    if (hasBrowserApis && !isFirebaseWebPushConfigured()) {
      return (
        <p className="text-xs text-muted">
          Browser push is not configured on this environment (missing Firebase web env).
        </p>
      )
    }

    return null
  }

  async function handleEnable() {
    setError(null)
    startTransition(async () => {
      const result = await enableWebPush()
      if (!result.ok) {
        if (result.reason === 'blocked') {
          setError('Notifications are blocked in your browser settings.')
        } else if (result.reason === 'auth_required') {
          setError('Sign in to enable browser notifications.')
        } else if (result.reason === 'token_failed') {
          setError('Could not register for push. Reload the page and try again.')
        } else {
          setError('Could not enable browser notifications. Try again.')
        }
      }
    })
  }

  async function handleDisable() {
    setError(null)
    startTransition(async () => {
      await disableWebPush()
    })
  }

  const isEnabled = state === 'enabled'
  const isBlocked = state === 'blocked'

  if (variant === 'section') {
    return (
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-sm font-medium text-primary">Browser notifications</p>
        <p className="text-xs text-muted">
          Get nugget headlines in your browser even when this tab is closed.
        </p>
        {isBlocked ? (
          <p className="text-xs text-muted">
            Notifications are blocked. Enable them in your browser&apos;s site settings for this
            site.
          </p>
        ) : (
          <button
            type="button"
            disabled={disabled || isPending}
            onClick={() => (isEnabled ? void handleDisable() : void handleEnable())}
            className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
          >
            {isPending ? 'Updating…' : isEnabled ? 'Disable browser notifications' : 'Enable browser notifications'}
          </button>
        )}
        <p className="text-xs text-muted">
          Limited on iPhone Safari unless you add Nuggets to your Home Screen.
        </p>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-sm text-primary">Browser alerts</span>
        <input
          type="checkbox"
          checked={isEnabled}
          disabled={disabled || isPending || isBlocked}
          onChange={(e) => {
            if (e.target.checked) void handleEnable()
            else void handleDisable()
          }}
          className="w-4 h-4 accent-accent"
          aria-label="Browser push notifications"
        />
      </label>
      {isBlocked && (
        <p className="text-xs text-muted">Blocked in browser settings.</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
