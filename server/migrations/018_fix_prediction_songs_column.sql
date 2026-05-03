-- order_index で手動作成された環境への後方互換
-- migration 008 通りに作成された環境では何も変わらない（no-op）
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'prediction_songs'
      AND column_name  = 'order_index'
  ) THEN
    ALTER TABLE prediction_songs RENAME COLUMN order_index TO position;
  END IF;
END $$;
