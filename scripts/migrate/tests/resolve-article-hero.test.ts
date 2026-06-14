import assert from 'node:assert/strict'
import test from 'node:test'
import {
  describeCardCoverPreview,
  resolveArticleHeroFields,
} from '../../../lib/ui/resolve-article-hero'

function extractYouTubeVideoId(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const raw = url.trim()
  const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (shortMatch) return shortMatch[1]
  const longMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (longMatch) return longMatch[1]
  return null
}

test('extractYouTubeVideoId from youtu.be short link', () => {
  const id = extractYouTubeVideoId('https://youtu.be/e_2opghuq88?si=635YYsgR3ol13e64')
  assert.equal(id, 'e_2opghuq88')
})

test('extractYouTubeVideoId from watch URL', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  )
})

test('resolveArticleHeroFields ignores non-image hero_thumb and falls back to media_urls', () => {
  const xStatus = 'https://x.com/user/status/2046338149870354574'
  const twitterImage =
    'https://pbs.twimg.com/media/ABC123?format=jpg&name=large'

  const resolved = resolveArticleHeroFields({
    source_url: xStatus,
    hero_thumb_url: xStatus,
    media_urls: [twitterImage],
  })

  assert.equal(resolved.hero_media_kind, 'image')
  assert.equal(resolved.hero_thumb_url, twitterImage)
})

test('resolveArticleHeroFields treats JPMorgan chart URL with v= cache-buster as image cover', () => {
  const jpmChart =
    'https://cdn.jpmorganfunds.com/content/dam/jpm-am-aem/americas/us/en/insights/market-insights/wmr/chart_of_the_week.png?v=1780907738879'

  const resolved = resolveArticleHeroFields({
    source_url: null,
    hero_thumb_url: null,
    media_urls: [jpmChart],
  })

  assert.equal(resolved.hero_media_kind, 'image')
  assert.equal(resolved.hero_thumb_url, jpmChart)

  const preview = describeCardCoverPreview(resolved)
  assert.equal(preview.kind, 'image')
  assert.equal(preview.posterUrl, jpmChart)
  assert.match(preview.summary, /selected image cover/)
})

test('resolveArticleHeroFields treats Goldman Sachs chart URL as image cover', () => {
  const gsChart =
    'https://am.gs.com/cms-assets/gsam-app/images/chart-graph/english/2026/chart-of-the-week_060326_d.png'

  const resolved = resolveArticleHeroFields({
    source_url: null,
    hero_thumb_url: gsChart,
    media_urls: [gsChart],
  })

  assert.equal(resolved.hero_media_kind, 'image')
  assert.equal(resolved.hero_thumb_url, gsChart)

  const preview = describeCardCoverPreview(resolved)
  assert.equal(preview.kind, 'image')
  assert.equal(preview.posterUrl, gsChart)
})
