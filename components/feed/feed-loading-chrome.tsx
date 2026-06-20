type Props = {
  /** When true, show condensed mobile intro skeleton alongside desktop intro. */
  skimView?: boolean
}

/** Stream tabs, filter rail, and intro placeholders for feed loading states. */
export function FeedLoadingChrome({ skimView = false }: Props) {
  return (
    <div className="-mx-4 -mt-6 mb-3 sm:mb-4 lg:mb-5 lg:-mx-6">
      <div className="hidden min-h-[44px] border-b border-border bg-header px-4 pt-2 backdrop-blur-sm lg:block lg:px-6">
        <div className="flex h-11 w-full gap-1 sm:inline-flex sm:w-auto lg:w-[32rem]">
          <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-24 lg:flex-1 lg:basis-0 lg:min-w-0" />
          <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-36 lg:flex-1 lg:basis-0 lg:min-w-0" />
          <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-28 lg:flex-1 lg:basis-0 lg:min-w-0" />
        </div>
      </div>
      <section className="sticky top-[var(--header-height)] z-40 min-h-[88px] border-b border-border bg-rail/95 backdrop-blur-sm">
        <div className="space-y-3 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="h-9 w-16 animate-pulse rounded-full bg-surface-raised/70" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-surface-raised/70" />
          </div>
          <div className="h-4 w-48 animate-pulse rounded bg-border/35" />
        </div>
      </section>
      <div className="space-y-1.5 px-4 pb-0.5 pt-2 lg:px-6">
        {skimView ? (
          <div className="h-3.5 w-40 animate-pulse rounded bg-border/30 md:hidden" />
        ) : null}
        <div className={skimView ? 'hidden md:block' : undefined}>
          <div className="h-5 max-w-[62ch] animate-pulse rounded bg-border/35 lg:max-w-none" />
          <div className="mt-0.5 h-3.5 max-w-[62ch] animate-pulse rounded bg-border/30 lg:max-w-none" />
          <div className="mt-1.5 h-3.5 w-40 animate-pulse rounded bg-border/30" />
        </div>
      </div>
    </div>
  )
}
