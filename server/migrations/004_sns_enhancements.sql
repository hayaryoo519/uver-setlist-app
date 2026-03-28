-- SNS 収集システム 最終品質強化に向けたスキーマ変更

-- 1. raw_setlists テーブルの拡張
-- 重複投稿数と公式フラグを追加
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS duplicate_count INT DEFAULT 1;
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS official_setlist BOOLEAN DEFAULT false;

-- 2. コレクターログ用テーブルの作成
-- 収集の成功・失敗やレベルを記録
CREATE TABLE IF NOT EXISTS collector_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10), -- 'info', 'error', 'warn'
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの追加 (任意: 検索性を考慮)
CREATE INDEX IF NOT EXISTS idx_raw_setlists_official ON raw_setlists(official_setlist);
