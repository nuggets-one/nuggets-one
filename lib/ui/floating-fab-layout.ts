import clsx from 'clsx'

export type PlayerDockSide = 'left' | 'right' | 'center'
export type FabColumn = 'left' | 'right'

/** FAB column opposite the mini player dock — avoids overlap. */
export function resolveFabColumn(dockSide: PlayerDockSide | null): FabColumn {
  if (dockSide === 'left') return 'right'
  if (dockSide === 'right') return 'left'
  return 'left'
}

export function fabColumnClassName(column: FabColumn): string {
  return column === 'left' ? 'left-4 right-auto' : 'right-4 left-auto'
}

export function fabBottomClassName(playerVisible: boolean): string {
  return playerVisible
    ? 'max-lg:bottom-[calc(13rem+env(safe-area-inset-bottom))] lg:bottom-[calc(11rem+env(safe-area-inset-bottom))]'
    : 'max-lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]'
}

export const FAB_SHELL_CLASSNAME =
  'fixed z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-panel backdrop-blur transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60'

export function fabPositionClassName(opts: {
  dockSide: PlayerDockSide | null
  playerVisible: boolean
}): string {
  const column = resolveFabColumn(opts.dockSide)
  return clsx(
    FAB_SHELL_CLASSNAME,
    'max-lg:left-4 max-lg:right-auto',
    column === 'left' ? 'lg:left-4 lg:right-auto' : 'lg:right-4 lg:left-auto',
    fabBottomClassName(opts.playerVisible),
  )
}
