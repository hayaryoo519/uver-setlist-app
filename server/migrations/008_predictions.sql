-- 008_predictions.sql
-- セットリスト予想機能用のテーブル作成

-- 1. 予想基本情報テーブル
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    live_id INTEGER REFERENCES lives(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'セットリスト予想',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 予想楽曲テーブル（1つの予想に複数の曲を紐付け）
CREATE TABLE IF NOT EXISTS prediction_songs (
    id SERIAL PRIMARY KEY,
    prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL
);

-- 3. 予想へのいいね管理テーブル
CREATE TABLE IF NOT EXISTS prediction_likes (
    prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (prediction_id, user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_predictions_live_id ON predictions(live_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_songs_prediction_id ON prediction_songs(prediction_id);
