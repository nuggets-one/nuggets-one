export const OG_DESCRIPTION_MAX_LEN = 155

function truncateAtWordBoundary(value: string, max: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed

  const cut = trimmed.slice(0, max - 1).replace(/\s+\S*$/, '')
  const truncated = (cut || trimmed.slice(0, max - 1)).trimEnd()
  return `${truncated}…`
}

/** Truncate excerpt for og:description / meta description (product §10 ~155 chars). */
export function buildOgDescription(excerpt: string | null | undefined): string | undefined {
  const collapsed = excerpt?.replace(/\s+/g, ' ').trim() ?? ''
  if (!collapsed) return undefined
  return truncateAtWordBoundary(collapsed, OG_DESCRIPTION_MAX_LEN)
}
