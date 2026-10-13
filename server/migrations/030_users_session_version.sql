-- Incremented with credential/account changes to revoke previously issued JWTs.
-- Existing tokens without this claim remain valid only while the version is zero.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
