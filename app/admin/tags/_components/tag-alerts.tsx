const TAG_ERRORS: Record<string, string> = {
  missing_label: 'Label is required.',
  invalid_slug: 'Could not derive a valid slug from that label. Use letters or numbers.',
  invalid_dimension: 'That dimension is not supported.',
  duplicate_slug:
    'A tag with this slug already exists. Edit the existing tag instead of creating a duplicate.',
  dimension_not_supported:
    'The database does not accept the Source dimension yet. Apply migration 20240001000027_tag_dimension_source.sql, then retry.',
  not_found: 'Tag not found.',
  save_failed: 'Could not save the tag. Please try again.',
}

export function getTagErrorMessage(
  code: string | undefined,
  context: 'create' | 'edit' = 'create'
): string | null {
  if (!code) return null
  if (code === 'invalid_slug' && context === 'edit') {
    return 'Slug must use lowercase letters, numbers, and hyphens only.'
  }
  if (code === 'duplicate_slug' && context === 'edit') {
    return 'Another tag already uses that slug.'
  }
  return TAG_ERRORS[code] ?? 'Something went wrong. Please try again.'
}

export function TagErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg"
    >
      {message}
    </div>
  )
}

export function TagSuccessAlert({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-fg"
    >
      {message}
    </div>
  )
}
