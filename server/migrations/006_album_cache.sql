-- アルバム画像キャッシュ用テーブルの作成
CREATE TABLE IF NOT EXISTS album_cache (
    album_title VARCHAR(255) PRIMARY KEY,
    image_url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの追加（検索の高速化）
CREATE INDEX IF NOT EXISTS idx_album_cache_title ON album_cache(album_title);
