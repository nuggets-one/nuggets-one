import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOgDescription, OG_DESCRIPTION_MAX_LEN } from '../../../lib/seo/og-description'
import { buildOgPageTitle } from '../../../lib/seo/og-title'
import { getDefaultOgImageUrl, getSiteUrl, OG_DEFAULT_ASSET_VERSION } from '../../../lib/seo/site-url'
import { resolveOgImageUrl } from '../../../lib/seo/og-image'
import { cloudinaryOgFetchUrl } from '../../../lib/ui/cloudinary-fetch'

test('buildOgPageTitle appends site suffix', () => {
  assert.equal(buildOgPageTitle('AI chips'), 'AI chips · Nuggets')
})

test('buildOgDescription truncates at word boundary', () => {
  const long = 'word '.repeat(60).trim()
  const out = buildOgDescription(long)
  assert.ok(out)
  assert.ok(out!.length <= OG_DESCRIPTION_MAX_LEN)
  assert.ok(out!.endsWith('…'))
})

test('getSiteUrl strips trailing slash', () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
  try {
    assert.equal(getSiteUrl(), 'https://example.com')
    assert.equal(getDefaultOgImageUrl(), `https://example.com/og-default.png?v=${OG_DEFAULT_ASSET_VERSION}`)
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = prev
  }
})

test('resolveOgImageUrl falls back when hero is missing', () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://nuggets.one'
  try {
    assert.equal(resolveOgImageUrl(null), `https://nuggets.one/og-default.png?v=${OG_DEFAULT_ASSET_VERSION}`)
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = prev
  }
})

test('resolveOgImageUrl normalizes YouTube page URL to poster', () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://nuggets.one'
  try {
    const out = resolveOgImageUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    assert.equal(out, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = prev
  }
})

test('cloudinaryOgFetchUrl uses 1200x630 transforms when cloud is set', () => {
  const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo'
  try {
    const out = cloudinaryOgFetchUrl('https://example.com/photo.jpg')
    assert.match(out, /w_1200,h_630/)
    assert.match(out, /res\.cloudinary\.com\/demo\/image\/fetch/)
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    else process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev
  }
})
