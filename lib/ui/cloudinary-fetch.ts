const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com'
const DEFAULT_FETCH_WIDTH = 768
const OG_FETCH_WIDTH = 1200
const OG_FETCH_HEIGHT = 630

type CloudinaryFetchOptions = {
  width?: number
  height?: number
}

export function hasCloudinaryCloudName(): boolean {
  return cloudinaryCloudName() !== null
}

function cloudinaryCloudName(): string | null {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  if (cloud) return cloud

  const serverCloud = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  return serverCloud || null
}

export function cloudinaryFetchUrl(
  externalUrl: string,
  options: CloudinaryFetchOptions = {}
): string {
  let parsed: URL
  try {
    parsed = new URL(externalUrl)
  } catch {
    return externalUrl
  }

  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'https:' && protocol !== 'http:') return externalUrl

  const cloud = cloudinaryCloudName()
  if (!cloud) return externalUrl

  const width = options.width ?? DEFAULT_FETCH_WIDTH
  const height = options.height
  // Remote PDF: first page as image (`pg_1` per paged media docs). Avoid `f_jpg`
  // before `pg_1` — some accounts reject that combo for fetch.
  const isPdf = parsed.pathname.toLowerCase().endsWith('.pdf')
  const sizeTransforms = height
    ? `w_${width},h_${height},c_fill,g_auto`
    : `w_${width},c_fill,g_auto`
  const transforms = isPdf
    ? `pg_1,f_auto,q_auto,${sizeTransforms}`
    : `f_auto,q_auto,${sizeTransforms}`
  return `${CLOUDINARY_BASE_URL}/${cloud}/image/fetch/${transforms}/${encodeURIComponent(externalUrl)}`
}

/** Open Graph / WhatsApp — 1200×630 crop via Cloudinary fetch. */
export function cloudinaryOgFetchUrl(externalUrl: string): string {
  return cloudinaryFetchUrl(externalUrl, {
    width: OG_FETCH_WIDTH,
    height: OG_FETCH_HEIGHT,
  })
}

