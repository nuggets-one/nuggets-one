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

test('card preview preserves basic markdown formatting from excerpt fallback', () => {
  const preview = resolveCardPreview({
    content_markdown: null,
    excerpt: 'A **bold** and *italic* quote with [00:04:28](#yt=268).',
  })

  assert.equal(preview, 'A **bold** and *italic* quote with [00:04:28](#yt=268).')
})

test('card preview preserves legacy html blockquotes from excerpt fallback', () => {
  const preview = resolveCardPreview({
    content_markdown: null,
    excerpt: `
<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-4 text-slate-600 dark:text-slate-400">
  <p class="mb-1.5">"If you have a take a lick of the lollipop of mediocrity you will suck forever." - <strong class="font-bold text-slate-900 dark:text-slate-100">Sally Kornbluth (quoting a Duke colleague)</strong> [<button type="button" class="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit rounded-sm transition-colors">00:04:28</button>]</p>
</blockquote>
<p>Trailing context still appears after the quote.</p>
`,
  })

  assert.equal(
    preview,
    '> "If you have a take a lick of the lollipop of mediocrity you will suck forever." - **Sally Kornbluth (quoting a Duke colleague)** [00:04:28]\n\nTrailing context still appears after the quote.'
  )
})

test('card preview preserves legacy html links and emphasis from excerpt fallback', () => {
  const preview = resolveCardPreview({
    content_markdown: null,
    excerpt: `
<p><a href="#yt=154">00:04:28</a> <strong>Markets</strong> are <em>repricing</em>.</p>
`,
  })

  assert.equal(
    preview,
    '[00:04:28](#yt=154) **Markets** are *repricing*.'
  )
})
