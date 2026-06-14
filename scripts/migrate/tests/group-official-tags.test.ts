import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countForSlug,
  filterTagsVisibleInPicker,
  groupTagsByDimension,
  sortOfficialTagsByDimensionThenLabel,
  sortTagsByCountDesc,
  topOfficialTagsByCount,
} from '../../../lib/feed/group-official-tags'
import type { TagSummary } from '../../../types/article'

const t = (
  slug: string,
  label: string,
  dimension: TagSummary['dimension']
): TagSummary => ({
  id: slug,
  slug,
  label,
  dimension,
  is_official: true,
})

test('groupTagsByDimension buckets null as uncategorized and source separately', () => {
  const g = groupTagsByDimension([
    t('a', 'A', 'format'),
    t('b', 'B', 'domain'),
    t('c', 'C', 'subtopic'),
    t('s', 'S', 'source'),
    t('u', 'U', null),
  ])
  assert.equal(g.format.length, 1)
  assert.equal(g.domain.length, 1)
  assert.equal(g.subtopic.length, 1)
  assert.equal(g.source.length, 1)
  assert.equal(g.uncategorized.length, 1)
  assert.equal(g.uncategorized[0]?.slug, 'u')
})

test('sortTagsByCountDesc orders by count then label', () => {
  const tags = [t('low', 'Zed', 'format'), t('high', 'Alpha', 'format'), t('mid', 'Beta', 'format')]
  const counts = { low: 1, high: 10, mid: 5 }
  const sorted = sortTagsByCountDesc(tags, counts).map((x) => x.slug)
  assert.deepEqual(sorted, ['high', 'mid', 'low'])
})

test('countForSlug returns 0 for missing or non-positive', () => {
  assert.equal(countForSlug({}, 'x'), 0)
  assert.equal(countForSlug({ x: 0 }, 'x'), 0)
  assert.equal(countForSlug({ x: 3 }, 'x'), 3)
})

test('topOfficialTagsByCount returns top slice by count', () => {
  const tags = [
    t('a', 'A', 'format'),
    t('b', 'B', 'format'),
    t('c', 'C', 'format'),
  ]
  const counts = { a: 1, b: 10, c: 5 }
  const top = topOfficialTagsByCount(tags, counts, 2).map((x) => x.slug)
  assert.deepEqual(top, ['b', 'c'])
})

test('filterTagsVisibleInPicker hides zero count unless staged', () => {
  const tags = [t('a', 'A', 'format'), t('b', 'B', 'format')]
  const counts = { a: 0, b: 5 }
  assert.deepEqual(
    filterTagsVisibleInPicker(tags, counts, []).map((x) => x.slug),
    ['b']
  )
  assert.deepEqual(
    filterTagsVisibleInPicker(tags, counts, ['a']).map((x) => x.slug),
    ['a', 'b']
  )
})

test('sortOfficialTagsByDimensionThenLabel orders dimensions then label', () => {
  const sorted = sortOfficialTagsByDimensionThenLabel([
    t('z-dom', 'Z', 'domain'),
    t('a-src', 'A', 'source'),
    t('a-sub', 'A', 'subtopic'),
    t('a-fmt', 'A', 'format'),
    t('b-fmt', 'B', 'format'),
    t('u', 'U', null),
  ]).map((x) => x.slug)
  assert.deepEqual(sorted, ['a-fmt', 'b-fmt', 'z-dom', 'a-sub', 'a-src', 'u'])
})
