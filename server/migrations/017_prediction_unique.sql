-- 1. 論理削除用のカラムを追加（削除機能 #88 で使用）
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 2. 重複データのクリーンアップ（論理削除されていないデータの中から、古い方を物理削除）
DELETE FROM predictions p
USING predictions p2
WHERE p.user_id = p2.user_id
  AND p.live_id = p2.live_id
  AND p.deleted_at IS NULL
  AND p2.deleted_at IS NULL
  AND (
    p.created_at < p2.created_at OR
    (p.created_at = p2.created_at AND p.id < p2.id)
  );

-- 3. 部分ユニークインデックスの作成（1ライブ1予想制限 #89）
DROP INDEX IF EXISTS idx_unique_user_live_active;
CREATE UNIQUE INDEX idx_unique_user_live_active 
ON predictions(user_id, live_id) 
WHERE (deleted_at IS NULL);
