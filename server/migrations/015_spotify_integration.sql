-- songs テーブルに Spotify Track ID を追加
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
CREATE INDEX IF NOT EXISTS idx_songs_spotify_track_id ON songs(spotify_track_id);

-- Spotify トークン保存用テーブル
CREATE TABLE IF NOT EXISTS user_spotify_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    encryption_version INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- プレイリスト作成履歴（連打防止用）
CREATE TABLE IF NOT EXISTS playlist_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    live_id INTEGER REFERENCES lives(id) ON DELETE CASCADE,
    playlist_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlist_history_user_live ON playlist_history(user_id, live_id);
