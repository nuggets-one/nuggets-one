import type { TagSummary } from '@/types/article'

const DIMENSION_OPTIONS = [
  { value: '', label: 'None (uncategorized in More filters)' },
  { value: 'format', label: 'Format — Content format' },
  { value: 'domain', label: 'Domain — Subject domain' },
  { value: 'subtopic', label: 'Subtopic' },
  { value: 'source', label: 'Source — Chart/data provider' },
] as const

const inputClassName =
  'mt-1 w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

function DimensionField({ dimension }: { dimension: string }) {
  return (
    <label className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Dimension</span>
      <select name="dimension" defaultValue={dimension} className={inputClassName}>
        {DIMENSION_OPTIONS.map((opt) => (
          <option key={opt.value || 'none'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TagFormFields({
  tag,
}: {
  tag?: Pick<TagSummary, 'label' | 'slug' | 'dimension' | 'is_official'>
}) {
  const dimension = tag?.dimension ?? ''

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${tag ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
        <label className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Label *</span>
          <input
            type="text"
            name="label"
            required
            defaultValue={tag?.label ?? ''}
            placeholder="Fintech"
            className={inputClassName}
          />
        </label>

        {!tag ? <DimensionField dimension={dimension} /> : null}
      </div>

      {tag ? (
        <>
          <label className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Slug</span>
            <input
              type="text"
              name="slug"
              defaultValue={tag.slug}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={`${inputClassName} font-mono`}
            />
            <span className="mt-1 text-xs text-muted">
              Changing the slug updates every nugget that uses this tag. Use lowercase letters,
              numbers, and hyphens only.
            </span>
          </label>
          <DimensionField dimension={dimension} />
        </>
      ) : null}

      <div className="rounded-xl border border-border bg-bg px-4 py-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-primary">
          <input
            type="checkbox"
            name="is_official"
            defaultChecked={tag?.is_official ?? false}
            className="mt-0.5 rounded"
          />
          <span>
            <span className="font-medium">Show on Home chip rail (official)</span>
            <span className="mt-1 block text-xs text-muted">
              Official tags with a dimension appear on the Home quick filter rail and in the article
              editor picker.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}
