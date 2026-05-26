-- Community collection taxonomy (legacy parentId / isFeatured / featuredOrder)
ALTER TABLE community_collections
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES community_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer;

CREATE INDEX IF NOT EXISTS idx_community_collections_parent_id
  ON community_collections (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_collections_roots
  ON community_collections (status, is_featured, featured_order)
  WHERE parent_id IS NULL;
