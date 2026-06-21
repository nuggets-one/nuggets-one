import 'server-only'

import { parseOgTagsFromHtml } from '@/lib/admin/parse-og-tags'
import { validateOutboundUrl } from '@/lib/admin/ssrf-guard'
import type { SourceMetadata } from '@/lib/admin/source-metadata-types'
import { isImageUrl } from '@/lib/ui/is-image-url'
import { extractYouTubeVideoId } from '@/lib/ui/youtube-video-id'

const USER_AGENT = 'NuggetsAdminMetadata/1.0'
const FETCH_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 512 * 1024
const MAX_REDIRECTS = 3

type YouTubeOEmbedResponse = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

export type FetchSourceMetadataResult =
  | { ok: true; metadata: SourceMetadata }
  | { ok: false; code: 'invalid_url' | 'blocked_host' | 'fetch_failed' | 'no_metadata' }

async function fetchWithRedirects(url: URL): Promise<Response> {
  let current = url

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const validation = await validateOutboundUrl(current.href)
    if (!validation.ok) {
      throw new Error(validation.code)
    }

    const response = await fetch(current.href, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('fetch_failed')
      }
      current = new URL(location, current.href)
      continue
    }

    return response
  }

  throw new Error('fetch_failed')
}

async function readHtmlLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    return text.slice(0, MAX_HTML_BYTES)
  }

  const chunks: Uint8Array[] = []
  let total = 0

  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    const remaining = MAX_HTML_BYTES - total
    const slice = value.byteLength > remaining ? value.slice(0, remaining) : value
    chunks.push(slice)
    total += slice.byteLength
    if (value.byteLength > remaining) break
  }

  await reader.cancel().catch(() => undefined)

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged)
}

async function fetchYouTubeMetadata(canonicalUrl: string): Promise<SourceMetadata> {
  const oembedUrl = new URL('https://www.youtube.com/oembed')
  oembedUrl.searchParams.set('url', canonicalUrl)
  oembedUrl.searchParams.set('format', 'json')

  const response = await fetch(oembedUrl.href, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error('fetch_failed')
  }

  const payload = (await response.json()) as YouTubeOEmbedResponse
  const title = payload.title?.trim() || null
  const author = payload.author_name?.trim() || null
  const imageUrl = payload.thumbnail_url?.trim() || null

  if (!title && !author && !imageUrl) {
    throw new Error('no_metadata')
  }

  return {
    provider: 'youtube',
    title,
    description: author,
    imageUrl,
    author,
    canonicalUrl,
  }
}

async function fetchWebMetadata(canonicalUrl: string): Promise<SourceMetadata> {
  const parsed = new URL(canonicalUrl)
  const response = await fetchWithRedirects(parsed)
  if (!response.ok) {
    throw new Error('fetch_failed')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('no_metadata')
  }

  const html = await readHtmlLimited(response)
  const og = parseOgTagsFromHtml(html, canonicalUrl)

  if (!og.title && !og.description && !og.imageUrl) {
    throw new Error('no_metadata')
  }

  return {
    provider: 'web',
    title: og.title,
    description: og.description,
    imageUrl: og.imageUrl,
    author: null,
    canonicalUrl,
  }
}

/** Admin-only metadata fetch for Source URL paste / preview. */
export async function fetchSourceMetadata(rawUrl: string): Promise<FetchSourceMetadataResult> {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { ok: false, code: 'invalid_url' }
  }

  const validation = await validateOutboundUrl(trimmed)
  if (!validation.ok) {
    return { ok: false, code: validation.code }
  }

  const canonicalUrl = validation.url.href

  try {
    const youtubeId = extractYouTubeVideoId(canonicalUrl)
    if (youtubeId) {
      const metadata = await fetchYouTubeMetadata(canonicalUrl)
      return { ok: true, metadata }
    }

    if (isImageUrl(canonicalUrl)) {
      return {
        ok: true,
        metadata: {
          provider: 'image',
          title: null,
          description: null,
          imageUrl: canonicalUrl,
          author: null,
          canonicalUrl,
        },
      }
    }

    const metadata = await fetchWebMetadata(canonicalUrl)
    return { ok: true, metadata }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch_failed'
    if (message === 'invalid_url' || message === 'blocked_host' || message === 'no_metadata') {
      return { ok: false, code: message }
    }
    return { ok: false, code: 'fetch_failed' }
  }
}
