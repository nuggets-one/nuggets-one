import 'server-only'

// S1-F1: page files must only export default + Next.js-approved named exports.
// ArticleFormFields and ArticleFormDefaults moved to _components/article-form-fields.tsx.
import { createArticleAction } from '@/lib/actions/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArticleFormFields } from '../_components/article-form-fields'
import { ArticleFormShell } from '../_components/article-form-shell'
import type { TagSummary } from '@/types/article'
import { TAG_DIMENSIONS } from '@/types/article'

const TAG_ERRORS: Record<string, string> = {
  unknown_tags: 'One or more tag slugs were not found. Check Tags admin and retry.',
  tag_update_failed: 'Tag update failed. Please try again.',
  media_update_failed: 'Media URLs could not be saved. Please try again.',
  missing_title: 'Title is required.',
  stream_tag_mismatch:
    'This stream requires matching tags. Tech x VC needs Technology, PE/VC, AI, or Semiconductors. Geopolitics needs the Geopolitics tag. Change the stream or re-add a matching tag.',
  create_failed: 'Could not create the draft. Check required fields and try again.',
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewArticlePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error
  const db = createAdminClient()
  const { data: tags } = await db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .eq('is_official', true)
    .in('dimension', [...TAG_DIMENSIONS])
    .order('dimension', { ascending: true, nullsFirst: false })
    .order('label', { ascending: true })

  return (
    <ArticleFormShell
      title="Create Nugget"
      description="Save a draft first, then publish from the edit screen when ready."
      errorMessage={errorCode ? TAG_ERRORS[errorCode] ?? 'Something went wrong. Please try again.' : undefined}
    >
      <form action={createArticleAction}>
        <ArticleFormFields tags={(tags ?? []) as unknown as TagSummary[]} />
        <div className="sticky bottom-0 z-20 mt-6 flex items-center justify-end gap-3 rounded-t-2xl border border-border bg-surface/95 px-4 py-3 shadow-panel backdrop-blur">
          <button
            type="submit"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Save Draft
          </button>
        </div>
      </form>
    </ArticleFormShell>
  )
}
