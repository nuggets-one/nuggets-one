-- Topic-based push delivery. Broadcast nugget publishes through FCM topics so
-- Vercel never has to fan out one HTTP job per device.

ALTER TABLE push_device_tokens
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS failure_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_topic_sync_at timestamptz;

DO $$
BEGIN
  ALTER TABLE push_device_tokens
    DROP CONSTRAINT IF EXISTS push_device_tokens_platform_check;

  ALTER TABLE push_device_tokens
    ADD CONSTRAINT push_device_tokens_platform_check
    CHECK (platform IN ('android', 'ios', 'web'));
END $$;

CREATE TABLE IF NOT EXISTS push_topic_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('immediate', 'digest')),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  slug text,
  batch_key text,
  content_stream text NOT NULL CHECK (content_stream IN ('standard', 'pulse')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT push_topic_outbox_immediate_article CHECK (
    (kind = 'immediate' AND article_id IS NOT NULL AND slug IS NOT NULL AND batch_key IS NULL)
    OR (kind = 'digest' AND article_id IS NULL AND batch_key IS NOT NULL)
  )
);

ALTER TABLE push_topic_outbox ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_topic_outbox_immediate
  ON push_topic_outbox (topic, article_id)
  WHERE kind = 'immediate';

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_topic_outbox_digest
  ON push_topic_outbox (topic, batch_key)
  WHERE kind = 'digest';

CREATE INDEX IF NOT EXISTS idx_push_topic_outbox_unsent
  ON push_topic_outbox (created_at ASC)
  WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS push_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_table text NOT NULL CHECK (
    outbox_table IN (
      'push_topic_outbox',
      'push_immediate_outbox',
      'push_digest_outbox',
      'push_outbox'
    )
  ),
  outbox_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('topic', 'token')),
  target text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_delivery_attempts_outbox
  ON push_delivery_attempts (outbox_table, outbox_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_delivery_attempts_target
  ON push_delivery_attempts (target_type, target, created_at DESC);

COMMENT ON TABLE push_topic_outbox IS
  'FCM topic delivery queue for broadcast push. One row per stream/topic event, not per recipient.';

COMMENT ON TABLE push_delivery_attempts IS
  'Audit log for provider push attempts. Stores topic/token target, result, and provider message id or error.';
