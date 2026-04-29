-- Blueprint §13 supplementary indexes (follow-up to initial schema).

-- article_tags lookup (tag → articles)
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id
  ON article_tags (tag_id);

-- bookmarks lookup (user → bookmarks list)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id
  ON bookmarks (user_id, created_at DESC);

-- article_media lookup (article → media; column is sort_order — blueprint §12.2a)
CREATE INDEX IF NOT EXISTS idx_article_media_article_id
  ON article_media (article_id, sort_order);

-- collection entries lookup (collection → articles)
CREATE INDEX IF NOT EXISTS idx_collection_entries_collection_id
  ON community_collection_entries (collection_id, position);
