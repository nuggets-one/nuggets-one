import { createClient } from '@/lib/supabase/server'
import type { TagSummary } from '@/types/article'

/**
 * Official tags only — used for the chip rail filter on Home.
 * is_official = true means curated by admin; false tags never appear
 * on the public chip rail.
 * Results are stable — cache aggressively.
 */
export async function listOfficialTags(): Promise<TagSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .eq('is_official', true)
    .order('label', { ascending: true })

  if (error) {
    throw new Error(`listOfficialTags error: ${error.message}`)
  }

  // TODO: replace with generated DB types in later PR
  return (data ?? []) as unknown as TagSummary[]
}

/**
 * All tags — used by admin tag assignment.
 * Not called from public routes.
 */
export async function listAllTags(): Promise<TagSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .order('label', { ascending: true })

  if (error) {
    throw new Error(`listAllTags error: ${error.message}`)
  }

  // TODO: replace with generated DB types in later PR
  return (data ?? []) as unknown as TagSummary[]
}
