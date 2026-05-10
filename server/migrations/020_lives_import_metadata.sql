-- livesテーブルのスキーマ拡張 V3
ALTER TABLE lives ADD COLUMN IF NOT EXISTS import_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_lives_import_metadata ON lives USING gin (import_metadata);

-- カラム説明
COMMENT ON COLUMN lives.import_metadata IS '同期・インポート時の詳細メタデータ (JSON形式)';
