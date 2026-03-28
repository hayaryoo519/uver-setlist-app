-- songsテーブルにSpotifyジャケット画像のキャッシュ用カラムを追加
ALTER TABLE songs ADD COLUMN IF NOT EXISTS image_url TEXT;
