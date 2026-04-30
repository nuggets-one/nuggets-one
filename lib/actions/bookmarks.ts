'use server'

import { createClient } from '@/lib/supabase/server'

// S11-F10: server-side bookmark toggle — auth check happens server-side,
// eliminating the client-side getUser() call on every bookmark click (~100ms).
export async function toggleBookmarkAction(
  articleId: string,
  currentlyBookmarked: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'not_authenticated' }

  if (currentlyBookmarked) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('article_id', articleId)
      .eq('user_id', user.id)
    return { error: error?.message ?? null }
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ article_id: articleId, user_id: user.id })
    return { error: error?.message ?? null }
  }
}
