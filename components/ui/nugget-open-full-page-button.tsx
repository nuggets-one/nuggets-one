import Link from 'next/link'

type Props = {
  href: string
}

function ExpandPageIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
      />
    </svg>
  )
}

/** Sheet-only link to the canonical full-page nugget shell (opens in a new tab). */
export function NuggetOpenFullPageButton({ href }: Props) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View full page for this nugget"
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-transparent px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <ExpandPageIcon />
      <span>View full page</span>
    </Link>
  )
}
