import assert from 'node:assert/strict'
import test from 'node:test'
import { stampNewTabOnExternalAnchors } from '../../../lib/ui/stamp-new-tab-on-external-anchors'

test('stampNewTabOnExternalAnchors adds target blank to https links', () => {
  const input = '<p>Read <a href="https://example.com/article">...more</a></p>'
  const output = stampNewTabOnExternalAnchors(input)

  assert.match(output, /href="https:\/\/example\.com\/article"/)
  assert.match(output, /target="_blank"/)
  assert.match(output, /rel="noopener noreferrer"/)
})

test('stampNewTabOnExternalAnchors adds target blank to http links', () => {
  const input = '<a href="http://example.com">link</a>'
  const output = stampNewTabOnExternalAnchors(input)

  assert.match(output, /target="_blank"/)
  assert.match(output, /rel="noopener noreferrer"/)
})

test('stampNewTabOnExternalAnchors adds target blank to mailto links', () => {
  const input = '<a href="mailto:user@example.com">email</a>'
  const output = stampNewTabOnExternalAnchors(input)

  assert.match(output, /target="_blank"/)
  assert.match(output, /rel="noopener noreferrer"/)
})

test('stampNewTabOnExternalAnchors leaves #yt hash links unchanged', () => {
  const input = '<a href="#yt=268">00:04:28</a>'
  const output = stampNewTabOnExternalAnchors(input)

  assert.equal(output, input)
})

test('stampNewTabOnExternalAnchors is idempotent when target already set', () => {
  const input =
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>'
  const output = stampNewTabOnExternalAnchors(input)

  assert.equal(output, input)
})
