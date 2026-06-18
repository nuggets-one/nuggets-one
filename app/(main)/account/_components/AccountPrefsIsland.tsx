'use client'

import { useState } from 'react'
import { updatePreferencesAction } from '@/lib/actions/notifications'
import { BrowserPushToggle } from '@/components/push/browser-push-toggle'
import { STREAM_INTRO_COPY } from '@/lib/copy/streams'

type Prefs = {
  mute_all: boolean
  stream_standard: boolean
  stream_pulse: boolean
  stream_charts: boolean
  stream_tech_vc: boolean
  stream_geopolitics: boolean
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
        <span className="text-sm text-primary">{STREAM_INTRO_COPY.standard.label} stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_standard}
          onChange={(e) => handleChange({ stream_standard: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">{STREAM_INTRO_COPY.pulse.label} stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_pulse}
          onChange={(e) => handleChange({ stream_pulse: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">{STREAM_INTRO_COPY.charts.label} stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_charts}
          onChange={(e) => handleChange({ stream_charts: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">{STREAM_INTRO_COPY.tech_vc.label} stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_tech_vc}
          onChange={(e) => handleChange({ stream_tech_vc: e.target.checked })}
          disabled={prefs.mute_all}
          className="w-4 h-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-primary">{STREAM_INTRO_COPY.geopolitics.label} stream</span>
        <input
          type="checkbox"
          checked={prefs.stream_geopolitics}
          onChange={(e) => handleChange({ stream_geopolitics: e.target.checked })}
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
      <BrowserPushToggle variant="section" disabled={prefs.mute_all} />
    </div>
  )
}
