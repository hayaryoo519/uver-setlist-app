const db = require('../db');

/**
 * 予想セトリのスコアを計算する
 *
 * スコア式:
 *   denominator = max(actual_count, predicted_count)
 *   match_score    = round((matched_count / denominator) × 70, 2)
 *   position_score = round((position_matched / denominator) × 20, 2)
 *   streak_bonus   = round(min(max_streak × 2, 10), 2)
 *   total_score    = match_score + position_score + streak_bonus
 */

/**
 * 最大連続一致数を求める
 * @param {string[]} predicted - 予想曲順（normalized_title）
 * @param {string[]} actual    - 実際の曲順（normalized_title）
 */
function calcMaxStreak(predicted, actual) {
    const actualSet = new Set(actual);
    let maxStreak = 0;
    let currentStreak = 0;

    for (const song of predicted) {
        if (actualSet.has(song)) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    return maxStreak;
}

/**
 * 1件の予想に対してスコアを計算し prediction_scores へ UPSERT する
 * @param {number} predictionId
 * @returns {object} 算出結果
 */
async function calculateScore(predictionId) {
    // 予想データ取得
    const predRes = await db.query(
        `SELECT p.id, p.live_id, p.user_id, p.songs
         FROM predictions p
         WHERE p.id = $1`,
        [predictionId]
    );
    if (predRes.rows.length === 0) throw new Error(`prediction ${predictionId} not found`);

    const prediction = predRes.rows[0];
    const predictedSongs = Array.isArray(prediction.songs) ? prediction.songs : [];

    // 実際のセトリ取得（setlist_status = 'NORMAL' のライブ）
    const liveRes = await db.query(
        `SELECT l.id, l.setlist_status,
                COALESCE(
                    (SELECT array_agg(s.normalized_title ORDER BY ls.position)
                     FROM live_songs ls
                     JOIN songs s ON s.id = ls.song_id
                     WHERE ls.live_id = l.id),
                    '{}'::text[]
                ) AS actual_songs
         FROM lives l
         WHERE l.id = $1`,
        [prediction.live_id]
    );
    if (liveRes.rows.length === 0) throw new Error(`live ${prediction.live_id} not found`);

    const live = liveRes.rows[0];
    if (live.setlist_status !== 'NORMAL') {
        throw new Error(`live ${prediction.live_id} is not NORMAL (status: ${live.setlist_status})`);
    }

    const actualSongs = live.actual_songs || [];

    // 予想曲リストをnormalized_titleへ変換
    const predictedTitles = await normalizePredictedSongs(predictedSongs);
    const actualTitles = actualSongs.map(s => s).filter(Boolean);

    // マッチ数・順番一致数・最大連続数を算出
    const actualSet = new Set(actualTitles);
    const matchedCount = predictedTitles.filter(t => actualSet.has(t)).length;

    const minLen = Math.min(predictedTitles.length, actualTitles.length);
    let positionMatched = 0;
    for (let i = 0; i < minLen; i++) {
        if (predictedTitles[i] === actualTitles[i]) positionMatched++;
    }

    const maxStreak = calcMaxStreak(predictedTitles, actualTitles);

    const predictedCount = predictedTitles.length;
    const actualCount = actualTitles.length;
    const denominator = Math.max(actualCount, predictedCount);

    let matchScore = 0, positionScore = 0, streakBonus = 0, totalScore = 0;
    if (denominator > 0) {
        matchScore    = Math.round((matchedCount / denominator) * 70 * 100) / 100;
        positionScore = Math.round((positionMatched / denominator) * 20 * 100) / 100;
        streakBonus   = Math.round(Math.min(maxStreak * 2, 10) * 100) / 100;
        totalScore    = Math.round((matchScore + positionScore + streakBonus) * 100) / 100;
    }

    // UPSERT
    await db.query(
        `INSERT INTO prediction_scores
            (prediction_id, live_id, user_id,
             predicted_count, actual_count, matched_count,
             position_matched, max_streak,
             match_score, position_score, streak_bonus, total_score,
             calculated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())
         ON CONFLICT (prediction_id) DO UPDATE SET
             predicted_count  = EXCLUDED.predicted_count,
             actual_count     = EXCLUDED.actual_count,
             matched_count    = EXCLUDED.matched_count,
             position_matched = EXCLUDED.position_matched,
             max_streak       = EXCLUDED.max_streak,
             match_score      = EXCLUDED.match_score,
             position_score   = EXCLUDED.position_score,
             streak_bonus     = EXCLUDED.streak_bonus,
             total_score      = EXCLUDED.total_score,
             calculated_at    = NOW()`,
        [
            predictionId, prediction.live_id, prediction.user_id,
            predictedCount, actualCount, matchedCount,
            positionMatched, maxStreak,
            matchScore, positionScore, streakBonus, totalScore
        ]
    );

    return { predictionId, matchScore, positionScore, streakBonus, totalScore, matchedCount, predictedCount, actualCount };
}

/**
 * 予想曲リスト（song_id 配列または {song_id} オブジェクト配列）を
 * normalized_title 配列に変換する
 */
async function normalizePredictedSongs(songs) {
    if (!songs || songs.length === 0) return [];

    const songIds = songs.map(s => (typeof s === 'object' ? s.song_id || s.id : s)).filter(Boolean);
    if (songIds.length === 0) return [];

    const res = await db.query(
        `SELECT id, normalized_title FROM songs WHERE id = ANY($1::int[])`,
        [songIds]
    );
    const map = new Map(res.rows.map(r => [r.id, r.normalized_title]));

    return songIds.map(id => map.get(id)).filter(Boolean);
}

/**
 * 指定ライブの全予想スコアを一括再計算する
 * @param {number} liveId
 * @returns {{ success: number, failed: number, errors: string[] }}
 */
async function recalculateScoresForLive(liveId) {
    const predsRes = await db.query(
        `SELECT id FROM predictions WHERE live_id = $1`,
        [liveId]
    );

    let success = 0, failed = 0;
    const errors = [];

    for (const row of predsRes.rows) {
        try {
            await calculateScore(row.id);
            success++;
        } catch (err) {
            failed++;
            errors.push(`prediction ${row.id}: ${err.message}`);
        }
    }

    return { success, failed, errors };
}

module.exports = { calculateScore, recalculateScoresForLive };
