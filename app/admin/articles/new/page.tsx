// S1-F1: page files must only export default + Next.js-approved named exports.
// ArticleFormFields and ArticleFormDefaults moved to _components/article-form-fields.tsx.
import { createArticleAction } from '@/lib/actions/admin'
import { ArticleFormFields } from './_components/article-form-fields'

const TAG_ERRORS: Record<string, string> = {
  unknown_tags: 'One or more tag slugs were not found. Check Tags admin and retry.',
  tag_update_failed: 'Tag update failed. Please try again.',
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewArticlePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-primary mb-6">New article</h1>

      {errorCode && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {TAG_ERRORS[errorCode] ?? 'Something went wrong. Please try again.'}
        </p>
      )}

      <form action={createArticleAction} className="flex flex-col gap-4">
        <ArticleFormFields />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-accent text-black text-sm font-medium hover:opacity-90"
          >
            Create draft
          </button>
        </div>
      </form>
    </div>
  )
}
