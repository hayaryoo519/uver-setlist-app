-- 共演者辞書と公演との関連。既存公演の確認状態は変更しない。
CREATE TABLE IF NOT EXISTS live_artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL UNIQUE,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    normalized_aliases TEXT[] NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_collaborators (
    live_id INTEGER NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES live_artists(id) ON DELETE RESTRICT,
    role VARCHAR(32) NOT NULL CHECK (role IN ('co_headliner', 'guest', 'supporting_act')),
    PRIMARY KEY (live_id, artist_id, role)
);
CREATE INDEX IF NOT EXISTS live_collaborators_artist_idx ON live_collaborators(artist_id, live_id);

CREATE TABLE IF NOT EXISTS live_artist_history (
    id BIGSERIAL PRIMARY KEY,
    artist_id INTEGER NOT NULL REFERENCES live_artists(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    before_state JSONB,
    after_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
