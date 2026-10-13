ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_token_expires BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_session_version INTEGER;
