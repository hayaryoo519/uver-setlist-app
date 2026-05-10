-- corrections テーブルの外部キー制約を NO ACTION → SET NULL に変更
--
-- 背景:
--   user_id / reviewed_by / live_id がすべて NO ACTION のため、
--   参照先のユーザーまたはライブを削除しようとするとエラーになるバグを修正する。
--   corrections は「知識データ」として参照先が消えた後も内容を保持すべきため SET NULL が適切。
--
-- 注意:
--   user_id は元々 NOT NULL 制約があるが、SET NULL を機能させるため DROP NOT NULL する。

BEGIN;

-- user_id: NOT NULL 解除 + FK を SET NULL に付け替え
ALTER TABLE corrections
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE corrections
  DROP CONSTRAINT corrections_user_id_fkey;

ALTER TABLE corrections
  ADD CONSTRAINT corrections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- reviewed_by: 元々 nullable なので FK 付け替えのみ
ALTER TABLE corrections
  DROP CONSTRAINT corrections_reviewed_by_fkey;

ALTER TABLE corrections
  ADD CONSTRAINT corrections_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- live_id: 元々 nullable なので FK 付け替えのみ
ALTER TABLE corrections
  DROP CONSTRAINT corrections_live_id_fkey;

ALTER TABLE corrections
  ADD CONSTRAINT corrections_live_id_fkey
  FOREIGN KEY (live_id) REFERENCES lives(id) ON DELETE SET NULL;

COMMIT;
