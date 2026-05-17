import assert from 'node:assert/strict'
import test from 'node:test'
import nextConfig from '../../../next.config'
import cloudinaryLoader from '../../../lib/cloudinary-loader'
import { resolveCardPreviewDisplayUrl } from '../../../lib/ui/card-preview-display-url'
import { canRenderWithNextImage, resolveCardImageUrl } from '../../../lib/ui/card-image-host'
import { IMAGE_REMOTE_HOSTS } from '../../../lib/ui/image-host-policy'
import {
  describeCardCoverPreview,
  resolveArticleHeroFields,
} from '../../../lib/ui/resolve-article-hero'

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

  assert.equal(canRenderWithNextImage('https://images.ctfassets.net/some/image.jpg'), true)
  assert.equal(canRenderWithNextImage('https://pbs.twimg.com/media/ABC?format=jpg'), true)
  assert.equal(canRenderWithNextImage('https://www.apolloacademy.com/foo.png'), true)
  assert.equal(canRenderWithNextImage('https://www.morganstanley.com/foo.png'), false)
})

test('resolveCardImageUrl passthroughs Tier-1 hosts without Cloudinary fetch', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const source = 'https://images.ctfassets.net/space/asset.png?fm=webp&q=70'
  const resolved = resolveCardImageUrl(source)

  assert.equal(resolved, source)
  assert.equal(canRenderWithNextImage(resolved), true)
})

test('resolveCardImageUrl rewrites long-tail hosts to Cloudinary fetch', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const source = 'https://www.morganstanley.com/path/cover.png'
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

test('resolveCardPreviewDisplayUrl passthroughs Tier-1 hosts without Cloudinary env', () => {
  const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  delete process.env.CLOUDINARY_CLOUD_NAME

  const contentful =
    'https://images.ctfassets.net/iqem6dz8q0mk/asset/years_to_25b.png?fm=webp&q=70'
  assert.equal(resolveCardPreviewDisplayUrl(contentful), contentful)

  const morganStanley = 'https://www.morganstanley.com/foo.png'
  assert.equal(resolveCardPreviewDisplayUrl(morganStanley), null)

  if (prev) process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev
})

test('describeCardCoverPreview proxies Contentful URLs when Cloudinary is configured', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const contentful =
    'https://images.ctfassets.net/iqem6dz8q0mk/2rzab8RPLNO8x1kYA8eONd/a2db542d0a5eabf13a8a4079aa22d3cc/years_to_25b.png?fm=webp&q=70'

  const resolved = resolveArticleHeroFields({
    source_url: null,
    hero_thumb_url: contentful,
    media_urls: [contentful],
  })
  const preview = describeCardCoverPreview(resolved)

  assert.equal(preview.kind, 'image')
  assert.equal(preview.posterUrl, contentful)
  assert.equal(canRenderWithNextImage(preview.posterUrl), true)
})

