'use client'

const INSTALL_ID_KEY = 'nuggets.install_id'

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function isCapacitorNative(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const injected = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean }
    }
  ).Capacitor

  if (injected?.isNativePlatform?.()) return true

  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform()
}

export async function getOrCreateInstallId(): Promise<string> {
  if (await isCapacitorNative()) {
    const { Preferences } = await import('@capacitor/preferences')
    const existing = await Preferences.get({ key: INSTALL_ID_KEY })
    if (existing.value) return existing.value

    const installId = generateUuid()
    await Preferences.set({ key: INSTALL_ID_KEY, value: installId })
    return installId
  }

  const { getOrCreateBrowserInstallId } = await import('@/lib/push/browser-install-id')
  return getOrCreateBrowserInstallId()
}
