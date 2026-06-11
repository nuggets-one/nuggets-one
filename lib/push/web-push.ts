'use client'

import {
  deleteFcmWebToken,
  getFcmWebToken,
  isBrowserPushEnvironmentSupported,
  subscribeForegroundWebPushMessages,
} from '@/lib/push/get-fcm-web-token'
import { registerPushToken, unregisterPushToken } from '@/lib/push/register-push-token'

const WEB_PUSH_ENABLED_KEY = 'nuggets.web_push_enabled'
const WEB_PUSH_TOKEN_KEY = 'nuggets.web_push_token'

export type WebPushUiState = 'unsupported' | 'default' | 'enabled' | 'blocked'

type WebPushStateListener = (state: WebPushUiState) => void

const listeners = new Set<WebPushStateListener>()

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(WEB_PUSH_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(WEB_PUSH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(WEB_PUSH_TOKEN_KEY)
    }
  } catch {
    // ignore quota / private mode
  }
}

function writeEnabledFlag(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(WEB_PUSH_ENABLED_KEY, '1')
    } else {
      localStorage.removeItem(WEB_PUSH_ENABLED_KEY)
    }
  } catch {
    // ignore
  }
}

function readEnabledFlag(): boolean {
  try {
    return localStorage.getItem(WEB_PUSH_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function getWebPushUiState(): WebPushUiState {
  if (!isBrowserPushEnvironmentSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'granted' && readEnabledFlag() && readStoredToken()) {
    return 'enabled'
  }
  return 'default'
}

export function subscribeWebPushState(listener: WebPushStateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyStateListeners(): void {
  const state = getWebPushUiState()
  for (const listener of listeners) {
    listener(state)
  }
}

async function fetchAuthStatus(): Promise<boolean> {
  const res = await fetch('/api/auth/status', { cache: 'no-store' })
  if (!res.ok) return false
  const json = (await res.json()) as { authenticated?: boolean }
  return json.authenticated === true
}

export async function enableWebPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isBrowserPushEnvironmentSupported()) {
    return { ok: false, reason: 'unsupported' }
  }

  if (!(await fetchAuthStatus())) {
    return { ok: false, reason: 'auth_required' }
  }

  if (Notification.permission === 'denied') {
    notifyStateListeners()
    return { ok: false, reason: 'blocked' }
  }

  const token = await getFcmWebToken()
  if (!token) {
    notifyStateListeners()
    return { ok: false, reason: 'token_failed' }
  }

  const registered = await registerPushToken({
    token,
    platform: 'web',
    notificationsEnabled: true,
  })

  if (!registered) {
    return { ok: false, reason: 'register_failed' }
  }

  await fetch('/api/push/sync-topics', { method: 'POST' })
  await subscribeForegroundWebPushMessages()

  writeStoredToken(token)
  writeEnabledFlag(true)
  notifyStateListeners()
  return { ok: true }
}

export async function disableWebPush(): Promise<void> {
  const token = readStoredToken()

  if (token) {
    await unregisterPushToken(token)
  }

  await deleteFcmWebToken()
  writeStoredToken(null)
  writeEnabledFlag(false)
  notifyStateListeners()
}

/** Re-register stored token after login or when token rotates. */
export async function refreshWebPushRegistration(): Promise<void> {
  if (!readEnabledFlag()) return
  if (!(await fetchAuthStatus())) return
  if (!isBrowserPushEnvironmentSupported()) return
  if (Notification.permission !== 'granted') return

  const token = await getFcmWebToken()
  if (!token) return

  writeStoredToken(token)
  await registerPushToken({
    token,
    platform: 'web',
    notificationsEnabled: true,
  })
  await fetch('/api/push/sync-topics', { method: 'POST' })
  notifyStateListeners()
}

/** On logout: unregister web token (guest browser push deferred). */
export async function teardownWebPushOnLogout(): Promise<void> {
  if (!readEnabledFlag()) return

  const token = readStoredToken()
  if (token) {
    await unregisterPushToken(token)
  }

  await deleteFcmWebToken()
  writeStoredToken(null)
  writeEnabledFlag(false)
  notifyStateListeners()
}

export function isWebPushCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false

  const injected = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean }
    }
  ).Capacitor

  return injected?.isNativePlatform?.() === true
}
