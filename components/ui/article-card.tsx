import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryLoader } from '@/lib/cloudinary'
import type { ArticleCardProps } from '@/types/article'

function idToHue(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 360
}

function GradientPlaceholder({ id }: { id: string }) {
  const hue = idToHue(id)
  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},40%,85%) 0%, hsl(${(hue + 40) % 360},30%,75%) 100%)`,
      }}
      aria-hidden="true"
    />
  )
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

type Props = {
  article: ArticleCardProps
  priority?: boolean
}

export function ArticleCard({ article, priority = false }: Props) {
  const {
    id,
    slug,
    title,
    excerpt,
    content_stream,
    published_at,
    hero_thumb_url,
    hero_alt_text,
    tag_slugs,
    source_url,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const primaryTag = tag_slugs[0] ?? null

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-surface overflow-hidden transition-transform duration-150 hover:-translate-y-px hover:shadow-sm focus-within:ring-2 focus-within:ring-accent">
      {/* Media block — fixed 16:9 aspect, no CLS */}
      <Link
        href={href}
        className="relative block aspect-video w-full overflow-hidden bg-surface-raised"
        tabIndex={-1}
        aria-hidden="true"
      >
        {hero_thumb_url ? (
          <Image
            loader={cloudinaryLoader}
            src={hero_thumb_url}
            alt={hero_alt_text ?? title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
            priority={priority}
          />
        ) : (
          <GradientPlaceholder id={id} />
        )}
      </Link>

      {/* Text region */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className={`rounded-full px-2 py-0.5 font-medium ${
            content_stream === 'pulse'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}>
            {content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
          </span>
          {primaryTag && (
            <span className="truncate text-muted">{primaryTag}</span>
          )}
          <span className="ml-auto shrink-0">{formatDate(published_at)}</span>
        </div>

        {/* Title */}
        <Link href={href} className="focus:outline-none">
          <h2 className="text-base font-semibold leading-snug line-clamp-2 text-primary group-hover:text-primary/80 transition-colors">
            {title}
          </h2>
        </Link>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-sm leading-relaxed text-muted line-clamp-3 lg:line-clamp-4">
            {excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-2 flex items-center gap-3 text-xs">
          {source_url && (
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-primary transition-colors min-h-[44px] flex items-center"
            >
              View source ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
