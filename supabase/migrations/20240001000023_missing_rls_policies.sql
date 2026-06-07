-- Enable RLS on tables flagged by Supabase database linter (rls_disabled_in_public).
-- Public read paths keep SELECT policies; admin/cron writes use service role (bypasses RLS).

-- ─── Public vocabulary ───────────────────────────────────────────────────────

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: public read"
  ON tags FOR SELECT
  USING (true);

-- ─── Join / media tables (visibility follows published articles) ─────────────

ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_tags: read via published articles"
  ON article_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id
        AND a.status = 'published'
    )
  );

ALTER TABLE article_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_media: read via published articles"
  ON article_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_media.article_id
        AND a.status = 'published'
    )
  );

-- ─── Community collections (public browse is published-only) ─────────────────

ALTER TABLE community_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_collections: public read published"
  ON community_collections FOR SELECT
  USING (status = 'published');

ALTER TABLE community_collection_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_collection_entries: read published entries"
  ON community_collection_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_collections c
      WHERE c.id = community_collection_entries.collection_id
        AND c.status = 'published'
    )
    AND EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = community_collection_entries.article_id
        AND a.status = 'published'
    )
  );

-- ─── Push queues (service-role only — no client policies) ────────────────────
-- Fixes sensitive_columns_exposed on token columns in digest/immediate outboxes.

ALTER TABLE push_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_digest_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_digest_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_immediate_outbox ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
