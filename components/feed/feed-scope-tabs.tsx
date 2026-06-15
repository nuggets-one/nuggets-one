import Link from 'next/link'
import { buildHomeHref, getScopeLabel, type FeedScope } from '@/lib/feed/scope'
import type { ScopeCounts } from '@/lib/queries/scope-counts'

const SCOPES: FeedScope[] = ['global', 'india']

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type Props = {
  stream: 'standard' | 'pulse'
  activeScope: FeedScope
  scopeCounts: ScopeCounts
}

export function FeedScopeTabs({ stream, activeScope, scopeCounts }: Props) {
  return (
    <nav
      aria-label="Content scope"
      className="flex w-full gap-1 rounded-md bg-rail/60 p-0.5 sm:inline-flex sm:w-auto"
    >
      {SCOPES.map((scope) => {
        const active = activeScope === scope
        const count = scopeCounts[scope]
        const formattedCount = numberFmt.format(count)
        const label = getScopeLabel(scope)
        return (
          <Link
            key={scope}
            href={buildHomeHref(stream, scope)}
            aria-current={active ? 'page' : undefined}
            aria-label={`${label}, ${formattedCount} published articles`}
            className={`flex min-h-[36px] flex-1 items-center justify-center rounded-md px-3 text-xs tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:min-w-[7rem] ${
              active
                ? 'border border-chip-active-border/80 bg-chip-active-bg font-semibold text-chip-active-text shadow-sm'
                : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
            }`}
          >
            <span className="inline-flex items-baseline justify-center gap-1.5">
              <span>{label}</span>
              <span
                className={`hidden font-normal tabular-nums lg:inline ${
                  active ? 'text-chip-active-text/75' : 'text-chip-inactive-text/70'
                }`}
              >
                ({formattedCount})
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
