-- 公式サイトのスケジュール取り込みで、同じ公演を二重登録しないためのユニーク制約。
-- external_source_id は '<ソース名>:<ソース側ID>' 形式（例: 'uverworld.jp:3186'）。
-- 既存レコードは全て NULL のため、部分ユニークインデックスで衝突しない。
CREATE UNIQUE INDEX IF NOT EXISTS idx_lives_external_source_id_unique
    ON lives (external_source_id)
    WHERE external_source_id IS NOT NULL;
