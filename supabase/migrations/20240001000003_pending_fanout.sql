CREATE TABLE IF NOT EXISTS pending_fanout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  stream text NOT NULL CHECK (stream IN ('standard','pulse')),
  title text NOT NULL,
  batch_key text NOT NULL,
  remaining_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  drained_at timestamptz
);

-- Index for cron drain query (undrained rows only)
CREATE INDEX idx_pending_fanout_undrained
  ON pending_fanout (created_at ASC)
  WHERE drained_at IS NULL;
