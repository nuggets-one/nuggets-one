import assert from 'node:assert/strict'
import test from 'node:test'

// Mirror the RPC-missing detector without importing server-only modules in migrate tests.
function isMissingTagsRpc(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || /upsert_article_tags/i.test(error.message ?? '')
}

test('isMissingTagsRpc detects PostgREST schema cache miss', () => {
  assert.equal(
    isMissingTagsRpc({
      code: 'PGRST202',
      message:
        'Could not find the function public.upsert_article_tags(p_article_id, p_tag_slugs) in the schema cache',
    }),
    true
  )
})

test('isMissingTagsRpc ignores unknown slug errors', () => {
  assert.equal(isMissingTagsRpc({ code: 'P0001', message: 'unknown_tag_slugs' }), false)
})
