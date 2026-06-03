import { getConsumerDisclaimer, getPushDigestIntervalHours } from '@/lib/queries/site-settings'
import { SiteCopyEditorForm } from '@/app/admin/site-copy/_components/site-copy-editor-form'

export default async function AdminSiteCopyPage() {
  const [initialDisclaimer, initialDigestIntervalHours] = await Promise.all([
    getConsumerDisclaimer(),
    getPushDigestIntervalHours(),
  ])

  return (
    <SiteCopyEditorForm
      initialDisclaimer={initialDisclaimer}
      initialDigestIntervalHours={initialDigestIntervalHours}
    />
  )
}
