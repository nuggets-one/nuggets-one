import { getConsumerDisclaimer } from '@/lib/queries/site-settings'
import { SiteCopyEditorForm } from '@/app/admin/site-copy/_components/site-copy-editor-form'

export default async function AdminSiteCopyPage() {
  const initialDisclaimer = await getConsumerDisclaimer()

  return <SiteCopyEditorForm initialDisclaimer={initialDisclaimer} />
}
