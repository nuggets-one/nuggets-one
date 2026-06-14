-- Add `source` tag dimension (chart/data providers separate from subtopic).

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_dimension_check;

ALTER TABLE tags
  ADD CONSTRAINT tags_dimension_check
  CHECK (
    dimension IS NULL OR dimension IN ('format', 'domain', 'subtopic', 'source')
  );

UPDATE tags
SET dimension = 'source'
WHERE slug IN ('goldman-sachs', 'bloomberg', 'jpmorgan')
  AND dimension = 'subtopic';
