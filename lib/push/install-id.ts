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

export async function getOrCreateInstallId(): Promise<string> {
  const { Preferences } = await import('@capacitor/preferences')
  const existing = await Preferences.get({ key: INSTALL_ID_KEY })
  if (existing.value) return existing.value

  const installId = generateUuid()
  await Preferences.set({ key: INSTALL_ID_KEY, value: installId })
  return installId
}
