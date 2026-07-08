import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  layout?: 'end' | 'split'
}

export function AdminFormActionBar({ children, layout = 'end' }: Props) {
  const layoutClass =
    layout === 'split'
      ? 'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'
      : 'flex items-center justify-end gap-3'

  return (
    <div
      data-testid="admin-form-action-bar"
      className={`sticky bottom-0 z-20 mt-6 rounded-t-2xl border border-border border-b-0 bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-panel backdrop-blur ${layoutClass}`}
    >
      {children}
    </div>
  )
}

/** Reserve scroll space so the last form field is not hidden behind the sticky action bar. */
export function AdminFormBottomSpacer() {
  return (
    <div
      aria-hidden
      className="h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0"
    />
  )
}
