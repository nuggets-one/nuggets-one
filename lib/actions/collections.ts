'use server'

import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidateCollection } from '@/lib/cache'
import {
  collectionAddEntrySchema,
  collectionCreateSchema,
  collectionAddEntriesFromArticlesSchema,
  collectionRemoveEntrySchema,
  collectionReorderEntrySchema,
  collectionUpdateSchema,
} from '@/lib/validation/collection'
import { getCollectionAdminById } from '@/lib/queries/collections-admin'

export type CollectionActionResult = { ok: true; id?: string } | { ok: false; error: string }

async function requireAdmin(): Promise<CollectionActionResult | { ok: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.app_metadata?.is_admin !== true) {
    return { ok: false, error: 'Unauthorized' }
  }
  return { ok: true }
}

function parseMetadataFromForm(formData: FormData) {
  const statusRaw = String(formData.get('status') ?? 'draft')
  const cover = String(formData.get('cover_image_url') ?? '').trim()
  const parentRaw = String(formData.get('parent_id') ?? '').trim()
  const featuredOrderRaw = String(formData.get('featured_order') ?? '').trim()
  return {
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || null,
    curator_name: String(formData.get('curator_name') ?? '').trim() || 'Nuggets',
    cover_image_url: cover.length > 0 ? cover : null,
    status: statusRaw === 'published' ? ('published' as const) : ('draft' as const),
    parent_id: parentRaw.length > 0 && parentRaw !== 'none' ? parentRaw : null,
    is_featured: formData.get('is_featured') === 'on',
    featured_order: featuredOrderRaw.length > 0 ? Number(featuredOrderRaw) : null,
  }
}

async function validateParentId(
  parentId: string | null,
  selfId?: string
): Promise<string | null> {
  if (!parentId) return null
  if (selfId && parentId === selfId) {
    throw new Error('A collection cannot be its own parent')
  }
  const db = getAdminClient()
  const { data, error } = await db
    .from('community_collections')
    .select('id, parent_id')
    .eq('id', parentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Parent topic not found')
  if (data.parent_id) {
    throw new Error('Parent must be a top-level topic (two levels only)')
  }
  return parentId
}

async function normalizeEntryPositions(collectionId: string): Promise<void> {
  const db = getAdminClient()
  const { data: rows, error } = await db
    .from('community_collection_entries')
    .select('collection_id, article_id, position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)

  for (let i = 0; i < (rows ?? []).length; i++) {
    const row = rows![i]
    if (row.position === i) continue
    const { error: upErr } = await db
      .from('community_collection_entries')
      .update({ position: i })
      .eq('collection_id', collectionId)
      .eq('article_id', row.article_id as string)
    if (upErr) throw new Error(upErr.message)
  }
}

export async function createCollectionAction(
  input: unknown
): Promise<CollectionActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const parsed = collectionCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((e) => e.message).join('; ') }
  }

  let parentId: string | null = null
  try {
    parentId = await validateParentId(parsed.data.parent_id ?? null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid parent topic'
    return { ok: false, error: msg }
  }

  const db = getAdminClient()
  const { data, error } = await db
    .from('community_collections')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      curator_name: parsed.data.curator_name,
      cover_image_url: parsed.data.cover_image_url,
      status: parsed.data.status,
      parent_id: parentId,
      is_featured: parsed.data.is_featured,
      featured_order: parsed.data.featured_order,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  const id = data.id as string
  revalidateCollection(id)
  return { ok: true, id }
}

export async function updateCollectionAction(
  input: unknown
): Promise<CollectionActionResult> {
  const gate = await requireAdmin()
  if (!gate.ok) return gate

  const parsed = collectionUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((e) => e.message).join('; ') }
  }

  let parentId: string | null = null
  try {
    parentId = await validateParentId(parsed.data.parent_id ?? null, parsed.data.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid parent topic'
    return { ok: false, error: msg }
  }

  const db = getAdminClient()
  const { data, error } = await db
    .from('community_collections')
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      curator_name: parsed.data.curator_name,
      cover_image_url: parsed.data.cover_image_url,
      status: parsed.data.status,
      parent_id: parentId,
      is_featured: parsed.data.is_featured,
      featured_order: parsed.data.featured_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Collection not found' }

  revalidateCollection(parsed.data.id)
  if (parentId) revalidateCollection(parentId)
  return { ok: true, id: parsed.data.id }
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const db = getAdminClient()
  const { error } = await db.from('community_collections').delete().eq('id', id)
  if (error) {
    console.error('deleteCollectionAction:', error.message)
    return
  }

  revalidateCollection(id)
  redirect('/admin/collections')
}

export async function addCollectionEntryAction(formData: FormData): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const parsed = collectionAddEntrySchema.safeParse({
    collection_id: String(formData.get('collection_id') ?? '').trim(),
    article_id: String(formData.get('article_id') ?? '').trim(),
  })
  if (!parsed.success) return

  const { collection_id, article_id } = parsed.data
  const returnTo = String(formData.get('return_to') ?? '').trim()
  const returnErrorTo = String(formData.get('return_error_to') ?? '').trim()
  const isReturningToArticles = returnTo.length > 0

  const redirectWithQuery = (base: string, params: Record<string, string>): string => {
    const url = base.includes('?') ? `${base}&` : `${base}?`
    const sp = new URLSearchParams(params)
    return `${url}${sp.toString()}`
  }
  const db = getAdminClient()

  const { data: article, error: artErr } = await db
    .from('articles')
    .select('id, status')
    .eq('id', article_id)
    .maybeSingle()

  if (artErr || !article) return
  if (article.status !== 'published') {
    if (isReturningToArticles) {
      redirect(
        redirectWithQuery(returnErrorTo || returnTo, {
          error: 'not_published',
          collection_id,
          article_id,
        }),
      )
    }
    return
  }

  const { data: maxRow } = await db
    .from('community_collection_entries')
    .select('position')
    .eq('collection_id', collection_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition =
    typeof maxRow?.position === 'number' ? maxRow.position + 1 : 0

  const { error } = await db.from('community_collection_entries').insert({
    collection_id,
    article_id,
    position: nextPosition,
  })

  if (error) {
    if (error.code === '23505') {
      if (isReturningToArticles) {
        redirect(
          redirectWithQuery(returnErrorTo || returnTo, {
            error: 'already_in_collection',
            collection_id,
            article_id,
          }),
        )
      } else {
        redirect(`/admin/collections/${collection_id}?error=already_in_collection`)
      }
    }
    console.error('addCollectionEntryAction:', error.message)
    return
  }

  revalidateCollection(collection_id)
  if (isReturningToArticles) {
    redirect(
      redirectWithQuery(returnTo, {
        success: 'added_to_collection',
        collection_id,
        article_id,
      }),
    )
  }
  redirect(`/admin/collections/${collection_id}`)
}

export async function addCollectionEntriesFromArticlesAction(
  formData: FormData
): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const collection_id = String(formData.get('collection_id') ?? '').trim()
  const article_ids = formData
    .getAll('article_id')
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0)

  const parsed = collectionAddEntriesFromArticlesSchema.safeParse({
    collection_id,
    article_ids,
  })
  if (!parsed.success) return

  const uniqueSelectedIds = Array.from(new Set(parsed.data.article_ids))
  const db = getAdminClient()

  const { data: articleRows, error: artErr } = await db
    .from('articles')
    .select('id, status')
    .in('id', uniqueSelectedIds)

  if (artErr) {
    console.error('addCollectionEntriesFromArticlesAction:', artErr.message)
    redirect('/admin/articles?bulk_added=1&added=0&skipped=0&error=bulk_lookup_failed')
  }

  const publishedSet = new Set(
    (articleRows ?? [])
      .filter((r) => r.status === 'published')
      .map((r) => r.id as string),
  )

  const publishedIds = Array.from(publishedSet)

  const existingSet = new Set<string>()
  if (publishedIds.length > 0) {
    const { data: existingRows, error: existingErr } = await db
      .from('community_collection_entries')
      .select('article_id')
      .eq('collection_id', collection_id)
      .in('article_id', publishedIds)

    if (existingErr) {
      console.error(
        'addCollectionEntriesFromArticlesAction existing:',
        existingErr.message,
      )
    } else {
      for (const row of existingRows ?? []) {
        existingSet.add(row.article_id as string)
      }
    }
  }

  const toInsertIds = publishedIds.filter((id) => !existingSet.has(id))

  const totalSelected = uniqueSelectedIds.length
  const addedCount = toInsertIds.length
  const skippedCount = totalSelected - addedCount

  if (toInsertIds.length === 0) {
    revalidateCollection(collection_id)
    redirect(
      `/admin/articles?bulk_added=1&collection_id=${collection_id}&added=${addedCount}&skipped=${skippedCount}`,
    )
  }

  const { data: maxRow } = await db
    .from('community_collection_entries')
    .select('position')
    .eq('collection_id', collection_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const startPosition =
    typeof maxRow?.position === 'number' ? maxRow.position + 1 : 0

  const entries = toInsertIds.map((article_id, idx) => ({
    collection_id,
    article_id,
    position: startPosition + idx,
  }))

  const { error: insertErr } = await db
    .from('community_collection_entries')
    .insert(entries)

  if (insertErr) {
    console.error('addCollectionEntriesFromArticlesAction insert:', insertErr.message)
    redirect(
      `/admin/articles?bulk_added=1&collection_id=${collection_id}&added=0&skipped=${skippedCount}&error=bulk_insert_failed`,
    )
  }

  revalidateCollection(collection_id)
  redirect(
    `/admin/articles?bulk_added=1&collection_id=${collection_id}&added=${addedCount}&skipped=${skippedCount}`,
  )
}

export async function removeCollectionEntryAction(formData: FormData): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const parsed = collectionRemoveEntrySchema.safeParse({
    collection_id: String(formData.get('collection_id') ?? '').trim(),
    article_id: String(formData.get('article_id') ?? '').trim(),
  })
  if (!parsed.success) return

  const { collection_id, article_id } = parsed.data
  const db = getAdminClient()

  const { error } = await db
    .from('community_collection_entries')
    .delete()
    .eq('collection_id', collection_id)
    .eq('article_id', article_id)

  if (error) {
    console.error('removeCollectionEntryAction:', error.message)
    return
  }

  await normalizeEntryPositions(collection_id)
  revalidateCollection(collection_id)
  redirect(`/admin/collections/${collection_id}`)
}

export async function reorderCollectionEntryAction(formData: FormData): Promise<void> {
  const gate = await requireAdmin()
  if (!gate.ok) return

  const parsed = collectionReorderEntrySchema.safeParse({
    collection_id: String(formData.get('collection_id') ?? '').trim(),
    article_id: String(formData.get('article_id') ?? '').trim(),
    direction: String(formData.get('direction') ?? '').trim(),
  })
  if (!parsed.success) return

  const detail = await getCollectionAdminById(parsed.data.collection_id)
  if (!detail) return

  const idx = detail.entries.findIndex((e) => e.article_id === parsed.data.article_id)
  if (idx < 0) return

  const neighborIdx = parsed.data.direction === 'up' ? idx - 1 : idx + 1
  if (neighborIdx < 0 || neighborIdx >= detail.entries.length) {
    redirect(`/admin/collections/${parsed.data.collection_id}`)
    return
  }

  const a = detail.entries[idx]
  const b = detail.entries[neighborIdx]
  const db = getAdminClient()

  const { error: e1 } = await db
    .from('community_collection_entries')
    .update({ position: b.position })
    .eq('collection_id', parsed.data.collection_id)
    .eq('article_id', a.article_id)

  if (e1) {
    console.error('reorderCollectionEntryAction:', e1.message)
    return
  }

  const { error: e2 } = await db
    .from('community_collection_entries')
    .update({ position: a.position })
    .eq('collection_id', parsed.data.collection_id)
    .eq('article_id', b.article_id)

  if (e2) {
    console.error('reorderCollectionEntryAction:', e2.message)
    return
  }

  await normalizeEntryPositions(parsed.data.collection_id)
  revalidateCollection(parsed.data.collection_id)
  redirect(`/admin/collections/${parsed.data.collection_id}`)
}

export async function createCollectionFromFormAction(formData: FormData): Promise<void> {
  const raw = parseMetadataFromForm(formData)
  const result = await createCollectionAction(raw)
  if (!result.ok) {
    redirect(`/admin/collections/new?error=${encodeURIComponent(result.error)}`)
  }
  redirect(`/admin/collections/${result.id}`)
}

export async function updateCollectionFromFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim()
  const raw = { ...parseMetadataFromForm(formData), id }
  const result = await updateCollectionAction(raw)
  if (!result.ok) {
    redirect(`/admin/collections/${id}?error=${encodeURIComponent(result.error)}`)
  }
  redirect(`/admin/collections/${id}?saved=1`)
}

