-- Official tags for Charts of the Week stream curation.

INSERT INTO tags (slug, label, dimension, is_official)
VALUES
  ('chart', 'Chart', 'format', true),
  ('goldman-sachs', 'Goldman Sachs', 'subtopic', true),
  ('bloomberg', 'Bloomberg', 'subtopic', true),
  ('jpmorgan', 'JPMorgan', 'subtopic', true)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  dimension = EXCLUDED.dimension,
  is_official = EXCLUDED.is_official;
