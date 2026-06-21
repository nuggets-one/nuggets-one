'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, startTransition } from 'react'
import { createPortal } from 'react-dom'
import { indexOfLightboxImage } from '@/lib/ui/build-lightbox-images'
import {
  IMAGE_GALLERY_OPEN_EVENT,
  type ImageGalleryOpenDetail,
} from '@/lib/ui/image-gallery-open'
import {
  prefetchLightboxImages,
  resolveLightboxImageUrl,
} from '@/lib/ui/lightbox-image-url'
import type { CardImage } from '@/types/article'

type OpenState = {
  title: string
  articleId: string
  detailHref: string
  sourceUrl: string | null
  sourceHost: string | null
  images: CardImage[]
  initialIndex: number
}

function CloseCrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  )
}

function neighborIndexes(current: number, total: number): number[] {
  if (total <= 1) return [current]
  const wrap = (i: number) => (i + total) % total
  return [wrap(current - 2), wrap(current - 1), current, wrap(current + 1), wrap(current + 2)]
}

async function resolveGalleryImages(detail: ImageGalleryOpenDetail): Promise<CardImage[]> {
  const preview = detail.images ?? []
  const total = detail.totalImageCount ?? preview.length
  if (preview.length > 0 && preview.length >= total) {
    return preview
  }
  const res = await fetch(`/api/nuggets/${encodeURIComponent(detail.articleId)}/gallery-images`)
  if (!res.ok) {
    if (preview.length > 0) return preview
    throw new Error('Failed to load gallery')
  }
  const json = (await res.json()) as { images?: CardImage[] }
  return json.images?.length ? json.images : preview
}

export function GlobalImageLightbox() {
  const [open, setOpen] = useState<OpenState | null>(null)
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(null)
    setIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<ImageGalleryOpenDetail>).detail
      if (!detail?.articleId || !detail.clickedUrl) return

      setLoading(true)
      setOpen(null)

      void (async () => {
        try {
          const images = await resolveGalleryImages(detail)
          if (images.length === 0) return
          const initialIndex = indexOfLightboxImage(images, detail.clickedUrl)
          setOpen({
            title: detail.title,
            articleId: detail.articleId,
            detailHref: detail.detailHref?.trim() || `/nuggets/${detail.articleId}`,
            sourceUrl: detail.sourceUrl?.trim() || null,
            sourceHost: detail.sourceHost?.trim() || null,
            images,
            initialIndex,
          })
          setIndex(initialIndex)
          prefetchLightboxImages(images.map((img) => img.url))
        } catch {
          /* no gallery */
        } finally {
          setLoading(false)
        }
      })()
    }

    window.addEventListener(IMAGE_GALLERY_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(IMAGE_GALLERY_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const urls = neighborIndexes(index, open.images.length).map((i) => open.images[i]?.url ?? '')
    prefetchLightboxImages(urls)
  }, [open, index])

  const goPrev = useCallback(() => {
    if (!open) return
    setIndex((i) => (i <= 0 ? open.images.length - 1 : i - 1))
  }, [open])

  const goNext = useCallback(() => {
    if (!open) return
    setIndex((i) => (i >= open.images.length - 1 ? 0 : i + 1))
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault()
        close()
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault()
        goPrev()
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close, goPrev, goNext])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (typeof document === 'undefined') return null

  const showShell = loading || open
  if (!showShell) return null

  const total = open?.images.length ?? 0
  const dialogLabel = open?.title.trim()
    ? `Image gallery: ${open.title}`
    : 'Image gallery'
  const showSource = Boolean(open?.sourceUrl)

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[110] flex flex-col bg-black/95"
    >
      {loading && !open ? (
        <div
          className="flex flex-1 items-center justify-center text-sm text-white/70"
          aria-live="polite"
        >
          Loading…
        </div>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          className="relative flex min-h-0 flex-1 flex-col"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current
            touchStartX.current = null
            if (start == null || total <= 1) return
            const end = e.changedTouches[0]?.clientX
            if (end == null) return
            const dx = end - start
            if (dx > 48) goPrev()
            else if (dx < -48) goNext()
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="min-w-0 truncate text-sm font-medium text-white/90">
              {open.title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {total > 1 ? (
                <span className="tabular-nums text-sm text-white/70">
                  {index + 1} / {total}
                </span>
              ) : null}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close gallery"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <CloseCrossIcon />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 sm:px-16">
            {total > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:left-4"
              >
                <ChevronIcon direction="left" />
              </button>
            ) : null}

            <div className="relative h-full w-full max-h-[min(78dvh,900px)] max-w-6xl">
              <LightboxCarousel
                images={open.images}
                activeIndex={index}
                title={open.title}
              />
            </div>

            {total > 1 ? (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-4"
              >
                <ChevronIcon direction="right" />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <Link
              href={open.detailHref}
              onClick={close}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              View article
            </Link>
            {showSource && open.sourceUrl ? (
              <a
                href={open.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                {open.sourceHost ? `Source: ${open.sourceHost}` : 'Source'}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

/** Keep slides mounted so next/prev reuse browser cache; native img avoids per-nav optimizer delay. */
function LightboxCarousel({
  images,
  activeIndex,
  title,
}: {
  images: CardImage[]
  activeIndex: number
  title: string
}) {
  return (
    <div className="relative h-full w-full">
      {images.map((img, i) => (
        <LightboxSlide
          key={img.url}
          url={img.url}
          alt={img.alt ?? title}
          isActive={i === activeIndex}
        />
      ))}
    </div>
  )
}

function LightboxSlide({
  url,
  alt,
  isActive,
}: {
  url: string
  alt: string
  isActive: boolean
}) {
  const resolvedUrl = resolveLightboxImageUrl(url)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    startTransition(() => {
      setLoaded(false)
      const img = imgRef.current
      if (img?.complete && img.naturalWidth > 0) {
        setLoaded(true)
      }
    })
  }, [resolvedUrl])

  if (!resolvedUrl) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center text-sm text-white/60 ${
          isActive ? '' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!isActive}
      >
        Preview unavailable
      </div>
    )
  }

  return (
    <div
      key={resolvedUrl}
      className={`absolute inset-0 transition-opacity duration-200 ${
        isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isActive}
    >
      {!loaded && isActive ? (
        <div
          className="absolute inset-0 animate-pulse bg-white/10"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={resolvedUrl}
        alt={alt}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => {
          requestAnimationFrame(() => setLoaded(true))
        }}
      />
    </div>
  )
}
