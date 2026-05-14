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
      className="flex min-h-[44px] w-full sm:inline-flex sm:w-auto sm:gap-8"
    >
      {STREAMS.map(({ value, label, href }) => {
        const active = activeStream === value
        return (
          <Link
            key={value}
            href={href}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] flex-1 items-center justify-center border-b-2 px-2 text-sm font-semibold tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:justify-start sm:px-0 sm:pb-2.5 sm:pt-2 ${
              active
                ? 'border-accent text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
