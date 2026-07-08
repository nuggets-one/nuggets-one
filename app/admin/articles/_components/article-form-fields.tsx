'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type MouseEvent } from 'react'
import { AdminCardImagePreview } from './admin-card-image-preview'
import { CardCoverPreviewPanel } from './card-cover-preview'
import { SourceMetadataPreview } from './source-metadata-preview'
import type { SourceMetadata } from '@/lib/admin/source-metadata-types'
import { suggestStreamFromText, suggestTagsFromText } from '@/lib/admin/suggest-tags-from-text'
import { hasCloudinaryCloudName } from '@/lib/ui/cloudinary-fetch'
import { isYouTubeUrl } from '@/lib/ui/excerpt-card'
import { isImageUrl } from '@/lib/ui/is-image-url'
import { convertClipboardHtmlToMarkdown } from '@/lib/markdown/html-clipboard-to-markdown'
import { describeCardCoverPreview, resolveArticleHeroFields } from '@/lib/ui/resolve-article-hero'
import { parseAdminMediaUrlList } from '@/lib/ui/parse-admin-media-urls'
import { getStreamLabel, parseContentStream } from '@/lib/copy/streams'
import {
  computeVisibleStreams,
  validateStreamTagMembership,
} from '@/lib/feed/stream-membership'
import type { ContentStream, TagDimension, TagSummary } from '@/types/article'
import { CONTENT_STREAMS } from '@/types/article'

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
  const [title, setTitle] = useState(defaults?.title ?? '')
  const [mediaUrlsValue, setMediaUrlsValue] = useState(initialMediaUrls.join('\n'))
  const [thumbnailUrl, setThumbnailUrl] = useState(defaults?.hero_thumb_url ?? initialMediaUrls[0] ?? '')
  const [body, setBody] = useState(defaults?.content_markdown ?? '')
  const [prefillBodyTemplate, setPrefillBodyTemplate] = useState(false)
  const [pasteStatus, setPasteStatus] = useState<string | null>(null)
  const [fetchedMetadata, setFetchedMetadata] = useState<SourceMetadata | null>(null)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [suggestedTagSlugs, setSuggestedTagSlugs] = useState<string[]>([])
  const [suggestedStream, setSuggestedStream] = useState<ContentStream | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const pendingLinkSelectionRef = useRef<{ start: number; end: number; text: string } | null>(null)
  const lastFetchedUrlRef = useRef<string | null>(null)
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

  const visibleSuggestedTags = useMemo(
    () => suggestedTagSlugs.filter((slug) => !selectedTags.has(slug)),
    [suggestedTagSlugs, selectedTags],
  )

  const visibleStreams = useMemo(
    () => computeVisibleStreams(contentStream, selectedTagSlugs),
    [contentStream, selectedTagSlugs]
  )

  const applyMetadata = useCallback(
    (metadata: SourceMetadata, mode: 'empty_only' | 'replace_all') => {
      if (mode === 'replace_all' || !title.trim()) {
        if (metadata.title) setTitle(metadata.title)
      }

      if (metadata.provider !== 'youtube' && metadata.imageUrl) {
        const existing = parseAdminMediaUrlList(mediaUrlsValue)
        if (!existing.includes(metadata.imageUrl)) {
          const next = [...existing, metadata.imageUrl]
          setMediaUrlsValue(next.join('\n'))
          setThumbnailUrl(metadata.imageUrl)
        } else if (mode === 'replace_all' || !effectiveThumbnailUrl) {
          setThumbnailUrl(metadata.imageUrl)
        }
      }

      if (prefillBodyTemplate && (mode === 'replace_all' || !body.trim())) {
        const template = buildBodyTemplate(metadata, sourceUrl.trim())
        if (template) setBody(template)
      }

      const suggestionText = [metadata.title, metadata.description, metadata.author]
        .filter(Boolean)
        .join(' ')
      setSuggestedTagSlugs(
        suggestTagsFromText(
          suggestionText,
          tags.map((tag) => ({
            slug: tag.slug,
            label: tag.label,
          })),
        ),
      )
      setSuggestedStream(suggestStreamFromText(suggestionText))
    },
    [
      body,
      effectiveThumbnailUrl,
      mediaUrlsValue,
      prefillBodyTemplate,
      sourceUrl,
      tags,
      title,
    ],
  )

  const fetchMetadata = useCallback(
    async (url: string, options?: { autoApply?: boolean }) => {
      if (!looksLikeFetchableUrl(url)) return

      setFetchStatus('loading')
      setFetchError(null)

      try {
        const response = await fetch('/api/admin/source-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const payload = (await response.json()) as {
          metadata?: SourceMetadata
          code?: string
          error?: string
        }

        if (!response.ok || !payload.metadata) {
          const code = payload.code ?? payload.error ?? 'fetch_failed'
          setFetchStatus('error')
          setFetchError(metadataErrorMessage(code))
          setFetchedMetadata(null)
          return
        }

        lastFetchedUrlRef.current = url
        setFetchedMetadata(payload.metadata)
        setFetchStatus('idle')
        if (options?.autoApply) {
          applyMetadata(payload.metadata, 'empty_only')
        }
      } catch {
        setFetchStatus('error')
        setFetchError('Could not fetch metadata. Check the URL and try again.')
        setFetchedMetadata(null)
      }
    },
    [applyMetadata],
  )

  function handleSourceUrlChange(value: string) {
    setSourceUrl(value)
    const trimmed = value.trim()
    if (!looksLikeFetchableUrl(trimmed)) {
      setFetchStatus('idle')
      setFetchError(null)
      if (!trimmed) {
        setFetchedMetadata(null)
        lastFetchedUrlRef.current = null
      }
    }
  }

  useEffect(() => {
    const trimmed = sourceUrl.trim()
    if (!looksLikeFetchableUrl(trimmed)) {
      return
    }

    if (trimmed === lastFetchedUrlRef.current) {
      return
    }

    const timeout = window.setTimeout(() => {
      void fetchMetadata(trimmed, { autoApply: true })
    }, 600)

    return () => window.clearTimeout(timeout)
  }, [sourceUrl, fetchMetadata])

  function handleTagToggle(slug: string, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedTagSlugs, slug])]
      : selectedTagSlugs.filter((value) => value !== slug)
    setSelectedTagSlugs(next)
    if (!validateStreamTagMembership(contentStream, next)) {
      setContentStream('standard')
    }
  }

  function applySuggestedTag(slug: string) {
    handleTagToggle(slug, true)
    setSuggestedTagSlugs((current) => current.filter((value) => value !== slug))
  }

  function applySuggestedStream() {
    if (suggestedStream) {
      setContentStream(suggestedStream)
      setSuggestedStream(null)
    }
  }

  return (
    <div className="space-y-4 py-1">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="hero_thumb_url" value={effectiveThumbnailUrl} />
      <input type="hidden" name="hero_alt_text" value={defaults?.hero_alt_text ?? ''} />
      {sourceIsYouTube ? <input type="hidden" name="media_urls" value={mediaUrlsValue} /> : null}

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Source URL</span>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                name="source_url"
                placeholder="https://example.com/article or YouTube link"
                value={sourceUrl}
                onChange={(event) => handleSourceUrlChange(event.target.value)}
                className="min-w-[min(100%,20rem)] flex-1 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                disabled={!looksLikeFetchableUrl(sourceUrl.trim()) || fetchStatus === 'loading'}
                onClick={() => void fetchMetadata(sourceUrl.trim())}
                className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fetchStatus === 'loading' ? 'Fetching…' : 'Fetch metadata'}
              </button>
            </div>
            <p className="text-[11px] leading-snug text-muted">
              Paste a link first — we fetch title and cover when possible. For YouTube, the video poster becomes the
              feed cover automatically.
            </p>
            {sourceIsYouTube ? (
              <p className="text-[11px] font-medium text-primary">
                YouTube detected — card cover will use the video poster.
              </p>
            ) : null}
            {fetchStatus === 'loading' ? (
              <p className="text-[11px] text-muted">Fetching metadata…</p>
            ) : null}
            {fetchError ? (
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{fetchError}</p>
            ) : null}
          </label>

          {fetchedMetadata ? (
            <SourceMetadataPreview
              metadata={fetchedMetadata}
              applyEmptyOnly
              onApply={() => applyMetadata(fetchedMetadata, 'empty_only')}
              onReplaceAll={() => applyMetadata(fetchedMetadata, 'replace_all')}
            />
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Title</span>
            <input
              type="text"
              name="title"
              required
              placeholder="Enter a title for your nugget..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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

        <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-2 border-t border-border pt-3 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Classification Tags</p>
            {visibleSuggestedTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Suggested</span>
                {visibleSuggestedTags.map((slug) => {
                  const tag = tags.find((item) => item.slug === slug)
                  if (!tag) return null
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => applySuggestedTag(slug)}
                      className="rounded-full border border-dashed border-accent/60 bg-surface px-2.5 py-0.5 text-[11px] font-medium text-primary transition hover:bg-chip-active-bg"
                    >
                      + {tag.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
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

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Stream</span>
            <select
              name="content_stream"
              value={contentStream}
              onChange={(event) => setContentStream(parseContentStream(event.target.value))}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 md:hidden"
            >
              {CONTENT_STREAMS.map((stream) => (
                <option key={stream} value={stream}>
                  {getStreamLabel(stream, 'short')}
                </option>
              ))}
            </select>
            <div className="hidden min-h-[42px] w-fit flex-wrap items-center gap-1 rounded-xl border border-border bg-rail/60 p-1 md:flex">
              <SegmentedRadio name="content_stream" value="standard" label="Standard" checked={contentStream === 'standard'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="pulse" label="Pulse" checked={contentStream === 'pulse'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="charts" label="Charts" checked={contentStream === 'charts'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="tech_vc" label="Tech x VC" checked={contentStream === 'tech_vc'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="leadership" label="Leadership" checked={contentStream === 'leadership'} onSelect={setContentStream} />
              <SegmentedRadio name="content_stream" value="geopolitics" label="Geopolitics" checked={contentStream === 'geopolitics'} onSelect={setContentStream} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] leading-snug text-muted">
                Primary stream controls notifications. Matching tags also show this nugget in other feeds.
              </p>
              {suggestedStream && suggestedStream !== contentStream ? (
                <button
                  type="button"
                  onClick={applySuggestedStream}
                  className="rounded-full border border-dashed border-accent/60 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  Suggest primary: {getStreamLabel(suggestedStream, 'short')}
                </button>
              ) : null}
            </div>
            <p className="text-[11px] leading-snug text-muted">
              Visible in: {visibleStreams.map((stream) => getStreamLabel(stream, 'short')).join(', ')}
            </p>
          </div>

          {!sourceIsYouTube ? (
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
                Optional images for the feed card gallery. Pick one as the card cover below. Fetched OG images are
                added here automatically.
              </p>
            </label>
          ) : null}
        </div>

        <CardCoverPreviewPanel
          preview={cardCoverPreview}
          showCloudinaryEnvWarning={showCloudinaryEnvWarning}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-sm text-muted">
          <span className="text-xs font-semibold uppercase tracking-wide">Markdown Body</span>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={prefillBodyTemplate}
                onChange={(event) => setPrefillBodyTemplate(event.target.checked)}
                className="rounded border-border"
              />
              Pre-fill body template from source
            </label>
            <details className="group sm:hidden">
              <summary className="min-h-11 cursor-pointer list-none rounded-md border border-border px-3 py-2 text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                Formatting
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <MarkdownToolbarButtons onFormat={applyMarkdown} onLink={openLinkDialog} />
              </div>
            </details>
            <div className="hidden flex-wrap items-center gap-1 sm:flex">
              <MarkdownToolbarButtons onFormat={applyMarkdown} onLink={openLinkDialog} />
            </div>
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
          className="min-h-[40vh] max-h-[75vh] w-full resize-y overflow-y-auto border-0 bg-surface-raised px-4 py-4 font-mono text-sm text-primary outline-none placeholder:text-muted focus:ring-0 sm:min-h-[min(50vh,36rem)]"
        />
      </section>

      {linkDialogOpen ? (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-end justify-center border-0 bg-scrim p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLinkDialogOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setLinkDialogOpen(false)
          }}
        >
          <form
            method="dialog"
            className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-4 shadow-panel sm:rounded-2xl"
            onSubmit={(event) => {
              event.preventDefault()
              insertLinkFromDialog()
            }}
          >
            <h3 className="mb-3 text-sm font-semibold text-primary">Insert link</h3>
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">URL</span>
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com"
                autoFocus
                className="min-h-11 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLinkDialogOpen(false)}
                className="min-h-11 flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-11 flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Insert
              </button>
            </div>
          </form>
        </dialog>
      ) : null}

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
                        aria-label="Move image left"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded border border-border text-xs text-muted disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={index === mediaPreviewUrls.length - 1}
                        onClick={() => moveMediaUrl(index, 1)}
                        aria-label="Move image right"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded border border-border text-xs text-muted disabled:opacity-40"
                      >
                        →
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

  function openLinkDialog() {
    const textarea = bodyRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end)
    pendingLinkSelectionRef.current = {
      start,
      end,
      text: selected || placeholderFor('link'),
    }
    setLinkUrl('')
    setLinkDialogOpen(true)
  }

  function insertLinkFromDialog() {
    const pending = pendingLinkSelectionRef.current
    const textarea = bodyRef.current
    if (!pending || !textarea) {
      setLinkDialogOpen(false)
      return
    }

    const href = linkUrl.trim() || 'https://example.com'
    const markdown = `[${pending.text}](${href})`
    const next = `${body.slice(0, pending.start)}${markdown}${body.slice(pending.end)}`
    setBody(next)
    setLinkDialogOpen(false)

    requestAnimationFrame(() => {
      const cursorStart = pending.start + 1
      const cursorEnd = pending.start + 1 + pending.text.length
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

  return withSelection(`[${text}](https://example.com)`, 1, 1 + text.length)
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

function MarkdownToolbarButtons({
  onFormat,
  onLink,
}: {
  onFormat: (format: MarkdownFormat) => void
  onLink: () => void
}) {
  return (
    <>
      <ToolbarButton label="B" title="Bold" onClick={() => onFormat('bold')} />
      <ToolbarButton label="I" title="Italic" onClick={() => onFormat('italic')} />
      <ToolbarButton label="H1" title="Heading 1" onClick={() => onFormat('h1')} />
      <ToolbarButton label="H2" title="Heading 2" onClick={() => onFormat('h2')} />
      <ToolbarButton label="List" title="Bullet list" onClick={() => onFormat('list')} />
      <ToolbarButton label="Quote" title="Quote" onClick={() => onFormat('quote')} />
      <ToolbarButton label="Code" title="Inline code" onClick={() => onFormat('code')} />
      <ToolbarButton label="Link" title="Link" onClick={onLink} />
    </>
  )
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
      className="min-h-11 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-raised hover:text-primary"
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
      <div className="flex max-h-none flex-wrap gap-1.5 overflow-y-auto pr-1 sm:max-h-20">
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

function looksLikeFetchableUrl(value: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function buildBodyTemplate(metadata: SourceMetadata, source: string): string {
  const parts: string[] = []

  if (metadata.provider === 'youtube') {
    if (metadata.author) parts.push(`Video by ${metadata.author}.`)
    if (source) parts.push(`[Watch on YouTube](${source})`)
  } else {
    if (metadata.description) parts.push(metadata.description)
    if (source) parts.push(`[View source](${source})`)
  }

  return parts.join('\n\n')
}

function metadataErrorMessage(code: string): string {
  if (code === 'invalid_url') return 'Enter a valid http or https URL.'
  if (code === 'blocked_host') return 'That URL cannot be fetched for security reasons.'
  if (code === 'no_metadata') return 'No metadata found on that page.'
  return 'Could not fetch metadata. Try again or fill fields manually.'
}

