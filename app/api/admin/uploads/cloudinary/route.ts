import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function cloudinaryConfig() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

function signUpload(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || user?.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = cloudinaryConfig()
  if (!config) {
    return NextResponse.json(
      { error: 'Cloudinary upload is not configured.' },
      { status: 501 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image file.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 5MB or smaller.' }, { status: 413 })
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const uploadParams = {
    folder: 'nuggets/admin-paste',
    timestamp,
  }
  const signature = signUpload(uploadParams, config.apiSecret)

  const cloudinaryData = new FormData()
  cloudinaryData.set('file', file)
  cloudinaryData.set('api_key', config.apiKey)
  cloudinaryData.set('folder', uploadParams.folder)
  cloudinaryData.set('timestamp', timestamp)
  cloudinaryData.set('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: 'POST',
      body: cloudinaryData,
    }
  )
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } }

  if (!response.ok || !payload.secure_url) {
    return NextResponse.json(
      { error: payload.error?.message ?? 'Cloudinary upload failed.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url: payload.secure_url })
}
