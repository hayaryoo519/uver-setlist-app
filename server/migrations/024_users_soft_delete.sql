-- users テーブルに論理削除カラムを追加（Issue #115 / #113）
--
-- 背景:
--   退会時に物理削除を廃止し、corrections など知識データへの参照を匿名化して保持する。
--   30日間は deleted_at をクリアすれば復元可能。
--   ログイン時に deleted_at IS NULL チェックを追加することで
--   論理削除済みユーザーの再ログインを防ぐ。

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
