import Image from 'next/image'
import { resolveAdminArticleThumb } from '@/app/admin/articles/_lib/resolve-admin-thumb'
import type { AdminArticleRow } from '@/lib/queries/articles-admin'

type Props = {
  row: AdminArticleRow
  size?: 'sm' | 'md'
}

export function ArticleRowThumbnail({ row, size = 'sm' }: Props) {
  const { url, alt } = resolveAdminArticleThumb(row)
  const dimensions = size === 'sm' ? 'h-9 w-12' : 'h-14 w-[4.5rem]'

  if (!url) {
    return (
      <div
        className={`${dimensions} shrink-0 rounded border border-border bg-surface-raised`}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className={`relative ${dimensions} shrink-0 overflow-hidden rounded border border-border bg-surface-raised`}>
      <Image
        src={url}
        alt={alt}
        fill
        sizes={size === 'sm' ? '48px' : '72px'}
        className="object-cover"
        quality={75}
      />
    </div>
  )
}
