import { CollectionCreateForm } from '@/app/admin/collections/_components/collection-create-form'
import { listRootCollectionsAdmin } from '@/lib/queries/collections-admin'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCollectionNewPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const err = typeof params.error === 'string' ? params.error : undefined
  const rootTopics = await listRootCollectionsAdmin()

  return <CollectionCreateForm errorMessage={err} rootTopics={rootTopics} />
}
