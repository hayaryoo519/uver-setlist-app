ALTER TABLE songs ADD COLUMN IF NOT EXISTS normalized_title VARCHAR;

UPDATE songs
SET normalized_title = lower(regexp_replace(trim(title), '\s+', ' ', 'g'))
WHERE normalized_title IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_normalized_title
  ON songs(normalized_title) WHERE normalized_title IS NOT NULL;
