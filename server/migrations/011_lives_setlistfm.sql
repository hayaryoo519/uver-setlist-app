ALTER TABLE lives ADD COLUMN IF NOT EXISTS setlistfm_id VARCHAR;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lives_setlistfm_id
  ON lives(setlistfm_id) WHERE setlistfm_id IS NOT NULL;
