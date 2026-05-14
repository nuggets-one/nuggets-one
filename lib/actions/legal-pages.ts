'use server'

import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidateLegalDocuments } from '@/lib/cache'
import { legalPageCreateSchema, legalPageUpdateSchema } from '@/lib/validation/legal-page'
import { listLegalPagesAdmin } from '@/lib/queries/legal-pages-admin'

export type LegalPageActionResult = { ok: true } | { ok: false; error: string }

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

export async function createLegalPageAction(input: unknown): Promise<LegalPageActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const parsed = legalPageCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((e) => e.message).join('; ') }
  }
  const v = parsed.data
  const db = getAdminClient()

  const { data: maxRows } = await db.from('legal_pages').select('sort_order').order('sort_order', { ascending: false }).limit(1)

  const top = maxRows?.[0] as { sort_order?: number } | undefined
  const nextOrder = (typeof top?.sort_order === 'number' ? top.sort_order : 0) + 10

  const { error } = await db.from('legal_pages').insert({
    slug: v.slug,
    label: v.label,
    page_title: v.page_title,
    body_markdown: v.body_markdown,
    sort_order: nextOrder,
    is_enabled: v.is_enabled,
    show_in_footer: v.show_in_footer,
    show_in_account_menu: v.show_in_account_menu,
    robots_index: v.robots_index,
  })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'A page with this slug already exists' }
    }
    return { ok: false, error: error.message }
  }

  revalidateLegalDocuments()
  return { ok: true }
}

export async function updateLegalPageAction(input: unknown): Promise<LegalPageActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const parsed = legalPageUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((e) => e.message).join('; ') }
  }
  const v = parsed.data
  const db = getAdminClient()

  const { data: updated, error } = await db
    .from('legal_pages')
    .update({
      label: v.label,
      page_title: v.page_title,
      body_markdown: v.body_markdown,
      is_enabled: v.is_enabled,
      show_in_footer: v.show_in_footer,
      show_in_account_menu: v.show_in_account_menu,
      robots_index: v.robots_index,
    })
    .eq('slug', v.slug)
    .select('slug')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!updated) return { ok: false, error: 'Page not found' }

  revalidateLegalDocuments()
  return { ok: true }
}

export async function reorderLegalPageAction(
  slug: string,
  direction: 'up' | 'down',
  formData: FormData
): Promise<void> {
  void formData
  const gate = await requireAdmin()
  if (!gate.ok) return

  const rows = await listLegalPagesAdmin()
  const idx = rows.findIndex((r) => r.slug === slug)
  if (idx < 0) return
  const neighbor = direction === 'up' ? idx - 1 : idx + 1
  if (neighbor < 0 || neighbor >= rows.length) {
    return
  }

  const a = rows[idx]
  const b = rows[neighbor]
  const db = getAdminClient()

  const { error: e1 } = await db.from('legal_pages').update({ sort_order: b.sort_order }).eq('id', a.id)
  if (e1) {
    console.error('reorderLegalPageAction:', e1.message)
    return
  }
  const { error: e2 } = await db.from('legal_pages').update({ sort_order: a.sort_order }).eq('id', b.id)
  if (e2) {
    console.error('reorderLegalPageAction:', e2.message)
    return
  }

  revalidateLegalDocuments()
}

function parseCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

export async function updateLegalPageRowFlagsAction(formData: FormData): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const slug = String(formData.get('slug') ?? '').trim()
  if (!slug) return

  const db = getAdminClient()
  const { data: updated, error } = await db
    .from('legal_pages')
    .update({
      is_enabled: parseCheckbox(formData, 'is_enabled'),
      show_in_footer: parseCheckbox(formData, 'show_in_footer'),
      show_in_account_menu: parseCheckbox(formData, 'show_in_account_menu'),
      robots_index: parseCheckbox(formData, 'robots_index'),
    })
    .eq('slug', slug)
    .select('slug')
    .maybeSingle()

  if (error) {
    console.error('updateLegalPageRowFlagsAction:', error.message)
    return
  }
  if (!updated) return

  revalidateLegalDocuments()
}

export async function updateLegalPageFromFormAction(formData: FormData): Promise<LegalPageActionResult> {
  const raw = {
    slug: String(formData.get('slug') ?? '').trim(),
    label: String(formData.get('label') ?? '').trim(),
    page_title: String(formData.get('page_title') ?? '').trim(),
    body_markdown: String(formData.get('body_markdown') ?? ''),
    is_enabled: parseCheckbox(formData, 'is_enabled'),
    show_in_footer: parseCheckbox(formData, 'show_in_footer'),
    show_in_account_menu: parseCheckbox(formData, 'show_in_account_menu'),
    robots_index: parseCheckbox(formData, 'robots_index'),
  }
  return updateLegalPageAction(raw)
}

export async function createLegalPageFromFormAction(formData: FormData): Promise<LegalPageActionResult> {
  const raw = {
    slug: String(formData.get('slug') ?? '').trim(),
    label: String(formData.get('label') ?? '').trim(),
    page_title: String(formData.get('page_title') ?? '').trim(),
    body_markdown: String(formData.get('body_markdown') ?? ''),
    is_enabled: parseCheckbox(formData, 'is_enabled'),
    show_in_footer: parseCheckbox(formData, 'show_in_footer'),
    show_in_account_menu: parseCheckbox(formData, 'show_in_account_menu'),
    robots_index: parseCheckbox(formData, 'robots_index'),
  }
  return createLegalPageAction(raw)
}

export async function updateLegalPageFormStateAction(
  _prev: LegalPageActionResult | null,
  formData: FormData
): Promise<LegalPageActionResult> {
  return updateLegalPageFromFormAction(formData)
}

export async function createLegalPageFormStateAction(
  _prev: LegalPageActionResult | null,
  formData: FormData
): Promise<LegalPageActionResult> {
  const raw = {
    slug: String(formData.get('slug') ?? '').trim(),
    label: String(formData.get('label') ?? '').trim(),
    page_title: String(formData.get('page_title') ?? '').trim(),
    body_markdown: String(formData.get('body_markdown') ?? ''),
    is_enabled: parseCheckbox(formData, 'is_enabled'),
    show_in_footer: parseCheckbox(formData, 'show_in_footer'),
    show_in_account_menu: parseCheckbox(formData, 'show_in_account_menu'),
    robots_index: parseCheckbox(formData, 'robots_index'),
  }
  const r = await createLegalPageAction(raw)
  if (r.ok) {
    redirect(`/admin/legal-pages/${raw.slug}`)
  }
  return r
}
