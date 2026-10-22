-- Keep legacy columns for existing links and old application SQL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_hash VARCHAR(64);

-- Bound previously non-expiring links without extending expiry on reapplication.
UPDATE users
SET verification_token_expires = (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT + 86400000
WHERE verification_token IS NOT NULL AND verification_token_expires IS NULL;
