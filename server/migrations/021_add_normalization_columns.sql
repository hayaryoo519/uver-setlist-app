-- livesテーブルの正規化カラム追加 (V4)
ALTER TABLE lives ADD COLUMN IF NOT EXISTS normalized_tour_name TEXT;
ALTER TABLE lives ADD COLUMN IF NOT EXISTS normalized_title TEXT;
ALTER TABLE lives ADD COLUMN IF NOT EXISTS normalized_venue TEXT;
ALTER TABLE lives ADD COLUMN IF NOT EXISTS external_source_id TEXT;
ALTER TABLE lives ADD COLUMN IF NOT EXISTS normalization_version TEXT;

-- 検索を高速化するためのインデックス
CREATE INDEX IF NOT EXISTS idx_lives_normalized_tour_name ON lives (normalized_tour_name);
CREATE INDEX IF NOT EXISTS idx_lives_external_source_id ON lives (external_source_id);

-- 説明文の追加
COMMENT ON COLUMN lives.normalized_tour_name IS '正規化されたツアー名（検索・重複排除用）';
COMMENT ON COLUMN lives.normalized_title IS '正規化されたライブタイトル';
COMMENT ON COLUMN lives.normalized_venue IS '正規化された会場名';
COMMENT ON COLUMN lives.external_source_id IS '外部ソースとの紐付け用の一意なハッシュID';
COMMENT ON COLUMN lives.normalization_version IS '正規化に使用したロジックのバージョン';
