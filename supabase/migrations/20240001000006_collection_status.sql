ALTER TABLE community_collections
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_collections'
      AND column_name = 'is_' || 'published'
  ) THEN
    EXECUTE 'UPDATE community_collections SET status = CASE WHEN ' ||
      quote_ident('is_' || 'published') ||
      ' THEN ''published'' ELSE ''draft'' END';

    EXECUTE 'ALTER TABLE community_collections DROP COLUMN ' ||
      quote_ident('is_' || 'published');
  END IF;
END $$;
