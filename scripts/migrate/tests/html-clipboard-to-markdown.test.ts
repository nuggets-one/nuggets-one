import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import {
  convertClipboardHtmlToMarkdown,
  convertHtmlToMarkdown,
  MAX_SYNC_HTML_CLIPBOARD_CHARS,
} from '../../../lib/markdown/html-clipboard-to-markdown.ts'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const originalDomParser = globalThis.DOMParser
globalThis.DOMParser = dom.window.DOMParser

test.after(() => {
  globalThis.DOMParser = originalDomParser
})

test('convertHtmlToMarkdown preserves hyperlinks as Markdown', () => {
  const html = '<p>Read <a href="https://example.com/article">this article</a> for more.</p>'
  assert.equal(
    convertHtmlToMarkdown(html),
    'Read [this article](https://example.com/article) for more.',
  )
})

test('convertHtmlToMarkdown handles bold and links together', () => {
  const html = '<p><strong><a href="https://nuggets.app">Nuggets</a></strong> rocks.</p>'
  const result = convertHtmlToMarkdown(html)
  assert.match(result, /\*\*\[Nuggets\]\(https:\/\/nuggets\.app\)\*\*/)
  assert.match(result, /rocks/)
})

test('convertHtmlToMarkdown uses href when anchor has no text', () => {
  const html = '<a href="https://example.com"></a>'
  assert.equal(convertHtmlToMarkdown(html), '[https://example.com](https://example.com)')
})

test('convertClipboardHtmlToMarkdown falls back to plain text for huge HTML', () => {
  const huge = `<p>${'x'.repeat(MAX_SYNC_HTML_CLIPBOARD_CHARS)}</p>`
  assert.equal(convertClipboardHtmlToMarkdown(huge, 'plain fallback'), 'plain fallback')
})

test('convertClipboardHtmlToMarkdown falls back when conversion is empty', () => {
  assert.equal(convertClipboardHtmlToMarkdown('<span></span>', 'plain only'), 'plain only')
})
