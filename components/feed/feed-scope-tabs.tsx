'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildHomeHref, getScopeLabel, type FeedScope } from '@/lib/feed/scope'
import { useFeedPending } from '@/components/feed/feed-pending-context'
import type { ScopeCounts } from '@/lib/queries/scope-counts'

const SCOPES: FeedScope[] = ['global', 'india']

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type Props = {
  stream: 'standard' | 'pulse' | 'tech_vc'
  activeScope: FeedScope
  scopeCounts: ScopeCounts
  /** Tighter sizing when scope sits on the lg stream toolbar row. */
  inlineToolbar?: boolean
}

function ScopeTabLink({
  href,
  active,
  label,
  formattedCount,
}: {
  href: string
  active: boolean
  label: string
  formattedCount: string
}) {
  const router = useRouter()
  const { markFeedPending } = useFeedPending()

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={`${label}, ${formattedCount} published articles`}
      onClick={(event) => {
        if (active) return
        event.preventDefault()
        markFeedPending()
        router.push(href)
      }}
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
}

export function FeedScopeTabs({
  stream,
  activeScope,
  scopeCounts,
  inlineToolbar = false,
}: Props) {
  return (
    <nav
      aria-label="Content scope"
      className={`flex gap-1 rounded-md bg-rail/60 p-0.5 ${
        inlineToolbar
          ? 'w-auto shrink-0'
          : 'w-full gap-1 sm:inline-flex sm:w-auto'
      }`}
    >
      {SCOPES.map((scope) => {
        const active = activeScope === scope
        const count = scopeCounts[scope]
        const formattedCount = numberFmt.format(count)
        const label = getScopeLabel(scope)
        return (
          <ScopeTabLink
            key={scope}
            href={buildHomeHref(stream, scope)}
            active={active}
            label={label}
            formattedCount={formattedCount}
          />
        )
      })}
    </nav>
  )
}
