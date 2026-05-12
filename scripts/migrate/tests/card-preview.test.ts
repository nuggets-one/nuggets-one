import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCardPreviewFromMarkdown,
  resolveCardPreview,
} from '../../shared/article-preview'

test('card preview preserves simple quote formatting from body markdown', () => {
  const preview = buildCardPreviewFromMarkdown(`
# Heading

> Markets are repricing faster than expected.
> Risk premia have widened materially.

This paragraph should still be included after the quote.
`)

  assert.equal(
    preview,
    '> Markets are repricing faster than expected. Risk premia have widened materially.\n\nThis paragraph should still be included after the quote.'
  )
})

test('card preview falls back to excerpt when body markdown is unavailable', () => {
  const preview = resolveCardPreview({
    content_markdown: null,
    excerpt: '> Short fallback quote',
  })

  assert.equal(preview, '> Short fallback quote')
})
