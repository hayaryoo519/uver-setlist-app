ALTER TABLE lives ADD COLUMN IF NOT EXISTS setlist_status VARCHAR DEFAULT NULL;

ALTER TABLE lives ADD CONSTRAINT chk_setlist_status
  CHECK (setlist_status IN ('NORMAL', 'UNKNOWN_SETLIST', 'PARTIAL_SETLIST') OR setlist_status IS NULL);

CREATE INDEX IF NOT EXISTS idx_lives_setlist_status
  ON lives(setlist_status) WHERE setlist_status IS NOT NULL;
