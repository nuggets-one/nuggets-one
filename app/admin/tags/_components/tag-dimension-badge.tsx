import type { TagDimension } from '@/types/article'

const DIMENSION_LABELS: Record<TagDimension, string> = {
  format: 'Format',
  domain: 'Domain',
  subtopic: 'Subtopic',
  source: 'Source',
}

const DIMENSION_STYLES: Record<TagDimension, string> = {
  format: 'bg-accent/15 text-accent',
  domain: 'bg-surface-raised text-primary ring-1 ring-inset ring-border',
  subtopic: 'bg-surface text-muted ring-1 ring-inset ring-border',
  source: 'bg-accent-soft text-accent-emphasis',
}

export function TagDimensionBadge({
  dimension,
  compact = false,
}: {
  dimension: TagDimension | null | undefined
  compact?: boolean
}) {
  if (!dimension) {
    return <span className={compact ? 'text-[11px] text-muted' : 'text-muted'}>—</span>
  }

  const sizeClass = compact
    ? 'rounded px-1 py-0 text-[10px] leading-4'
    : 'rounded-full px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex font-medium ${sizeClass} ${DIMENSION_STYLES[dimension]}`}
    >
      {DIMENSION_LABELS[dimension]}
    </span>
  )
}

export function getDimensionLabel(dimension: TagDimension | null): string {
  if (!dimension) return 'Uncategorized'
  return DIMENSION_LABELS[dimension]
}
