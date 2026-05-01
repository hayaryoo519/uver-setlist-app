-- ユーザープロフィールの公開/非公開フラグ
-- true = 参戦記録（参戦ライブ・楽曲ランキング）を公開
-- false = 参戦記録を非公開（予想は常に公開）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
