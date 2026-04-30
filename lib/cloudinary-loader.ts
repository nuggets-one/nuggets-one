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

export function cloudinaryLoader({
  src,
  width,
  quality,
}: CloudinaryLoaderParams): string {
  // If src is already a full Cloudinary URL, extract and rebuild
  // Expected format: https://res.cloudinary.com/{cloud}/image/upload/.../{public_id}
  const uploadSegment = '/image/upload/'
  const uploadIndex = src.indexOf(uploadSegment)

  if (uploadIndex === -1) {
    // Not a Cloudinary URL (e.g. i.ytimg.com) — return as-is for Next.js to serve directly
    return src
  }

  const baseUrl = src.slice(0, uploadIndex + uploadSegment.length)
  const rest = src.slice(uploadIndex + uploadSegment.length)

  // Strip any existing transformation prefix (starts with a letter + underscore
  // pattern like "w_800,q_auto/") to avoid double-transforming
  const hasExistingTransforms = /^[a-z]_[^/]+/.test(rest)
  const publicId = hasExistingTransforms ? rest.replace(/^[^/]+\//, '') : rest

  const q = quality ?? 75
  const transforms = `w_${width},q_${q},f_auto,c_fill,g_auto`

  return `${baseUrl}${transforms}/${publicId}`
}

export default cloudinaryLoader
