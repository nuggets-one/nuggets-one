'use client'

import { useMemo, useRef, useState, type ClipboardEvent, type MouseEvent } from 'react'
import { AdminCardImagePreview } from './admin-card-image-preview'
import { CardCoverPreviewPanel } from './card-cover-preview'
import { hasCloudinaryCloudName } from '@/lib/ui/cloudinary-fetch'
import { isYouTubeUrl } from '@/lib/ui/excerpt-card'
import { isImageUrl } from '@/lib/ui/is-image-url'
import { convertClipboardHtmlToMarkdown } from '@/lib/markdown/html-clipboard-to-markdown'
import { describeCardCoverPreview, resolveArticleHeroFields } from '@/lib/ui/resolve-article-hero'
import { parseAdminMediaUrlList } from '@/lib/ui/parse-admin-media-urls'
import { parseContentStream } from '@/lib/copy/streams'
import { inferContentStreamFromTags, validateStreamTagMembership } from '@/lib/feed/stream-membership'
import type { ContentStream, TagDimension, TagSummary } from '@/types/article'

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
  media_urls?: string[]
}

type TagOption = Pick<TagSummary, 'id' | 'slug' | 'label' | 'dimension'>

const TAG_GROUPS: Array<{ key: TagDimension; label: string; color: string }> = [
  { key: 'format', label: 'FORMAT', color: 'text-blue-500' },
  { key: 'domain', label: 'DOMAIN', color: 'text-emerald-500' },
  { key: 'subtopic', label: 'SUB-TOPIC', color: 'text-amber-500' },
  { key: 'source', label: 'SOURCE', color: 'text-violet-500' },
]

export function ArticleFormFields({
  defaults,
  tags = [],
}: {
  defaults?: ArticleFormDefaults
  tags?: TagOption[]
}) {
  const initialTagSlugs = defaults?.tag_slugs ?? []
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(initialTagSlugs)
  const selectedTags = useMemo(() => new Set(selectedTagSlugs), [selectedTagSlugs])
  const initialStream = parseContentStream(defaults?.content_stream ?? null)
  const [contentStream, setContentStream] = useState<ContentStream>(initialStream)
  const initialMediaUrls = defaults?.media_urls?.length
    ? defaults.media_urls
    : defaults?.hero_thumb_url
      ? [defaults.hero_thumb_url]
      : []
  const [sourceUrl, setSourceUrl] = useState(defaults?.source_url ?? '')
  const [mediaUrlsValue, setMediaUrlsValue] = useState(initialMediaUrls.join('\n'))
  const [thumbnailUrl, setThumbnailUrl] = useState(defaults?.hero_thumb_url ?? initialMediaUrls[0] ?? '')
  const [body, setBody] = useState(defaults?.content_markdown ?? '')
  const [pasteStatus, setPasteStatus] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const mediaPreviewUrls = useMemo(() => parseUrls(mediaUrlsValue), [mediaUrlsValue])
  const effectiveThumbnailUrl = mediaPreviewUrls.includes(thumbnailUrl)
    ? thumbnailUrl
    : mediaPreviewUrls[0] ?? ''

  const cardCoverPreview = useMemo(() => {
    const resolved = resolveArticleHeroFields({
      source_url: sourceUrl.trim() || null,
      hero_thumb_url: effectiveThumbnailUrl || null,
      media_urls: parseAdminMediaUrlList(mediaUrlsValue),
    })
    return describeCardCoverPreview(resolved)
  }, [sourceUrl, effectiveThumbnailUrl, mediaUrlsValue])

  const sourceIsYouTube = isYouTubeUrl(sourceUrl.trim() || null)
  const showCloudinaryEnvWarning =
    !hasCloudinaryCloudName() &&
    parseAdminMediaUrlList(mediaUrlsValue).some((url) => isImageUrl(url) && !isYouTubeUrl(url))

  function handleTagToggle(slug: string, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedTagSlugs, slug])]
      : selectedTagSlugs.filter((value) => value !== slug)
    setSelectedTagSlugs(next)
    const inferred = inferContentStreamFromTags(next)
    if (inferred) {
      setContentStream(inferred)
    } else if (!validateStreamTagMembership(contentStream, next)) {
      setContentStream('standard')
    }
  }

  return (
    <div className="space-y-4 py-1">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="hero_thumb_url" value={effectiveThumbnailUrl} />
      <input type="hidden" name="hero_alt_text" value={defaults?.hero_alt_text ?? ''} />

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Source URL</span>
            <input
              type="url"
              name="source_url"
              placeholder="https://example.com/article or YouTube link"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <p className="text-[11px] leading-snug text-muted">
              Outbound link on the card (View Source). For podcasts and videos, paste the YouTube URL here — we
              use it as the feed cover and detail player.
            </p>
            {sourceIsYouTube ? (
              <p className="text-[11px] font-medium text-primary">YouTube detected — card cover will use the video poster.</p>
            ) : null}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Stream</span>
            <div className="flex min-h-[42px] w-fit flex-wrap items-center gap-1 rounded-xl border border-border bg-rail/60 p-1">
              <SegmentedRadio name="content_stream" value="standard" label="Standard" checked={contentStream === 'standard'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="pulse" label="Pulse" checked={contentStream === 'pulse'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="charts" label="Charts" checked={contentStream === 'charts'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="tech_vc" label="Tech x VC" checked={contentStream === 'tech_vc'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="geopolitics" label="Geopolitics" checked={contentStream === 'geopolitics'} onSelect={setContentStream} />
            </div>
            <p className="text-[11px] leading-snug text-muted">
              Tech x VC and Geopolitics require matching tags. If both apply, Geopolitics wins.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Card images (optional)</span>
            <textarea
              name="media_urls"
              rows={2}
              value={mediaUrlsValue}
              onChange={(event) => setMediaUrlsValue(event.target.value)}
              placeholder="Image URLs — one per line (or comma between URLs). Not YouTube links."
              className="w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <p className="text-[11px] leading-snug text-muted">
              Optional images for the feed card gallery. Pick one as the card cover below. YouTube covers come from
              Source URL, not this field.
            </p>
          </label>
        </div>

        <CardCoverPreviewPanel
          preview={cardCoverPreview}
          showCloudinaryEnvWarning={showCloudinaryEnvWarning}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Title</span>
            <input
              type="text"
              name="title"
              required
              placeholder="Enter a title for your nugget..."
              defaultValue={defaults?.title ?? ''}
              className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="flex flex-col gap-1.5 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Excerpt</span>
            <textarea
              name="excerpt"
              rows={2}
              placeholder="Optional card summary..."
              defaultValue={defaults?.excerpt ?? ''}
              className="resize-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Classification Tags</p>
          <div className="space-y-2">
            {TAG_GROUPS.map((group) => {
              const groupTags = tags.filter((tag) => tag.dimension === group.key)
              if (groupTags.length === 0) return null
              return (
                <TagGroup
                  key={group.key}
                  label={group.label}
                  labelClassName={group.color}
                  tags={groupTags}
                  selectedTags={selectedTags}
                  onToggle={handleTagToggle}
                />
              )
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-sm text-muted">
          <span className="text-xs font-semibold uppercase tracking-wide">Markdown Body</span>
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton label="B" title="Bold" onClick={() => applyMarkdown('bold')} />
            <ToolbarButton label="I" title="Italic" onClick={() => applyMarkdown('italic')} />
            <ToolbarButton label="H1" title="Heading 1" onClick={() => applyMarkdown('h1')} />
            <ToolbarButton label="H2" title="Heading 2" onClick={() => applyMarkdown('h2')} />
            <ToolbarButton label="List" title="Bullet list" onClick={() => applyMarkdown('list')} />
            <ToolbarButton label="Quote" title="Quote" onClick={() => applyMarkdown('quote')} />
            <ToolbarButton label="Code" title="Inline code" onClick={() => applyMarkdown('code')} />
            <ToolbarButton label="Link" title="Link" onClick={() => applyMarkdown('link')} />
          </div>
        </div>
        <textarea
          ref={bodyRef}
          name="content_markdown"
          rows={20}
          placeholder="Share an insight, observation, or paste content..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onPaste={handleBodyPaste}
          className="min-h-[min(50vh,36rem)] max-h-[75vh] w-full resize-y overflow-y-auto border-0 bg-surface-raised px-4 py-4 font-mono text-sm text-primary outline-none placeholder:text-muted focus:ring-0"
        />
      </section>

      {pasteStatus && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{pasteStatus}</p>
      )}

      {mediaPreviewUrls.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-semibold text-primary">Card images ({mediaPreviewUrls.length})</p>
            <p className="text-xs text-muted">
              Choose which image is the feed card cover. Order follows the list in Card images above.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {mediaPreviewUrls.map((url, index) => (
              <figure
                key={`${url}-${index}`}
                className={`w-40 overflow-hidden rounded-xl border bg-surface-raised ${
                  effectiveThumbnailUrl === url ? 'border-accent shadow-chip-active' : 'border-border'
                }`}
              >
                <div className="aspect-video bg-surface">
                  <AdminCardImagePreview url={url} />
                </div>
                <figcaption className="space-y-2 px-2 py-2 text-[11px] text-muted">
                  <label className="flex cursor-pointer items-center gap-1.5 font-medium text-primary">
                    <input
                      type="radio"
                      name="thumbnail_choice"
                      checked={effectiveThumbnailUrl === url}
                      onChange={() => setThumbnailUrl(url)}
                    />
                    Card cover
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">Image {index + 1}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveMediaUrl(index, -1)}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted disabled:opacity-40"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        disabled={index === mediaPreviewUrls.length - 1}
                        onClick={() => moveMediaUrl(index, 1)}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted disabled:opacity-40"
                      >
                        Right
                      </button>
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  async function handleBodyPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const { clipboardData } = event
    const imageFiles = Array.from(clipboardData.files).filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      await pasteImages(event, imageFiles)
      return
    }

    const html = clipboardData.getData('text/html')
    if (html) {
      event.preventDefault()
      const plain = clipboardData.getData('text/plain')
      insertAtCursor(convertClipboardHtmlToMarkdown(html, plain))
      return
    }
  }

  async function pasteImages(event: ClipboardEvent<HTMLTextAreaElement>, imageFiles: File[]) {
    event.preventDefault()
    setPasteStatus(`Uploading ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}...`)

    try {
      const markdownUrls: string[] = []
      for (const file of imageFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/admin/uploads/cloudinary', {
          method: 'POST',
          body: formData,
        })
        const payload = (await response.json()) as { url?: string; error?: string }
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? 'Image upload failed')
        }
        markdownUrls.push(payload.url)
      }

      insertAtCursor(markdownUrls.map((url) => `![](${url})`).join('\n'))
      setPasteStatus('Image uploaded and inserted into Markdown.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed'
      setPasteStatus(`${message}. You can still paste the image URL manually.`)
    }
  }

  function insertAtCursor(markdown: string) {
    const textarea = bodyRef.current
    if (!textarea) {
      setBody((current) => `${current}\n${markdown}`)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = `${body.slice(0, start)}${markdown}${body.slice(end)}`
    setBody(next)
    requestAnimationFrame(() => {
      const cursor = start + markdown.length
      textarea.selectionStart = cursor
      textarea.selectionEnd = cursor
      textarea.focus()
    })
  }

  function applyMarkdown(format: MarkdownFormat) {
    const textarea = bodyRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end)
    const replacement = formatMarkdown(format, selected)
    const next = `${body.slice(0, start)}${replacement}${body.slice(end)}`
    setBody(next)

    requestAnimationFrame(() => {
      const cursorStart = start + replacement.selectionStart
      const cursorEnd = start + replacement.selectionEnd
      textarea.selectionStart = cursorStart
      textarea.selectionEnd = cursorEnd
      textarea.focus()
    })
  }

  function moveMediaUrl(index: number, delta: -1 | 1) {
    const nextUrls = [...mediaPreviewUrls]
    const target = index + delta
    if (target < 0 || target >= nextUrls.length) return
    ;[nextUrls[index], nextUrls[target]] = [nextUrls[target], nextUrls[index]]
    setMediaUrlsValue(nextUrls.join('\n'))
  }
}

type MarkdownFormat = 'bold' | 'italic' | 'h1' | 'h2' | 'list' | 'quote' | 'code' | 'link'

type MarkdownReplacement = string & {
  selectionStart: number
  selectionEnd: number
}

function withSelection(value: string, selectionStart: number, selectionEnd = selectionStart): MarkdownReplacement {
  return Object.assign(value, { selectionStart, selectionEnd })
}

function formatMarkdown(format: MarkdownFormat, selectedText: string): MarkdownReplacement {
  const text = selectedText || placeholderFor(format)

  if (format === 'bold') return withSelection(`**${text}**`, 2, 2 + text.length)
  if (format === 'italic') return withSelection(`_${text}_`, 1, 1 + text.length)
  if (format === 'code') return withSelection(`\`${text}\``, 1, 1 + text.length)
  if (format === 'h1') return prefixLines(text, '# ')
  if (format === 'h2') return prefixLines(text, '## ')
  if (format === 'list') return prefixLines(text, '- ')
  if (format === 'quote') return prefixLines(text, '> ')

  const url = typeof window !== 'undefined' ? window.prompt('Paste URL')?.trim() : ''
  const href = url || 'https://example.com'
  return withSelection(`[${text}](${href})`, 1, 1 + text.length)
}

function prefixLines(text: string, prefix: string): MarkdownReplacement {
  const value = text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
  return withSelection(value, prefix.length, value.length)
}

function placeholderFor(format: MarkdownFormat): string {
  if (format === 'link') return 'link text'
  if (format === 'h1' || format === 'h2') return 'Heading'
  if (format === 'list') return 'List item'
  if (format === 'quote') return 'Quote'
  if (format === 'code') return 'code'
  return 'text'
}

function ToolbarButton({
  label,
  title,
  onClick,
}: {
  label: string
  title: string
  onClick: () => void
}) {
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    // Preserve the textarea selection while clicking toolbar buttons.
    event.preventDefault()
  }

  return (
    <button
      type="button"
      title={title}
      onMouseDown={handleMouseDown}
      onClick={onClick}
      className="rounded-md px-2 py-0.5 text-xs font-medium transition-colors hover:bg-surface-raised hover:text-primary"
    >
      {label}
    </button>
  )
}

function TagGroup({
  label,
  labelClassName,
  tags,
  selectedTags,
  onToggle,
}: {
  label: string
  labelClassName: string
  tags: TagOption[]
  selectedTags: Set<string>
  onToggle: (slug: string, checked: boolean) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-3 py-2">
      <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${labelClassName}`}>{label}</p>
      <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {tags.map((tag) => (
          <label key={tag.id} className="cursor-pointer">
            <input
              type="checkbox"
              name="tag_slugs"
              value={tag.slug}
              checked={selectedTags.has(tag.slug)}
              onChange={(event) => onToggle(tag.slug, event.target.checked)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-7 items-center rounded-full border border-chip-inactive-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-chip-inactive-text transition-colors peer-checked:border-chip-active-border peer-checked:bg-chip-active-bg peer-checked:text-chip-active-text hover:bg-chip-hover-bg hover:text-chip-hover-text">
              {tag.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function SegmentedRadio({
  name,
  value,
  label,
  checked,
  onSelect,
}: {
  name: string
  value: ContentStream
  label: string
  checked: boolean
  onSelect: (stream: ContentStream) => void
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-8 items-center rounded-lg border border-transparent px-4 py-1.5 text-xs font-semibold text-chip-inactive-text transition-colors hover:bg-chip-hover-bg hover:text-chip-hover-text peer-checked:border-chip-active-border peer-checked:bg-chip-active-bg peer-checked:text-chip-active-text peer-checked:shadow-chip-active">
        {label}
      </span>
    </label>
  )
}

function parseUrls(value: string): string[] {
  return parseAdminMediaUrlList(value).filter((url) => {
    try {
      const parsed = new URL(url)
      return isImageUrl(url) || parsed.hostname === 'res.cloudinary.com'
    } catch {
      return false
    }
  })
}

