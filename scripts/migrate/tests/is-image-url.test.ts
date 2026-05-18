import assert from 'node:assert/strict'
import test from 'node:test'
import { isImageUrl } from '../../../lib/ui/is-image-url'

const shouldBeImage = [
  'https://example.com/photo.jpg',
  'https://example.com/photo.jpeg?size=1200',
  'https://example.com/asset.png#hash',
  'https://example.com/cover.webp?itok=abc',
  'https://example.com/vector.svg',
  'https://example.com/vector.svgz?cq=60',
  'https://host.com/cdn-cgi/imagedelivery/acc/token/w=1200',
  'https://pbs.twimg.com/media/ABC123?format=jpg&name=large',
  'https://media.licdn.com/dms/image/C4D22AQ-abc123',
  'https://i.redd.it/abcd1234xyz.png',
  'https://preview.redd.it/abcd1234xyz.jpg?width=1080',
  'https://i.imgur.com/abcdEFG.png',
  'https://static.ffx.io/images/rs:fill:1200:675/example',
  'https://d111111abcdef8.cloudfront.net/path/_images/hero',
  'https://cdn.example.com/resource?id=1&fm=webp&q=70',
  'https://example.com/media/item?format=jpg',
  'https://www.assetmanagement.hsbc.com.hk/en/intermediary/news-and-insights/-/media/Images/uk/investment-monthly-may-2026-chart-4',
  'https://cms.example.com/content/dam/site/media/images/hero-banner',
]

const shouldNotBeImage = [
  'https://news.example.com/article/markets-update',
  'https://example.com/index.html',
  'https://example.com/landing.php',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://example.com/video.mp4',
  'https://example.com/report.pdf',
  'https://video.twimg.com/ext_tw_video/123456/pu/vid/1280x720/abc.mp4',
]

test('isImageUrl recognizes all supported image URL patterns', () => {
  for (const url of shouldBeImage) {
    assert.equal(isImageUrl(url), true, `expected image URL: ${url}`)
  }
})

test('isImageUrl rejects non-image URLs', () => {
  for (const url of shouldNotBeImage) {
    assert.equal(isImageUrl(url), false, `expected non-image URL: ${url}`)
  }
})
