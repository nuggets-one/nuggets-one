import { sortOfficialTagsByDimensionThenLabel } from '@/lib/feed/group-official-tags'
import { getPublicClient } from '@/lib/supabase/public'
import type { TagSummary } from '@/types/article'

export async function listOfficialTags(): Promise<TagSummary[]> {
  const supabase = getPublicClient()

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, label, dimension, is_official')
      .eq('is_official', true)

    if (error) {
      // Keep the feed renderable when Supabase has transient network issues.
      console.error(`listOfficialTags error: ${error.message}`)
      return []
    }

    // TODO: replace with generated DB types in later PR
    return sortOfficialTagsByDimensionThenLabel((data ?? []) as unknown as TagSummary[])
  } catch (error) {
    // Supabase client can throw for low-level fetch/network failures.
    const message = error instanceof Error ? error.message : String(error)
    console.error(`listOfficialTags exception: ${message}`)
    return []
  }
}

/**
 * All tags — used by admin tag assignment.
 * Not called from public routes.
 */
export async function listAllTags(): Promise<TagSummary[]> {
  const supabase = getPublicClient()

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
