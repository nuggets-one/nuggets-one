-- Per-article rows for digest windows; flush enqueues one push_topic_outbox row per article.

CREATE TABLE IF NOT EXISTS push_digest_buffer_articles (
  batch_key text NOT NULL REFERENCES push_digest_buffer(batch_key) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_key, article_id)
);

ALTER TABLE push_digest_buffer_articles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE push_digest_buffer_articles IS
  'Articles accumulated per digest window; promoted to per-article push_topic_outbox rows on flush.';

-- Legacy summary digest rows (article_id IS NULL) cannot satisfy the new constraint.
-- Mark unsent rows as sent so they are not retried with the old payload shape.
UPDATE push_topic_outbox
SET sent_at = COALESCE(sent_at, now()),
    last_error = COALESCE(last_error, 'superseded by per-article digest migration')
WHERE kind = 'digest'
  AND article_id IS NULL
  AND sent_at IS NULL;

DELETE FROM push_topic_outbox
WHERE kind = 'digest'
  AND article_id IS NULL;

-- Digest outbox rows now carry article_id + slug (one row per article per window).
ALTER TABLE push_topic_outbox DROP CONSTRAINT IF EXISTS push_topic_outbox_immediate_article;

ALTER TABLE push_topic_outbox ADD CONSTRAINT push_topic_outbox_immediate_article CHECK (
  (kind = 'immediate' AND article_id IS NOT NULL AND slug IS NOT NULL AND batch_key IS NULL)
  OR (kind = 'digest' AND article_id IS NOT NULL AND slug IS NOT NULL AND batch_key IS NOT NULL)
);

DROP INDEX IF EXISTS ux_push_topic_outbox_digest;

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_topic_outbox_digest_article
  ON push_topic_outbox (topic, batch_key, article_id)
  WHERE kind = 'digest';

NOTIFY pgrst, 'reload schema';
