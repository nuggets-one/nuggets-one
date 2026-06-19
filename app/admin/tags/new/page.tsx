import { TagCreateForm } from '@/app/admin/tags/_components/tag-create-form'
import { getTagErrorMessage } from '@/app/admin/tags/_components/tag-alerts'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminTagNewPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error
  const errorMessage = getTagErrorMessage(errorCode, 'create')

  return <TagCreateForm errorMessage={errorMessage} />
}
