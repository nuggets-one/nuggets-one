'use client'

import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { resolveCardPreviewDisplayUrl } from '@/lib/ui/card-preview-display-url'

type Props = {
  url: string
  className?: string
}

function NoPreviewTile() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg text-[10px] font-medium text-muted">
      No preview
    </div>
  )
}

/** Admin thumbnail / cover preview — same proxy path as feed CardMedia. */
export function AdminCardImagePreview({ url, className = 'h-full w-full object-cover' }: Props) {
  const displayUrl = resolveCardPreviewDisplayUrl(url)

  if (!displayUrl) {
    return <NoPreviewTile />
  }

  return (
    <div className="relative h-full w-full">
      <CardMediaRaster src={displayUrl} alt="" priority={false} fit="cover" />
    </div>
  )
}
