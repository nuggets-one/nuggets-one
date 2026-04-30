import Image from 'next/image'
import Link from 'next/link'
import type { CollectionSummary } from '@/types/collection'

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
        background: `linear-gradient(135deg, hsl(${hue},35%,82%) 0%, hsl(${(hue + 50) % 360},25%,70%) 100%)`,
      }}
      aria-hidden="true"
    />
  )
}

type Props = {
  collection: CollectionSummary
}

export function CollectionCard({ collection }: Props) {
  const { id, title, description, curator_name, cover_url, entry_count } = collection
  const href = `/collections/${id}`

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-surface overflow-hidden transition-transform duration-150 hover:-translate-y-px hover:shadow-sm focus-within:ring-2 focus-within:ring-accent">
      <Link
        href={href}
        className="relative block aspect-video w-full overflow-hidden bg-surface-raised"
        tabIndex={-1}
        aria-hidden="true"
      >
        {cover_url ? (
          <Image
            src={cover_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
          />
        ) : (
          <GradientPlaceholder id={id} />
        )}
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <Link href={href} className="focus:outline-none">
          <h2 className="text-base font-semibold leading-snug line-clamp-2 text-primary group-hover:text-primary/80 transition-colors">
            {title}
          </h2>
        </Link>

        {description && (
          <p className="text-sm leading-relaxed text-muted line-clamp-1">
            {description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted">
          <span>Curated by {curator_name}</span>
          {entry_count > 0 && (
            <span>{entry_count} {entry_count === 1 ? 'nugget' : 'nuggets'}</span>
          )}
        </div>
      </div>
    </article>
  )
}
