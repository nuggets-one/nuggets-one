ALTER TABLE articles
ADD COLUMN IF NOT EXISTS card_preview text;

UPDATE articles
SET card_preview = excerpt
WHERE card_preview IS NULL
  AND excerpt IS NOT NULL;
