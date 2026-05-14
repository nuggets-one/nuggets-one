import { notFound } from 'next/navigation'
import { getLegalPageAdminBySlug } from '@/lib/queries/legal-pages-admin'
import { LegalPageEditorForm } from '@/app/admin/legal-pages/_components/legal-page-editor-form'

type Props = { params: Promise<{ slug: string }> }

export default async function AdminLegalPageEditPage(props: Props) {
  const { slug } = await props.params
  const row = await getLegalPageAdminBySlug(slug)
  if (!row) notFound()

  return <LegalPageEditorForm row={row} />
}
