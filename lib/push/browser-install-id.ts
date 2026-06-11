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

export function getOrCreateBrowserInstallId(): string {
  if (typeof window === 'undefined') return generateUuid()

  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY)
    if (existing) return existing

    const installId = generateUuid()
    localStorage.setItem(INSTALL_ID_KEY, installId)
    return installId
  } catch {
    return generateUuid()
  }
}
