import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHeroForCloudinaryUpload } from '../hero-upload-candidates'

test('classifyHeroForCloudinaryUpload skips Cloudinary and ytimg', () => {
  assert.equal(
    classifyHeroForCloudinaryUpload(
      'https://res.cloudinary.com/clubstorage/image/upload/v1/a.png'
    ).needsUpload,
    false
  )
  assert.equal(
    classifyHeroForCloudinaryUpload(
      'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'
    ).needsUpload,
    false
  )
})

test('classifyHeroForCloudinaryUpload normalizes img.youtube before upload decision', () => {
  const result = classifyHeroForCloudinaryUpload(
    'https://img.youtube.com/vi/abcdefghijk/maxresdefault.jpg'
  )
  assert.equal(result.needsUpload, false)
  assert.equal(result.skipReason, 'youtube_poster')
  assert.equal(result.normalized, 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg')
})

test('classifyHeroForCloudinaryUpload marks apollo academy for upload', () => {
  const result = classifyHeroForCloudinaryUpload(
    'https://www.apolloacademy.com/path/hero.png'
  )
  assert.equal(result.needsUpload, true)
  assert.equal(result.skipReason, null)
})

test('classifyHeroForCloudinaryUpload skips PDF heroes', () => {
  const result = classifyHeroForCloudinaryUpload(
    'https://www.kkr.com/content/dam/kkr/insights/pdf/report.pdf'
  )
  assert.equal(result.needsUpload, false)
  assert.equal(result.skipReason, 'pdf')
})
