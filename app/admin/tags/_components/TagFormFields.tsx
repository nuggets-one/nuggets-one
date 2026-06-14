import type { TagSummary } from '@/types/article'

const DIMENSION_OPTIONS = [
  { value: '', label: 'None (uncategorized in More filters)' },
  { value: 'format', label: 'Format — Content format' },
  { value: 'domain', label: 'Domain — Subject domain' },
  { value: 'subtopic', label: 'Subtopic' },
  { value: 'source', label: 'Source — Chart/data provider' },
] as const

export function TagFormFields({ tag }: { tag?: Pick<TagSummary, 'label' | 'slug' | 'dimension' | 'is_official'> }) {
  const dimension = tag?.dimension ?? ''

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Label *</span>
        <input
          type="text"
          name="label"
          required
          defaultValue={tag?.label ?? ''}
          placeholder="Fintech"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      {tag ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Slug</span>
          <input
            type="text"
            name="slug"
            defaultValue={tag.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-xs text-muted">
            Changing the slug updates every nugget that uses this tag. Use lowercase letters, numbers, and hyphens
            only.
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Dimension</span>
        <select
          name="dimension"
          defaultValue={dimension}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        >
          {DIMENSION_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
        <input
          type="checkbox"
          name="is_official"
          defaultChecked={tag?.is_official ?? false}
          className="rounded"
        />
        Show on Home chip rail (official)
      </label>
    </>
  )
}
