import { isImageUrl } from '@/lib/ui/is-image-url'

export type ParsedOgTags = {
  title: string | null
  description: string | null
  imageUrl: string | null
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim()
}

function matchMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const raw = match?.[1]?.trim()
    if (raw) return decodeHtmlEntities(raw)
  }
  return null
}

function absoluteUrl(raw: string, pageUrl: string): string | null {
  try {
    return new URL(raw, pageUrl).href
  } catch {
    return null
  }
}

function isLikelyImageUrl(url: string): boolean {
  return isImageUrl(url) || url.includes('cloudinary') || url.includes('ytimg')
}

/** Parse Open Graph / Twitter meta tags from HTML (regex-based, admin/backfill safe). */
export function parseOgTagsFromHtml(html: string, pageUrl: string): ParsedOgTags {
  const title =
    matchMetaContent(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i,
    ]) ??
    matchMetaContent(html, [/<title[^>]*>([^<]+)<\/title>/i])

  const description = matchMetaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ])

  const rawImage =
    matchMetaContent(html, [
      /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    ]) ?? null

  let imageUrl: string | null = null
  if (rawImage) {
    const absolute = absoluteUrl(rawImage, pageUrl)
    if (absolute && isLikelyImageUrl(absolute)) {
      imageUrl = absolute
    }
  }

  return { title, description, imageUrl }
}

/** Backfill helper — OG image only. */
export function parseOgImageFromHtml(html: string, pageUrl: string): string | null {
  return parseOgTagsFromHtml(html, pageUrl).imageUrl
}
