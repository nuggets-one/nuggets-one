import Link from 'next/link'
import type { ContentStream } from '@/types/article'

const STREAMS: { value: ContentStream; label: string; href: string }[] = [
  { value: 'standard', label: 'Nuggets', href: '/?stream=standard' },
  { value: 'pulse', label: 'Market Pulse', href: '/?stream=pulse' },
]

type Props = {
  activeStream: ContentStream
}

export function StreamTabs({ activeStream }: Props) {
  return (
    <nav
      aria-label="Content stream"
      className="flex w-full gap-1 rounded-lg bg-rail p-1 sm:inline-flex sm:w-auto"
    >
      {STREAMS.map(({ value, label, href }) => {
        const active = activeStream === value
        return (
          <Link
            key={value}
            href={href}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:px-5 ${
              active
                ? 'border border-chip-active-border bg-chip-active-bg font-semibold text-chip-active-text shadow-chip-active'
                : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
