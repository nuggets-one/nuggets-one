-- Extend push_digest_buffer.content_stream for Tech x VC and Geopolitics publishes.
-- Migration 20240001000031 updated push_topic_outbox but missed this table (same gap as charts in migration 25/29).

ALTER TABLE push_digest_buffer DROP CONSTRAINT IF EXISTS push_digest_buffer_content_stream_check;

ALTER TABLE push_digest_buffer
  ADD CONSTRAINT push_digest_buffer_content_stream_check
  CHECK (content_stream IN ('standard', 'pulse', 'charts', 'tech_vc', 'geopolitics'));

NOTIFY pgrst, 'reload schema';
