// S1-F1: moved from new/page.tsx — page files must only export the default page
// component plus Next.js-approved named exports (metadata, generateMetadata, etc.).

export type ArticleFormDefaults = {
  id?: string
  title?: string
  excerpt?: string | null
  content_markdown?: string | null
  content_stream?: string
  source_url?: string | null
  hero_thumb_url?: string | null
  hero_alt_text?: string | null
  tag_slugs?: string[]
}

export function ArticleFormFields({ defaults }: { defaults?: ArticleFormDefaults }) {
  return (
    <>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Title *</span>
        <input
          type="text"
          name="title"
          required
          defaultValue={defaults?.title ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Stream</span>
        <select
          name="content_stream"
          defaultValue={defaults?.content_stream ?? 'standard'}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="standard">Nuggets (standard)</option>
          <option value="pulse">Market Pulse (pulse)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Excerpt</span>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={defaults?.excerpt ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40 resize-y"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Content (Markdown)</span>
        <textarea
          name="content_markdown"
          rows={16}
          defaultValue={defaults?.content_markdown ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary font-mono outline-none focus:ring-2 focus:ring-accent/40 resize-y"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Source URL</span>
        <input
          type="url"
          name="source_url"
          defaultValue={defaults?.source_url ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Hero image URL (Cloudinary)</span>
        <input
          type="url"
          name="hero_thumb_url"
          defaultValue={defaults?.hero_thumb_url ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Hero alt text</span>
        <input
          type="text"
          name="hero_alt_text"
          defaultValue={defaults?.hero_alt_text ?? ''}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">Tags (comma-separated slugs)</span>
        <input
          type="text"
          name="tag_slugs"
          defaultValue={defaults?.tag_slugs?.join(', ') ?? ''}
          placeholder="fintech, crypto, markets"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
    </>
  )
}
