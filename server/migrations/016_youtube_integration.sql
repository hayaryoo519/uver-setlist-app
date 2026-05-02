-- songs テーブルに YouTube Video ID を追加
ALTER TABLE songs ADD COLUMN IF NOT EXISTS yt_video_id TEXT;
CREATE INDEX IF NOT EXISTS idx_songs_yt_video_id ON songs(yt_video_id);

-- Google (YouTube) トークン保存用テーブル
CREATE TABLE IF NOT EXISTS user_google_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    encryption_version INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- playlist_history にプラットフォームカラムを追加
ALTER TABLE playlist_history ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'spotify';

-- 既存のデータを 'spotify' に更新（念のため）
UPDATE playlist_history SET platform = 'spotify' WHERE platform IS NULL;

-- 複合インデックスの更新（プラットフォームを含める）
DROP INDEX IF EXISTS idx_playlist_history_user_live;
CREATE INDEX idx_playlist_history_user_live_platform ON playlist_history(user_id, live_id, platform);
