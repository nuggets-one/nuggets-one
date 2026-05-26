export const COLLECTIONS_CURSOR_PARAM = 'n_cursor'

export function collectionsBrowseHref(params: {
  q?: string
  parent?: string
  sub?: string
  cursor?: string
}): { pathname: '/collections'; query: Record<string, string> } {
  const query: Record<string, string> = {}
  const trimmedQ = params.q?.trim()
  if (trimmedQ) query.q = trimmedQ
  if (params.parent) query.parent = params.parent
  if (params.sub) query.sub = params.sub
  if (params.cursor) query[COLLECTIONS_CURSOR_PARAM] = params.cursor
  return { pathname: '/collections', query }
}
