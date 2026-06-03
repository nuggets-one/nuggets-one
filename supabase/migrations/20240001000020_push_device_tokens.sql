-- Android FCM push: device tokens (user-owned) + async delivery outbox (admin-only writes).

CREATE TABLE IF NOT EXISTS push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user
  ON push_device_tokens (user_id);

ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_device_tokens: user owns row"
  ON push_device_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content_stream text NOT NULL CHECK (content_stream IN ('standard', 'pulse')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_unsent
  ON push_outbox (created_at ASC)
  WHERE sent_at IS NULL;

COMMENT ON TABLE push_device_tokens IS
  'FCM registration tokens for native Android app (Capacitor). User RLS; one row per device token.';

COMMENT ON TABLE push_outbox IS
  'Async FCM delivery queue. Written by publish fan-out via service role; drained by /api/cron/push-outbox.';
