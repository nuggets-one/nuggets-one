import { createHash } from 'node:crypto'

export type CloudinaryUploadConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function readCloudinaryUploadConfig(): CloudinaryUploadConfig | null {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

type UploadResponse = {
  secure_url?: string
  error?: { message?: string }
}

/**
 * Upload a remote image URL into Cloudinary storage (signed Admin API).
 * Returns the `secure_url` on success.
 */
export async function uploadRemoteImageToCloudinary(
  remoteUrl: string,
  options: { folder: string; config: CloudinaryUploadConfig }
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const uploadParams = {
    folder: options.folder,
    timestamp,
  }
  const signature = signParams(uploadParams, options.config.apiSecret)

  const body = new FormData()
  body.set('file', remoteUrl)
  body.set('api_key', options.config.apiKey)
  body.set('folder', uploadParams.folder)
  body.set('timestamp', timestamp)
  body.set('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${options.config.cloudName}/image/upload`,
    { method: 'POST', body }
  )
  const payload = (await response.json()) as UploadResponse

  if (!response.ok || !payload.secure_url) {
    return {
      ok: false,
      message: payload.error?.message ?? `Cloudinary upload failed (${response.status})`,
    }
  }

  return { ok: true, url: payload.secure_url }
}
