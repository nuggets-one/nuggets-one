-- Track failed cron drains so poison rows do not block the queue indefinitely.
ALTER TABLE pending_fanout
  ADD COLUMN IF NOT EXISTS drain_attempts smallint NOT NULL DEFAULT 0;

ALTER TABLE pending_fanout
  ADD COLUMN IF NOT EXISTS last_drain_error text;
