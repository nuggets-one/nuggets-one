import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAdminMediaUrlList } from '../../../lib/ui/parse-admin-media-urls'

const substackUrl =
  'https://substackcdn.com/image/fetch/$s_!XRJN!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F62704ed8-d936-47d4-932e-c4d89db14669_1554x838.png'

test('parseAdminMediaUrlList keeps commas inside Substack Cloudinary fetch URLs', () => {
  const urls = parseAdminMediaUrlList(substackUrl)
  assert.equal(urls.length, 1)
  assert.equal(urls[0], substackUrl)
})

test('parseAdminMediaUrlList splits multiple URLs on newlines', () => {
  const a = 'https://example.com/a.jpg'
  const b = 'https://example.com/b.png'
  const urls = parseAdminMediaUrlList(`${a}\n${b}`)
  assert.deepEqual(urls, [a, b])
})

test('parseAdminMediaUrlList splits comma-separated URLs when each starts with https', () => {
  const a = 'https://example.com/a.jpg'
  const b = 'https://example.com/b.png'
  const urls = parseAdminMediaUrlList(`${a}, ${b}`)
  assert.deepEqual(urls, [a, b])
})
