import type { CollectionAdminRow } from '@/lib/queries/collections-admin'

type RootTopic = { id: string; title: string }

type Props = {
  collection?: Pick<
    CollectionAdminRow,
    | 'title'
    | 'description'
    | 'curator_name'
    | 'cover_image_url'
    | 'status'
    | 'parent_id'
    | 'is_featured'
    | 'featured_order'
  >
  rootTopics: RootTopic[]
  selfId?: string
}

export function CollectionFormFields({ collection, rootTopics, selfId }: Props) {
  const parentOptions = rootTopics.filter((t) => t.id !== selfId)

  return (
    <div className="grid gap-4 max-w-2xl">
      <label className="block text-sm">
        <span className="font-medium text-primary">Title *</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={collection?.title ?? ''}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-primary">Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={collection?.description ?? ''}
          placeholder="One line shown on the collections grid"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-primary">Parent topic</span>
        <select
          name="parent_id"
          defaultValue={collection?.parent_id ?? 'none'}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        >
          <option value="none">None (top-level topic)</option>
          {parentOptions.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          Sub-collections appear under their parent on the public site. Two levels only.
        </p>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-primary">Curator name *</span>
        <input
          name="curator_name"
          type="text"
          required
          defaultValue={collection?.curator_name ?? 'Nuggets'}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-primary">Cover image URL</span>
        <input
          name="cover_image_url"
          type="url"
          defaultValue={collection?.cover_image_url ?? ''}
          placeholder="Optional — leave empty to use first nugget hero"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        />
      </label>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_featured"
            type="checkbox"
            defaultChecked={collection?.is_featured ?? false}
            className="rounded border-border"
          />
          <span className="font-medium text-primary">Featured root topic</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-primary">Featured order</span>
          <input
            name="featured_order"
            type="number"
            min={0}
            max={999}
            defaultValue={collection?.featured_order ?? ''}
            placeholder="Optional"
            className="mt-1 w-24 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-primary">Status</span>
        <select
          name="status"
          defaultValue={collection?.status ?? 'draft'}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary"
        >
          <option value="draft">Draft (hidden on /collections)</option>
          <option value="published">Published (visible on /collections)</option>
        </select>
      </label>
    </div>
  )
}
