type Props = {
  errorKey?: string
  successKey?: string
  bulkAdded?: boolean
  added?: number
  skipped?: number
}

export function AdminArticlesAlerts({
  errorKey,
  successKey,
  bulkAdded,
  added = 0,
  skipped = 0,
}: Props) {
  if (errorKey) {
    const msg =
      errorKey === 'delete_failed'
        ? 'Could not delete this nugget. Please try again.'
        : errorKey === 'already_in_collection'
          ? 'That nugget is already in the selected community collection.'
          : errorKey === 'not_published'
            ? 'Only published nuggets can be added to community collections.'
            : errorKey === 'bulk_lookup_failed'
              ? 'Bulk add failed while looking up articles.'
              : errorKey === 'bulk_insert_failed'
                ? 'Bulk add failed while saving collection entries.'
                : errorKey

    return (
      <div
        role="alert"
        className="mb-5 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg"
      >
        {msg}
      </div>
    )
  }

  if (successKey === 'deleted') {
    return (
      <div
        role="status"
        className="mb-5 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-fg"
      >
        Nugget deleted.
      </div>
    )
  }

  if (successKey === 'added_to_collection') {
    return (
      <div
        role="status"
        className="mb-5 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary"
      >
        Nugget added to community collection.
      </div>
    )
  }

  if (bulkAdded) {
    return (
      <div
        role="status"
        className="mb-5 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary"
      >
        Bulk add complete: added {added}, skipped {skipped}.
      </div>
    )
  }

  return null
}
