-- lives.date の降順インデックス（ダッシュボード・API全般の ORDER BY date DESC を高速化）
CREATE INDEX IF NOT EXISTS idx_lives_date_desc ON lives (date DESC);
