-- 既存のライブ/セトリ更新と独立した属性保存。既存データは未確認のまま。
CREATE TABLE IF NOT EXISTS live_metadata (
    live_id INTEGER PRIMARY KEY REFERENCES lives(id) ON DELETE CASCADE,
    candidates JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(candidates) = 'object'),
    overrides JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_metadata_history (
    id BIGSERIAL PRIMARY KEY,
    live_id INTEGER NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    operation VARCHAR(16) NOT NULL CHECK (operation IN ('candidates', 'manual')),
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS live_metadata_history_live_idx ON live_metadata_history(live_id, id);
