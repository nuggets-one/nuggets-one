import 'server-only'

import { unstable_cache } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'
import { CACHE_TAGS } from '@/lib/cache'
import { DEFAULT_CONSUMER_DISCLAIMER } from '@/lib/legal/consumer-disclaimer'

export const CONSUMER_DISCLAIMER_SETTING_KEY = 'consumer_disclaimer' as const

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

/** True when `site_settings` is missing or PostgREST has not loaded it yet. */
export function isSiteSettingsTableUnavailable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const code = error.code ?? ''
  if (PENDING_MIGRATION_CODES.has(code)) return true
  const msg = (error.message ?? '').toLowerCase()
  if (!msg.includes('site_settings')) return false
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  )
}

export const SITE_SETTINGS_SETUP_INSTRUCTIONS =
  'Apply the migration `supabase/migrations/20240001000012_site_settings.sql` to your Supabase project (SQL Editor or `supabase db push`). If the table already exists, reload the API schema in Dashboard → Settings → Data API, or pause/resume the project so PostgREST picks up the new table.'

async function fetchConsumerDisclaimerUncached(): Promise<string> {
  const supabase = getPublicClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', CONSUMER_DISCLAIMER_SETTING_KEY)
    .maybeSingle()

  if (error) {
    if (!isSiteSettingsTableUnavailable(error)) {
      console.error('fetchConsumerDisclaimer:', error.message)
    }
    return DEFAULT_CONSUMER_DISCLAIMER
  }

  const row = data as { setting_value?: string } | null
  const v = row?.setting_value?.trim()
  return v && v.length > 0 ? v : DEFAULT_CONSUMER_DISCLAIMER
}

const cachedConsumerDisclaimer = unstable_cache(fetchConsumerDisclaimerUncached, ['site-consumer-disclaimer'], {
  tags: [CACHE_TAGS.siteSettings],
  revalidate: false,
})

export async function getConsumerDisclaimer(): Promise<string> {
  return cachedConsumerDisclaimer()
}
