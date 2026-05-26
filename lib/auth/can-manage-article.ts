/**
 * True when the signed-in user created the article (articles.created_by).
 * Used for owner-only manage UI on public detail surfaces.
 */
export function canUserManageArticle(
  userId: string | null | undefined,
  createdBy: string | null
): boolean {
  return !!userId && !!createdBy && userId === createdBy
}

/** Admin or article owner — for Edit/Delete on public detail surfaces. */
export function canManageArticle(
  userId: string | null | undefined,
  createdBy: string | null,
  isAdmin: boolean
): boolean {
  return isAdmin || canUserManageArticle(userId, createdBy)
}

const ALLOWED_DELETE_REDIRECTS = new Set(['/', '/bookmarks'])

/** Allowlisted post-delete redirects from public detail surfaces. */
export function sanitizeDeleteRedirectTo(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (ALLOWED_DELETE_REDIRECTS.has(trimmed)) {
    return trimmed
  }
  return '/'
}
