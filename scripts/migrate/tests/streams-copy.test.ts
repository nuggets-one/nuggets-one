import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getStreamLabel,
  parseContentStream,
  STREAM_INTRO_COPY,
} from '../../../lib/copy/streams'

test('parseContentStream accepts charts and defaults unknown to standard', () => {
  assert.equal(parseContentStream('charts'), 'charts')
  assert.equal(parseContentStream('pulse'), 'pulse')
  assert.equal(parseContentStream('standard'), 'standard')
  assert.equal(parseContentStream('invalid'), 'standard')
  assert.equal(parseContentStream(null), 'standard')
})

test('getStreamLabel returns full and short labels', () => {
  assert.equal(getStreamLabel('charts'), 'Charts of the Week')
  assert.equal(getStreamLabel('charts', 'short'), 'Charts')
  assert.equal(STREAM_INTRO_COPY.charts.shortLabel, 'Charts')
})
