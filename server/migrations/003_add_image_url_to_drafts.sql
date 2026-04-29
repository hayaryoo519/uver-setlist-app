-- raw_setlists テーブルの拡張（Phase 2: 画像OCR対応）
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS raw_image_url TEXT;
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS source_url TEXT;
