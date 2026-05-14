/**
 * Cloudinary custom loader for next/image.
 *
 * URL shape:
 *   https://res.cloudinary.com/{cloud}/image/upload/{transforms}/{public_id}
 *
 * Transforms applied:
 *   w_{width}   — resize to requested width
 *   q_auto      — automatic quality (Cloudinary picks best for format)
 *   f_auto      — automatic format (WebP/AVIF where supported)
 *   c_fill      — fill crop mode (prevents distortion on fixed aspect containers)
 *   g_auto      — auto gravity for crop (keeps subject in frame)
 *
 * Used by: next/image on all ArticleCard hero images and detail page heroes.
 * Not used for: YouTube thumbnails (i.ytimg.com uses default Next.js loader).
 * Not used for: non-Cloudinary hosts in markdown body (fall back to <img>).
 */

interface CloudinaryLoaderParams {
  src: string
  width: number
  quality?: number
}

function isTransformationSegment(segment: string): boolean {
  // Cloudinary transformation components typically look like:
  // "w_800", "c_fill,g_auto,q_auto", etc.
  return /^([a-z]{1,4}_[^,\/]+)(,[a-z]{1,4}_[^,\/]+)*$/i.test(segment)
}

function stripLeadingTransforms(pathAfterUpload: string): string {
  const segments = pathAfterUpload.split('/').filter(Boolean)
  let index = 0

  while (index < segments.length && isTransformationSegment(segments[index])) {
    index++
  }

  return segments.slice(index).join('/')
}

export function cloudinaryLoader({
  src,
  width,
  quality,
}: CloudinaryLoaderParams): string {
  // Remote fetch URLs already embed transforms + encoded source in the path.
  // Do not append ?w=&q= (treated as CDN query params) — that breaks delivery.
  const fetchSegment = '/image/fetch/'
  if (src.includes(fetchSegment)) {
    return src
  }

  // If src is already a full Cloudinary URL, extract and rebuild
  // Expected format: https://res.cloudinary.com/{cloud}/image/upload/.../{public_id}
  const uploadSegment = '/image/upload/'
  const uploadIndex = src.indexOf(uploadSegment)

  if (uploadIndex === -1) {
    // Not a Cloudinary URL (e.g. i.ytimg.com). Keep passthrough behavior
    // but include width/quality params so Next.js can verify responsive sizing.
    const q = quality ?? 75
    const separator = src.includes('?') ? '&' : '?'
    return `${src}${separator}w=${width}&q=${q}`
  }

  const baseUrl = src.slice(0, uploadIndex + uploadSegment.length)
  const rest = src.slice(uploadIndex + uploadSegment.length)

  // Strip any leading transformation segments to avoid double-transforming.
  // Keep version/public-id segments untouched.
  const publicId = stripLeadingTransforms(rest)

  const q = quality ?? 75
  const transforms = `w_${width},q_${q},f_auto,c_fill,g_auto`

  return `${baseUrl}${transforms}/${publicId}`
}

export default cloudinaryLoader
