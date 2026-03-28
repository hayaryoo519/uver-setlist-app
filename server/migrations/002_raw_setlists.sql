-- raw_setlists テーブル（セトリ下書き管理）
CREATE TABLE IF NOT EXISTS raw_setlists (
    id SERIAL PRIMARY KEY,
    live_id INTEGER REFERENCES lives(id) ON DELETE SET NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    raw_text TEXT NOT NULL,
    parsed_json JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_setlists_status ON raw_setlists(status);
CREATE INDEX IF NOT EXISTS idx_raw_setlists_live_id ON raw_setlists(live_id);
