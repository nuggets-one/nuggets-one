-- Charts of the Week — third content stream (charts).
-- Extends content_stream CHECK constraints, feed index, and notification prefs.

-- ─── articles.content_stream ───────────────────────────────────────────────

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_stream_check;

ALTER TABLE articles
  ADD CONSTRAINT articles_content_stream_check
  CHECK (content_stream IN ('standard', 'pulse', 'charts'));

CREATE INDEX IF NOT EXISTS idx_articles_feed_charts
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'charts';

-- ─── user_notifications.content_stream ─────────────────────────────────────

ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_content_stream_check;

ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_content_stream_check
  CHECK (content_stream IS NULL OR content_stream IN ('standard', 'pulse', 'charts'));

-- ─── pending_fanout.stream ───────────────────────────────────────────────────

ALTER TABLE pending_fanout DROP CONSTRAINT IF EXISTS pending_fanout_stream_check;

ALTER TABLE pending_fanout
  ADD CONSTRAINT pending_fanout_stream_check
  CHECK (stream IN ('standard', 'pulse', 'charts'));

-- ─── push_outbox.content_stream ────────────────────────────────────────────

ALTER TABLE push_outbox DROP CONSTRAINT IF EXISTS push_outbox_content_stream_check;

ALTER TABLE push_outbox
  ADD CONSTRAINT push_outbox_content_stream_check
  CHECK (content_stream IN ('standard', 'pulse', 'charts'));

-- ─── push_topic_outbox.content_stream ──────────────────────────────────────

ALTER TABLE push_topic_outbox DROP CONSTRAINT IF EXISTS push_topic_outbox_content_stream_check;

ALTER TABLE push_topic_outbox
  ADD CONSTRAINT push_topic_outbox_content_stream_check
  CHECK (content_stream IN ('standard', 'pulse', 'charts'));

-- ─── push guest/immediate/digest outbox tables (if present) ─────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'push_immediate_outbox',
    'push_digest_outbox',
    'push_guest_tokens'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_content_stream_check',
        tbl, tbl
      );
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I_content_stream_check
         CHECK (content_stream IN (''standard'', ''pulse'', ''charts''))',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ─── notification_preferences.stream_charts ────────────────────────────────

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS stream_charts boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_active_charts
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_charts = true;

-- ─── get_notification_recipients RPC ───────────────────────────────────────

CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_stream_col text
)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_stream_col NOT IN ('stream_standard', 'stream_pulse', 'stream_charts') THEN
    RAISE EXCEPTION 'Invalid stream column: %', p_stream_col;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT u.id AS user_id
     FROM auth.users u
     LEFT JOIN public.notification_preferences np
       ON np.user_id = u.id
     WHERE COALESCE(np.mute_all, false) = false
       AND COALESCE(np.%I, true) = true',
    p_stream_col
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_recipients(text) TO service_role;

NOTIFY pgrst, 'reload schema';
