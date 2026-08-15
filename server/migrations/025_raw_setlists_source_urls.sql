-- X 収集で同一内容の投稿を統合した際に、元投稿URLを全件保持するためのカラム
-- 既存の source_url（最初に見つかった1件）はそのまま残す
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS source_urls TEXT[];

-- 同一投稿を複数の検索クエリで重複カウントしないための投稿ID一覧
ALTER TABLE raw_setlists ADD COLUMN IF NOT EXISTS source_post_ids TEXT[];
