const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com'
const DEFAULT_FETCH_WIDTH = 768

type CloudinaryFetchOptions = {
  width?: number
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
  // Remote PDF: first page as image (`pg_1` per paged media docs). Avoid `f_jpg`
  // before `pg_1` — some accounts reject that combo for fetch.
  const isPdf = parsed.pathname.toLowerCase().endsWith('.pdf')
  const transforms = isPdf
    ? `pg_1,f_auto,q_auto,w_${width},c_fill,g_auto`
    : `f_auto,q_auto,w_${width},c_fill,g_auto`
  return `${CLOUDINARY_BASE_URL}/${cloud}/image/fetch/${transforms}/${encodeURIComponent(externalUrl)}`
}

