-- Deploy notification fan-out primitives if missing (DBs that skipped PR-02c migrations).

CREATE TABLE IF NOT EXISTS pending_fanout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  stream text NOT NULL CHECK (stream IN ('standard', 'pulse')),
  title text NOT NULL,
  batch_key text NOT NULL,
  remaining_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  drained_at timestamptz
);

ALTER TABLE pending_fanout
  ADD COLUMN IF NOT EXISTS drain_attempts smallint NOT NULL DEFAULT 0;

ALTER TABLE pending_fanout
  ADD COLUMN IF NOT EXISTS last_drain_error text;

CREATE INDEX IF NOT EXISTS idx_pending_fanout_undrained
  ON pending_fanout (created_at ASC)
  WHERE drained_at IS NULL;

CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_stream_col text
)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_stream_col NOT IN ('stream_standard', 'stream_pulse') THEN
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

ALTER TABLE pending_fanout ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
