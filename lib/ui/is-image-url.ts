/**
 * URL → "is this an image?" classifier.
 *
 * Ported from `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` §1–6 (legacy
 * `src/utils/urlUtils.ts#isImageUrl`). Used by the card multi-image grid
 * (Phase 14) to decide whether an `article_media` URL — which has no
 * authoritative content-type — can be rendered as an `<img>` / `<Image>`.
 *
 * Pure function, server-safe. Returns `false` on any parse error.
 */
export function isImageUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()
  const search = parsed.search.toLowerCase()

  // §1 — Direct image extensions (case-insensitive, ignore query/hash)
  if (/\.(jpg|jpeg|png|gif|webp|svg|svgz)$/i.test(path)) return true

  // §2 — Cloudflare image delivery URLs (resize-indicator required)
  if (path.includes('/cdn-cgi/imagedelivery/')) {
    if (/[?&](w|h)=/.test(search)) return true
    if (/\/(w|h)=\d+/.test(path)) return true
  }

  // §3 — Social / platform image CDNs (host-based)
  if (host === 'video.twimg.com') return false
  if (host === 'pbs.twimg.com' && path.startsWith('/media/')) return true
  if (host.includes('media.licdn.com') && path.includes('/image/')) return true
  if (host === 'i.redd.it' || host === 'preview.redd.it') return true
  if (host === 'i.imgur.com') return true

  // §4 — Static / CDN path heuristics
  if (path.startsWith('/images/') && (host.includes('static.') || host.includes('ffx.io'))) {
    return true
  }
  if (host.includes('cloudfront.net')) {
    if (path.includes('_images') || path.includes('/images/') || path.includes('/image/')) {
      return true
    }
  }

  // §5 — Generic CDN host heuristics — image-ish host + format hint or non-html path
  const cdnHostHints = ['images.ctfassets.net', 'thumbs.', 'cdn.', 'img.', 'image.']
  if (cdnHostHints.some((hint) => host.includes(hint))) {
    const hasFormatHint = /[?&](fm|q|format)=/.test(search)
    const looksLikeAsset = !path.endsWith('.html') && !path.endsWith('.php') && !path.endsWith('/')
    if (hasFormatHint || looksLikeAsset) return true
  }

  // §6 — Query-param `format=image` fallback when path is media-like
  if (/[?&]format=(jpg|jpeg|png|gif|webp)\b/.test(search)) {
    if (/\/(media|image|photo|pic|img)\//.test(path)) return true
  }

  // §7 — CMS media-library paths without file extensions (Sitecore, AEM-style)
  if (path.includes('/-/media/')) return true
  if (/\/media\/(images?|photos?|pics?|assets?)\//.test(path)) return true

  // §8 — Cloudinary-style fetch proxy paths (Substack, res.cloudinary.com, etc.)
  if (path.includes('/image/fetch/')) return true

  // §9 — Adobe AEM dispatcher paths (textimage component, versioned asset suffix)
  if (/\/textimage\//i.test(path) && /\.(png|jpe?g|gif|webp)$/i.test(path)) return true

  return false
}
