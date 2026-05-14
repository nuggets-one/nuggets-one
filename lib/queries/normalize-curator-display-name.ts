/** Normalize `articles.curator_display_name` from PostgREST (null / empty → null). */
export function normalizeCuratorDisplayNameOnRow<T extends Record<string, unknown>>(
  row: T
): T & { curator_display_name: string | null } {
  const c = row.curator_display_name
  const curator_display_name =
    typeof c === 'string' && c.trim() ? c.trim() : null
  return { ...row, curator_display_name }
}

export function normalizeCuratorDisplayNameOnRows<T extends Record<string, unknown>>(
  rows: T[]
): Array<T & { curator_display_name: string | null }> {
  return rows.map(normalizeCuratorDisplayNameOnRow)
}
