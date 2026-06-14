import Link from 'next/link'
import { notFound } from 'next/navigation'
import { updateTagAction } from '@/lib/actions/admin'
import { getTagAdminById } from '@/lib/queries/tags-admin'
import { DeleteTagButton } from '@/app/admin/tags/_components/DeleteTagButton'
import { TagFormFields } from '@/app/admin/tags/_components/TagFormFields'

export const dynamic = 'force-dynamic'

const TAG_ERRORS: Record<string, string> = {
  missing_label: 'Label is required.',
  invalid_slug: 'Slug must use lowercase letters, numbers, and hyphens only.',
  invalid_dimension: 'That dimension is not supported.',
  duplicate_slug: 'Another tag already uses that slug.',
  dimension_not_supported:
    'The database does not accept the Source dimension yet. Apply migration 20240001000027_tag_dimension_source.sql, then retry.',
  not_found: 'Tag not found.',
  save_failed: 'Could not save the tag. Please try again.',
}

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminTagEditPage({ params, searchParams }: Props) {
  const { id } = await params
  const resolved = (await searchParams) ?? {}
  const saved = resolved.saved === '1'
  const errorCode = Array.isArray(resolved.error) ? resolved.error[0] : resolved.error

  const tag = await getTagAdminById(id)
  if (!tag) notFound()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/tags"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to tags
        </Link>
        <h1 className="text-xl font-bold text-primary">Edit tag</h1>
        <p className="mt-1 text-sm text-muted">
          {tag.article_count} nugget{tag.article_count === 1 ? '' : 's'} use this tag
        </p>
      </div>

      {saved && (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary">
          Tag saved.
        </div>
      )}

      {errorCode ? (
        <div
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg"
        >
          {TAG_ERRORS[errorCode] ?? 'Something went wrong. Please try again.'}
        </div>
      ) : null}

      <form
        action={updateTagAction}
        className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface-raised"
      >
        <input type="hidden" name="id" value={id} />
        <TagFormFields tag={tag} />
        <button
          type="submit"
          className="self-start px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Save tag
        </button>
      </form>

      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-danger-fg mb-3">Danger zone</h2>
        <DeleteTagButton id={id} label={tag.label} articleCount={tag.article_count} />
      </section>
    </div>
  )
}
