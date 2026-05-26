import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canManageArticle,
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

test('canManageArticle true for admin regardless of created_by', () => {
  assert.equal(canManageArticle('user-1', null, true), true)
  assert.equal(canManageArticle('user-1', 'user-2', true), true)
})

test('canManageArticle true for owner when not admin', () => {
  assert.equal(canManageArticle('user-1', 'user-1', false), true)
})

test('canManageArticle false for non-owner non-admin', () => {
  assert.equal(canManageArticle('user-1', 'user-2', false), false)
  assert.equal(canManageArticle(null, 'user-1', false), false)
})

test('sanitizeDeleteRedirectTo allows home and bookmarks', () => {
  assert.equal(sanitizeDeleteRedirectTo('/'), '/')
  assert.equal(sanitizeDeleteRedirectTo('/bookmarks'), '/bookmarks')
})

test('sanitizeDeleteRedirectTo rejects unknown paths', () => {
  assert.equal(sanitizeDeleteRedirectTo('/admin/articles'), '/')
  assert.equal(sanitizeDeleteRedirectTo('https://evil.com'), '/')
})
