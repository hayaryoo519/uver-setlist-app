-- 画像OCRの重複検知と信頼度記録用のカラムを追加
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS raw_text_hash VARCHAR(32);
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS confidence DECIMAL(3, 2);

-- 重複検知を高速化するためのインデックス (MD5ハッシュ用)
CREATE INDEX IF NOT EXISTS idx_raw_setlists_hash ON raw_setlists(raw_text_hash);
