-- Guest push tokens, digest buffers, and immediate/digest outboxes.

ALTER TABLE push_device_tokens
  ADD COLUMN IF NOT EXISTS install_id uuid,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

UPDATE push_device_tokens
SET install_id = gen_random_uuid()
WHERE install_id IS NULL;

ALTER TABLE push_device_tokens
  ALTER COLUMN install_id SET NOT NULL;

ALTER TABLE push_device_tokens
  DROP CONSTRAINT IF EXISTS push_device_tokens_user_id_fkey;

ALTER TABLE push_device_tokens
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE push_device_tokens
  ADD CONSTRAINT push_device_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_device_tokens_install_id
  ON push_device_tokens (install_id);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_guest
  ON push_device_tokens (updated_at DESC)
  WHERE user_id IS NULL;

DROP POLICY IF EXISTS "push_device_tokens: user owns row" ON push_device_tokens;

CREATE POLICY "push_device_tokens: user reads own"
  ON push_device_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_device_tokens: user updates own"
  ON push_device_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_device_tokens: user deletes own"
  ON push_device_tokens FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS push_digest_buffer (
  batch_key text PRIMARY KEY,
  content_stream text NOT NULL CHECK (content_stream IN ('standard', 'pulse')),
  article_count int NOT NULL DEFAULT 0,
  sample_title text NOT NULL DEFAULT '',
  interval_hours int NOT NULL DEFAULT 1 CHECK (interval_hours IN (1, 2, 3)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_digest_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('guest', 'user')),
  token text REFERENCES push_device_tokens(token) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_key text NOT NULL,
  body text NOT NULL,
  content_stream text NOT NULL CHECK (content_stream IN ('standard', 'pulse')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT push_digest_outbox_audience_target CHECK (
    (audience = 'guest' AND token IS NOT NULL AND user_id IS NULL)
    OR (audience = 'user' AND user_id IS NOT NULL AND token IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_digest_outbox_guest
  ON push_digest_outbox (token, batch_key)
  WHERE audience = 'guest';

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_digest_outbox_user
  ON push_digest_outbox (user_id, batch_key)
  WHERE audience = 'user';

CREATE INDEX IF NOT EXISTS idx_push_digest_outbox_unsent
  ON push_digest_outbox (created_at ASC)
  WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS push_immediate_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('guest', 'user')),
  token text REFERENCES push_device_tokens(token) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content_stream text NOT NULL CHECK (content_stream IN ('standard', 'pulse')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT push_immediate_outbox_audience_target CHECK (
    (audience = 'guest' AND token IS NOT NULL AND user_id IS NULL)
    OR (audience = 'user' AND user_id IS NOT NULL AND token IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_immediate_outbox_guest
  ON push_immediate_outbox (token, article_id)
  WHERE audience = 'guest';

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_immediate_outbox_user
  ON push_immediate_outbox (user_id, article_id)
  WHERE audience = 'user';

CREATE INDEX IF NOT EXISTS idx_push_immediate_outbox_unsent
  ON push_immediate_outbox (created_at ASC)
  WHERE sent_at IS NULL;

INSERT INTO site_settings (setting_key, setting_value)
VALUES ('push_digest_interval_hours', '1')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE push_digest_buffer IS
  'Accumulates publish counts per digest window; flushed to push_digest_outbox by cron.';
