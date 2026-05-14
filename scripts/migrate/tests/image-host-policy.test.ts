import assert from 'node:assert/strict'
import test from 'node:test'
import nextConfig from '../../../next.config'
import cloudinaryLoader from '../../../lib/cloudinary-loader'
import { canRenderWithNextImage, resolveCardImageUrl } from '../../../lib/ui/card-image-host'
import { IMAGE_REMOTE_HOSTS } from '../../../lib/ui/image-host-policy'

test('next image remotePatterns stay aligned with image host policy', () => {
  const patterns = nextConfig.images?.remotePatterns ?? []
  const hosts = patterns
    .filter((p) => p.protocol === 'https')
    .map((p) => p.hostname)
    .sort()

  assert.deepEqual(hosts, [...IMAGE_REMOTE_HOSTS].sort())
})

test('canRenderWithNextImage allows only configured render hosts', () => {
  for (const host of IMAGE_REMOTE_HOSTS) {
    assert.equal(canRenderWithNextImage(`https://${host}/path/image.jpg`), true)
  }

  assert.equal(canRenderWithNextImage('https://images.ctfassets.net/some/image.jpg'), false)
})

test('resolveCardImageUrl rewrites disallowed hosts to Cloudinary fetch', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const source = 'https://images.ctfassets.net/space/asset.png?fm=webp&q=70'
  const resolved = resolveCardImageUrl(source)

  assert.ok(resolved?.startsWith('https://res.cloudinary.com/clubstorage/image/fetch/'))
  assert.equal(canRenderWithNextImage(resolved), true)
})

test('pdf URLs are blocked unless proxied through Cloudinary', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const pdf = 'https://www.kkr.com/content/dam/kkr/insights/pdf/thoughts-from-the-road-china-april-2026.pdf'

  assert.equal(canRenderWithNextImage(pdf), false)
  assert.equal(canRenderWithNextImage(resolveCardImageUrl(pdf)), true)
})

test('cloudinaryLoader does not append query params to image/fetch URLs', () => {
  const fetchSrc =
    'https://res.cloudinary.com/clubstorage/image/fetch/f_auto,q_auto,w_768,c_fill,g_auto/https%3A%2F%2Fexample.com%2Fa.png'
  assert.equal(cloudinaryLoader({ src: fetchSrc, width: 640, quality: 75 }), fetchSrc)
})

