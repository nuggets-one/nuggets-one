import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePushImageUrl } from '../../../lib/notifications/push-image-url'

const ORIGINAL_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

test('resolvePushImageUrl returns null for empty input', () => {
  assert.equal(resolvePushImageUrl(null), null)
  assert.equal(resolvePushImageUrl(''), null)
})

test('resolvePushImageUrl passes through YouTube poster URLs', () => {
  const url = 'https://i.ytimg.com/vi/abc123/hqdefault.jpg'
  assert.equal(resolvePushImageUrl(url), url)
})

test('resolvePushImageUrl passes through Cloudinary delivery URLs', () => {
  const url =
    'https://res.cloudinary.com/clubstorage/image/upload/v1781765015/nuggets/admin-paste/chart.png'
  assert.equal(resolvePushImageUrl(url), url)
})

test('resolvePushImageUrl proxies external chart hosts through Cloudinary when configured', () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'clubstorage'
  const url = 'https://www.example.com/charts/market.png'
  const resolved = resolvePushImageUrl(url)
  assert.ok(resolved?.includes('res.cloudinary.com/clubstorage/image/fetch/'))
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = ORIGINAL_CLOUD
})

test('resolvePushImageUrl rejects non-image URLs', () => {
  assert.equal(resolvePushImageUrl('https://www.example.com/page.html'), null)
})
