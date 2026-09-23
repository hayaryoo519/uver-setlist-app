ALTER TABLE lives ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE lives ADD COLUMN IF NOT EXISTS collect_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lives_collect_after_pending
    ON lives (collect_after)
    WHERE collect_after IS NOT NULL
      AND setlist_status IS DISTINCT FROM 'NORMAL';

-- 公式発表で開演時刻を確認できた今後の公演だけを補完する。
-- collect_after は通常公演の終演を見込んで開演3時間後とする。
UPDATE lives SET starts_at = '2026-09-24 18:30:00+09', collect_after = '2026-09-24 21:30:00+09'
WHERE date = '2026-09-24' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-09-25 18:30:00+09', collect_after = '2026-09-25 21:30:00+09'
WHERE date = '2026-09-25' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-11-05 18:30:00+09', collect_after = '2026-11-05 21:30:00+09'
WHERE date = '2026-11-05' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-11-21 19:00:00+08', collect_after = '2026-11-21 22:00:00+08'
WHERE date = '2026-11-21' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-01 18:30:00+09', collect_after = '2026-12-01 21:30:00+09'
WHERE date = '2026-12-01' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-02 18:30:00+09', collect_after = '2026-12-02 21:30:00+09'
WHERE date = '2026-12-02' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-20 16:00:00+09', collect_after = '2026-12-20 19:00:00+09'
WHERE date = '2026-12-20' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-21 18:30:00+09', collect_after = '2026-12-21 21:30:00+09'
WHERE date = '2026-12-21' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-25 19:00:00+09', collect_after = '2026-12-25 22:00:00+09'
WHERE date = '2026-12-25' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-30 17:00:00+09', collect_after = '2026-12-30 20:00:00+09'
WHERE date = '2026-12-30' AND starts_at IS NULL;
UPDATE lives SET starts_at = '2026-12-31 16:00:00+09', collect_after = '2026-12-31 19:00:00+09'
WHERE date = '2026-12-31' AND starts_at IS NULL;
