'use client'

import { useState } from 'react'
import { updatePreferencesAction } from '@/lib/actions/notifications'

type Prefs = {
  mute_all: boolean
  stream_standard: boolean
  stream_pulse: boolean
}

type Props = {
  initialPrefs: Prefs
}

export function AccountPrefsIsland({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs)

  async function handleChange(update: Partial<Prefs>) {
    const next = { ...prefs, ...update }
    setPrefs(next)
    await updatePreferencesAction(update)
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">Nuggets stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_standard}
          onChange={(e) => handleChange({ stream_standard: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">Market Pulse stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_pulse}
          onChange={(e) => handleChange({ stream_pulse: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">Mute all notifications</span>
        <input
          type="checkbox"
          checked={prefs.mute_all}
          onChange={(e) => handleChange({ mute_all: e.target.checked })}
          className="w-4 h-4 accent-accent"
        />
      </label>
    </div>
  )
}
