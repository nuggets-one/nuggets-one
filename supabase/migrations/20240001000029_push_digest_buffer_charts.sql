-- Extend push_digest_buffer.content_stream for Charts of the Week publishes.
-- Migration 20240001000025 updated push_topic_outbox but missed this table.

ALTER TABLE push_digest_buffer DROP CONSTRAINT IF EXISTS push_digest_buffer_content_stream_check;

ALTER TABLE push_digest_buffer
  ADD CONSTRAINT push_digest_buffer_content_stream_check
  CHECK (content_stream IN ('standard', 'pulse', 'charts'));

NOTIFY pgrst, 'reload schema';
