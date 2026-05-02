-- セトリ予想スコアリングテーブル
CREATE TABLE IF NOT EXISTS prediction_scores (
    id               SERIAL PRIMARY KEY,
    prediction_id    INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    live_id          INTEGER NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_count  INTEGER         NOT NULL DEFAULT 0,
    actual_count     INTEGER         NOT NULL DEFAULT 0,
    matched_count    INTEGER         NOT NULL DEFAULT 0,
    position_matched INTEGER         NOT NULL DEFAULT 0,
    max_streak       INTEGER         NOT NULL DEFAULT 0,
    match_score      NUMERIC(5,2)    NOT NULL DEFAULT 0,
    position_score   NUMERIC(5,2)    NOT NULL DEFAULT 0,
    streak_bonus     NUMERIC(5,2)    NOT NULL DEFAULT 0,
    total_score      NUMERIC(5,2)    NOT NULL DEFAULT 0,
    rank             INTEGER,
    calculated_at    TIMESTAMP       DEFAULT NOW(),
    CONSTRAINT prediction_scores_prediction_id_key UNIQUE (prediction_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_scores_live_id ON prediction_scores(live_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_user_id ON prediction_scores(user_id);
