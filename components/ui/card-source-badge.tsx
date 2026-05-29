'use client'

function SourceExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

type Props = {
  href: string
  /** Used for accessible name only (hostname). */
  label?: string | null
}

/**
 * External source chip — top-right on card media (replication spec §6).
 * Matches YouTube feed hero styling: icon + “Source”, dark pill, stopPropagation.
 */
export function CardSourceBadge({ href, label }: Props) {
  const ariaLabel = label?.trim()
    ? `Open source on ${label} (opens in new tab)`
    : 'Open source in new tab'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
    >
      <SourceExternalLinkIcon />
      <span>Source</span>
    </a>
  )
}
