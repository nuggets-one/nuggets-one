import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getTagErrorMessage,
  TagErrorAlert,
  TagSuccessAlert,
} from '@/app/admin/tags/_components/tag-alerts'
import { getDimensionLabel } from '@/app/admin/tags/_components/tag-dimension-badge'
import { TagEditForm } from '@/app/admin/tags/_components/tag-edit-form'
import { DeleteTagButton } from '@/app/admin/tags/_components/DeleteTagButton'
import { getTagAdminById } from '@/lib/queries/tags-admin'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminTagEditPage({ params, searchParams }: Props) {
  const { id } = await params
  const resolved = (await searchParams) ?? {}
  const saved = resolved.saved === '1'
  const errorCode = Array.isArray(resolved.error) ? resolved.error[0] : resolved.error
  const errorMessage = getTagErrorMessage(errorCode, 'edit')

  const tag = await getTagAdminById(id)
  if (!tag) notFound()

  const dimensionLabel = getDimensionLabel(tag.dimension)
  const officialLabel = tag.is_official ? 'Official' : 'Not official'

  return (
    <div className="max-w-2xl space-y-10">
      <div className="border-b border-border pb-5">
        <Link
          href="/admin/tags"
          className="mb-2 inline-flex text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          Back to tags
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">{tag.label}</h1>
        <p className="mt-1 text-sm text-muted">
          {tag.article_count} nugget{tag.article_count === 1 ? '' : 's'} · {dimensionLabel} ·{' '}
          {officialLabel}
        </p>
      </div>

      {saved ? <TagSuccessAlert message="Tag saved." /> : null}
      {errorMessage ? <TagErrorAlert message={errorMessage} /> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Tag details</h2>
        <TagEditForm tag={tag} />
      </section>

      <section className="rounded-xl border border-danger-border/40 bg-danger-soft/30 p-4">
        <h2 className="text-sm font-semibold text-danger-fg">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Deleting removes this tag from every nugget that uses it and updates feed filters.
        </p>
        <div className="mt-4">
          <DeleteTagButton id={id} label={tag.label} articleCount={tag.article_count} />
        </div>
      </section>
    </div>
  )
}
