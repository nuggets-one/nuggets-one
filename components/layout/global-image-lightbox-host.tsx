'use client'

import dynamic from 'next/dynamic'

const GlobalImageLightbox = dynamic(
  () =>
    import('@/components/ui/global-image-lightbox').then((m) => ({
      default: m.GlobalImageLightbox,
    })),
  { ssr: false },
)

/**
 * Lazy-loads the image lightbox chunk after hydration (detail + future feed).
 */
export function GlobalImageLightboxHost() {
  return <GlobalImageLightbox />
}
