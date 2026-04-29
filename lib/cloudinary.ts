export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const uploadMarker = '/upload/'
  const uploadIdx = src.indexOf(uploadMarker)
  if (uploadIdx !== -1) {
    const path = src.slice(uploadIdx + uploadMarker.length)
    const baseUrl = src.slice(0, uploadIdx + uploadMarker.length)
    // Strip any existing transform prefix (e.g. "w_800,q_auto/") to avoid double-transforming
    const hasExistingTransforms = /^[a-z]_[^/]+/.test(path)
    const publicId = hasExistingTransforms ? path.replace(/^[^/]+\//, '') : path
    return `${baseUrl}w_${width},q_${quality ?? 75},f_auto,c_fill,g_auto/${publicId}`
  }
  // Not a full URL — treat as raw public_id (requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return src
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${width},q_${quality ?? 75},f_auto,c_fill,g_auto/${src}`
}

export default cloudinaryLoader
