ALTER TABLE community_collections
  ADD COLUMN IF NOT EXISTS cover_image_url text;
