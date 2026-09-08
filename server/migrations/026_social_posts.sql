-- SNS投稿候補と公開履歴
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL DEFAULT 'x',
    post_type VARCHAR(50) NOT NULL,
    live_id INTEGER REFERENCES lives(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    external_post_id VARCHAR(255),
    error_message TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT social_posts_platform_check CHECK (platform IN ('x')),
    CONSTRAINT social_posts_status_check CHECK (status IN ('draft', 'approved', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_social_posts_status_created_at
    ON social_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_live_id
    ON social_posts(live_id);
