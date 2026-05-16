-- ベーステーブル定義
-- migration 001 より前から存在するテーブル群。
-- 新規環境では migrate.js が最初にこのファイルを適用し、
-- 以降の 001〜 が差分を積み上げる。

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    reset_password_token VARCHAR(255),
    reset_password_expires BIGINT
);

CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    album VARCHAR(255),
    release_year INTEGER,
    mv_url VARCHAR(255),
    author VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS lives (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    tour_name VARCHAR(255),
    type VARCHAR(50),
    prefecture VARCHAR(50),
    special_note VARCHAR(255),
    normalized_title VARCHAR(255) NOT NULL DEFAULT '',
    normalized_venue VARCHAR(255) NOT NULL DEFAULT '',
    normalized_tour_name VARCHAR(255) NOT NULL DEFAULT '',
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    import_batch_id VARCHAR(255),
    is_manually_edited BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    raw_import_title VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS setlists (
    id SERIAL PRIMARY KEY,
    live_id INTEGER REFERENCES lives(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER,
    note VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS attendance (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    live_id INTEGER NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, live_id)
);

CREATE TABLE IF NOT EXISTS corrections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    live_id INTEGER REFERENCES lives(id),
    live_date TEXT,
    live_venue TEXT,
    live_title TEXT,
    correction_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    admin_note TEXT,
    suggested_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_corrections_live_id ON corrections(live_id);
CREATE INDEX IF NOT EXISTS idx_corrections_user_id ON corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON corrections(status);
CREATE INDEX IF NOT EXISTS idx_corrections_created_at ON corrections(created_at);

CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT now(),
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp DESC);
