'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateDisplayNameAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  const displayName = String(formData.get('display_name') ?? '').trim()

  if (displayName.length > 80) {
    redirect('/account?error=name_too_long')
  }

  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: displayName || null,
    updated_at: new Date().toISOString(),
  })

  await supabase.auth.updateUser({
    data: { display_name: displayName || null },
  })

  redirect('/account?message=name_updated')
}
