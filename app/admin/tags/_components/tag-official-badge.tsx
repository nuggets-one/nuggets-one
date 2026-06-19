export function TagOfficialBadge({
  isOfficial,
  compact = false,
}: {
  isOfficial: boolean
  compact?: boolean
}) {
  if (isOfficial) {
    const sizeClass = compact
      ? 'rounded px-1 py-0 text-[10px] leading-4'
      : 'rounded-full px-2 py-0.5 text-xs'

    return (
      <span
        className={`inline-flex font-medium bg-accent/15 text-accent ${sizeClass}`}
      >
        ✓
      </span>
    )
  }

  return <span className={compact ? 'text-[11px] text-muted' : 'text-xs text-muted'}>—</span>
}
