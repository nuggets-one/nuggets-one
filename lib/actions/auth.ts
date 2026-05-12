'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// S7-F4: use the canonical site URL env var — never trust the Host header for
// redirect construction (host-header poisoning → attacker controls reset link).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010'

// PRODUCT §0.7: reject next values not starting with '/' OR starting with '//'
// OR containing a scheme. Defense-in-depth against open redirects.
function sanitizeNext(raw: FormDataEntryValue | null | undefined): string {
  const next = typeof raw === 'string' ? raw : ''
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  try {
    if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(decodeURIComponent(next))) return '/'
  } catch {
    return '/'
  }
  return next
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function loginAction(formData: FormData) {
  const next = sanitizeNext(formData.get('next'))
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/login?error=invalid_credentials${nextParam}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/login?error=${encodeURIComponent(error.message)}${nextParam}`)
  }

  redirect(next)
}

export async function signupAction(formData: FormData) {
  const next = sanitizeNext(formData.get('next'))
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? 'invalid_data')
    redirect(`/signup?error=${msg}${nextParam}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/signup?error=${encodeURIComponent(error.message)}${nextParam}`)
  }

  const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
  redirect(`/login?message=check_email${nextParam}`)
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    redirect('/forgot-password?error=invalid_email')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/account`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?message=check_email')
}

export async function googleSignInAction(formData: FormData) {
  const next = sanitizeNext(formData.get('next'))
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    const nextParam = next !== '/' ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'OAuth failed')}${nextParam}`)
  }

  redirect(data.url)
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
