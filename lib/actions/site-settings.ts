'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidateSiteSettings } from '@/lib/cache'
import { consumerDisclaimerFormSchema, pushDigestIntervalFormSchema } from '@/lib/validation/site-settings'
import {
  CONSUMER_DISCLAIMER_SETTING_KEY,
  isSiteSettingsTableUnavailable,
  PUSH_DIGEST_INTERVAL_HOURS_KEY,
  SITE_SETTINGS_SETUP_INSTRUCTIONS,
} from '@/lib/queries/site-settings'

export type SiteSettingsActionResult = { ok: true } | { ok: false; error: string }

async function requireAdmin(): Promise<{ ok: false; error: string } | { ok: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.app_metadata?.is_admin !== true) {
    return { ok: false, error: 'Unauthorized' }
  }
  return { ok: true }
}

export async function updateConsumerDisclaimerFromFormAction(
  formData: FormData
): Promise<SiteSettingsActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const raw = {
    consumer_disclaimer: String(formData.get('consumer_disclaimer') ?? ''),
  }
  const parsed = consumerDisclaimerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((e) => e.message).join('; ') }
  }

  const db = getAdminClient()
  const { error } = await db.from('site_settings').upsert(
    {
      setting_key: CONSUMER_DISCLAIMER_SETTING_KEY,
      setting_value: parsed.data.consumer_disclaimer,
    },
    { onConflict: 'setting_key' }
  )

  if (error) {
    if (isSiteSettingsTableUnavailable(error)) {
      return { ok: false, error: SITE_SETTINGS_SETUP_INSTRUCTIONS }
    }
    return { ok: false, error: error.message }
  }

  revalidateSiteSettings()
  return { ok: true }
}

export async function updateConsumerDisclaimerFormStateAction(
  _prev: SiteSettingsActionResult | null,
  formData: FormData
): Promise<SiteSettingsActionResult> {
  return updateConsumerDisclaimerFromFormAction(formData)
}

export async function updateSiteCopyFormStateAction(
  _prev: SiteSettingsActionResult | null,
  formData: FormData
): Promise<SiteSettingsActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const disclaimerParsed = consumerDisclaimerFormSchema.safeParse({
    consumer_disclaimer: String(formData.get('consumer_disclaimer') ?? ''),
  })
  if (!disclaimerParsed.success) {
    return { ok: false, error: disclaimerParsed.error.issues.map((e) => e.message).join('; ') }
  }

  const digestParsed = pushDigestIntervalFormSchema.safeParse({
    push_digest_interval_hours: String(formData.get('push_digest_interval_hours') ?? '1'),
  })
  if (!digestParsed.success) {
    return { ok: false, error: digestParsed.error.issues.map((e) => e.message).join('; ') }
  }

  const db = getAdminClient()
  const { error } = await db.from('site_settings').upsert(
    [
      {
        setting_key: CONSUMER_DISCLAIMER_SETTING_KEY,
        setting_value: disclaimerParsed.data.consumer_disclaimer,
      },
      {
        setting_key: PUSH_DIGEST_INTERVAL_HOURS_KEY,
        setting_value: digestParsed.data.push_digest_interval_hours,
      },
    ],
    { onConflict: 'setting_key' }
  )

  if (error) {
    if (isSiteSettingsTableUnavailable(error)) {
      return { ok: false, error: SITE_SETTINGS_SETUP_INSTRUCTIONS }
    }
    return { ok: false, error: error.message }
  }

  revalidateSiteSettings()
  return { ok: true }
}
