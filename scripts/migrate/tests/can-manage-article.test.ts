import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUserManageArticle,
  sanitizeDeleteRedirectTo,
} from '../../../lib/auth/can-manage-article'

test('canUserManageArticle true when user owns article', () => {
  assert.equal(canUserManageArticle('user-1', 'user-1'), true)
})

test('canUserManageArticle false when user does not own article', () => {
  assert.equal(canUserManageArticle('user-1', 'user-2'), false)
})

test('canUserManageArticle false when created_by is null', () => {
  assert.equal(canUserManageArticle('user-1', null), false)
})

test('canUserManageArticle false when user is missing', () => {
  assert.equal(canUserManageArticle(null, 'user-1'), false)
  assert.equal(canUserManageArticle(undefined, 'user-1'), false)
})

test('sanitizeDeleteRedirectTo allows home and bookmarks', () => {
  assert.equal(sanitizeDeleteRedirectTo('/'), '/')
  assert.equal(sanitizeDeleteRedirectTo('/bookmarks'), '/bookmarks')
})

test('sanitizeDeleteRedirectTo rejects unknown paths', () => {
  assert.equal(sanitizeDeleteRedirectTo('/admin/articles'), '/')
  assert.equal(sanitizeDeleteRedirectTo('https://evil.com'), '/')
})
