-- songs テーブルに論理削除カラムを追加
--
-- 背景:
--   setlists.song_id は ON DELETE CASCADE のため、songs を物理削除すると
--   セトリ履歴ごと消えてしまうバグ（Issue #116）を修正する。
--   deleted_at を導入して物理削除を廃止することで CASCADE 問題を自然解消させる。

ALTER TABLE songs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 削除済みレコードの検索効率化（通常は IS NOT NULL を使うケースは少ないので partial index）
CREATE INDEX IF NOT EXISTS idx_songs_deleted_at ON songs (deleted_at) WHERE deleted_at IS NOT NULL;
