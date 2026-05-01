type Props = {
  sourceHost: string
  source_url: string
}

export function CardSourceBadge({ sourceHost, source_url }: Props) {
  return (
    <a
      href={source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open source on ${sourceHost} (opens in new tab)`}
      className="absolute right-2 top-2 z-10 inline-flex max-w-[60%] items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="truncate">{sourceHost}</span>
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 3h7m0 0v7m0-7L10 14M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"
        />
      </svg>
    </a>
  )
}
