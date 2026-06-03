'use client'

import { deleteTagAction } from '@/lib/actions/admin'

export function DeleteTagButton({
  id,
  label,
  articleCount,
}: {
  id: string
  label: string
  articleCount: number
}) {
  const nuggetNote =
    articleCount === 0
      ? 'No nuggets use this tag.'
      : `${articleCount} nugget${articleCount === 1 ? '' : 's'} will lose this tag and feed filters will be updated.`

  return (
    <form
      action={deleteTagAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete tag "${label}"? ${nuggetNote} This cannot be undone.`
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg border border-danger-border text-danger-fg text-sm font-medium hover:bg-danger-soft transition-colors"
      >
        Delete tag
      </button>
    </form>
  )
}
