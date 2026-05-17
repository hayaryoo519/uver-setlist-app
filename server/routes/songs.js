const router = require('express').Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { authorize, adminCheck } = require('../middleware/authorization');
const { normalizeSongTitle } = require('../utils/songTranslations');

// GET All Songs (for search/autocomplete)
// ?include_deleted=true は管理者トークンが必要
router.get('/', async (req, res) => {
    try {
        const { q, include_deleted } = req.query;

        let isAdmin = false;
        if (include_deleted === 'true') {
            try {
                const token = req.header('token');
                if (token) {
                    const payload = jwt.verify(token, process.env.JWT_SECRET);
                    isAdmin = payload.role === 'admin';
                }
            } catch (_) { /* 無効なトークンは非管理者として扱う */ }
            if (!isAdmin) {
                return res.status(403).json({ message: 'アクセス拒否：管理者権限が必要です' });
            }
        }

        const conditions = [];
        const params = [];

        if (!isAdmin) {
            conditions.push('deleted_at IS NULL');
        }

        if (q) {
            params.push(`%${q}%`);
            conditions.push(`title ILIKE $${params.length}`);
        }

        let query = 'SELECT * FROM songs';
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += q ? ' ORDER BY title ASC LIMIT 20' : ' ORDER BY title ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// GET Song Statistics (Detail Page)
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        let query, queryParams;

        // Check if `id` is a valid integer (ID lookup)
        const isId = /^\d+$/.test(id);

        if (isId) {
            query = `
                SELECT
                  s.*,
                  COALESCE(
                    JSON_AGG(
                      JSON_BUILD_OBJECT(
                        'id', l.id,
                        'tour_name', l.tour_name,
                        'title', l.title,
                        'date', l.date,
                        'venue', l.venue,
                        'type', l.type
                      ) ORDER BY l.date DESC
                    ) FILTER (WHERE l.id IS NOT NULL), '[]'
                  ) as performances,
                  COUNT(l.id)::int as total_performances,
                  MIN(l.date) as first_performed_at,
                  MAX(l.date) as last_performed_at
                FROM songs s
                LEFT JOIN setlists sl ON s.id = sl.song_id
                LEFT JOIN lives l ON sl.live_id = l.id
                WHERE s.id = $1
                GROUP BY s.id
            `;
            queryParams = [id];
        } else {
            // Assume it's a title
            // DECODE URI Component just in case, but usually browser sends decoded path to Express?
            // Express decodes req.params automatically.
            // If URL is /songs/COREPRIDE, id is "COREPRIDE".
            // We need to match this against DB titles with spaces removed.

            // Normalize: remove spaces from input (just in case) and DB field
            const searchTitle = id.replace(/\s+/g, '').toLowerCase();

            query = `
                SELECT
                  s.*,
                  COALESCE(
                    JSON_AGG(
                      JSON_BUILD_OBJECT(
                        'id', l.id,
                        'tour_name', l.tour_name,
                        'title', l.title,
                        'date', l.date,
                        'venue', l.venue,
                        'type', l.type
                      ) ORDER BY l.date DESC
                    ) FILTER (WHERE l.id IS NOT NULL), '[]'
                  ) as performances,
                  COUNT(l.id)::int as total_performances,
                  MIN(l.date) as first_performed_at,
                  MAX(l.date) as last_performed_at
                FROM songs s
                LEFT JOIN setlists sl ON s.id = sl.song_id
                LEFT JOIN lives l ON sl.live_id = l.id
                WHERE REPLACE(LOWER(s.title), ' ', '') = $1
                GROUP BY s.id
            `;
            queryParams = [searchTitle];
        }

        const result = await db.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json("Song not found");
        }

        const song = result.rows[0];

        // 2. Calculate Rarity Metrics
        let daysSinceLast = null;
        let playRate = 0;
        let isRare = false;
        let totalPossibleLives = 0;

        if (song.last_performed_at) {
            const now = new Date();
            const lastDate = new Date(song.last_performed_at);
            const diffTime = Math.abs(now - lastDate);
            daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Calculate Play Rate (Frequency)
            // Fix: Count UNIQUE lives where the song was performed (ignore duplicates in same live)
            // AND exclude future lives from the numerator as well
            const perfCountRes = await db.query(
                `SELECT COUNT(DISTINCT l.id)::int as count 
                 FROM setlists sl
                 JOIN lives l ON sl.live_id = l.id
                 WHERE sl.song_id = $1 AND l.date <= NOW()`,
                [song.id]
            );
            const uniquePastLivesCount = perfCountRes.rows[0].count;

            // Get total number of possible lives since the song's debut (denominator)
            if (song.first_performed_at) {
                const countRes = await db.query(
                    "SELECT COUNT(*)::int as count FROM lives WHERE date >= $1 AND date <= NOW()",
                    [song.first_performed_at]
                );
                totalPossibleLives = countRes.rows[0].count;

                if (totalPossibleLives > 0) {
                    playRate = (uniquePastLivesCount / totalPossibleLives) * 100;
                }
            }

            // Override total_performances to reflect the "valid" count (unique & past) for consistency
            song.total_performances = uniquePastLivesCount;

            // Rare Definition:
            // 1. Revival: Not played in > 3 years (1095 days)
            // 2. Low Frequency: Play Rate < 5%
            const isRevival = daysSinceLast > 1095;
            const isLowFreq = playRate < 5.0 && totalPossibleLives > 10; // Avoid identifying new songs with few lives as rare immediately

            isRare = isRevival || isLowFreq;
        } else {
            // Songs that have NEVER been performed are extremely rare
            isRare = true;
        }

        // Add calculated fields to response
        const responseData = {
            ...song,
            days_since_last: daysSinceLast,
            play_rate: parseFloat(playRate.toFixed(1)),
            is_rare: isRare,
            total_possible_lives: totalPossibleLives
        };

        res.json(responseData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// GET 楽曲演奏推移タイムライン（年別集計）
router.get('/:id/performance-timeline', async (req, res) => {
    try {
        const { id } = req.params;

        // IDまたはタイトルで楽曲を特定する
        const isNumericId = /^\d+$/.test(id);
        const searchParam = isNumericId
            ? id
            : id.replace(/\s+/g, '').toLowerCase();

        const songLookupQuery = isNumericId
            ? 'SELECT id FROM songs WHERE id = $1 AND deleted_at IS NULL'
            : "SELECT id FROM songs WHERE REPLACE(LOWER(title), ' ', '') = $1 AND deleted_at IS NULL";

        const songResult = await db.query(songLookupQuery, [searchParam]);
        if (songResult.rows.length === 0) {
            return res.status(404).json({ message: 'Song not found' });
        }
        const songId = songResult.rows[0].id;

        // 年別演奏回数・ツアー名を集計（NULL tour_name を除外、安全な ARRAY サブクエリを使用）
        const yearlyResult = await db.query(`
            SELECT
              EXTRACT(YEAR FROM l.date)::int AS year,
              COUNT(DISTINCT l.id)::int AS count,
              ARRAY(
                SELECT DISTINCT t
                FROM unnest(
                  ARRAY_AGG(l.tour_name) FILTER (WHERE l.tour_name IS NOT NULL)
                ) t
                ORDER BY t
              ) AS tours
            FROM setlists sl
            JOIN lives l ON sl.live_id = l.id
            WHERE sl.song_id = $1
              AND l.date <= CURRENT_DATE
            GROUP BY EXTRACT(YEAR FROM l.date)
            ORDER BY year ASC
        `, [songId]);

        // 初披露・最終披露日を取得
        const metaResult = await db.query(`
            SELECT
              MIN(l.date) AS first_performed_at,
              MAX(l.date) AS last_performed_at
            FROM setlists sl
            JOIN lives l ON sl.live_id = l.id
            WHERE sl.song_id = $1
              AND l.date <= CURRENT_DATE
        `, [songId]);

        const meta = metaResult.rows[0];
        const firstPerformedAt = meta.first_performed_at
            ? new Date(meta.first_performed_at).toISOString().slice(0, 10)
            : null;
        const lastPerformedAt = meta.last_performed_at
            ? new Date(meta.last_performed_at).toISOString().slice(0, 10)
            : null;

        // 演奏があった全ライブ日付（昇順）を取得してサーバー側で longestGap を計算
        const datesResult = await db.query(`
            SELECT DISTINCT l.date
            FROM setlists sl
            JOIN lives l ON sl.live_id = l.id
            WHERE sl.song_id = $1
              AND l.date <= CURRENT_DATE
            ORDER BY l.date ASC
        `, [songId]);

        const performanceDates = datesResult.rows.map(r => new Date(r.date));

        // longestGap: 連続する披露日の差分の最大値（「その曲が演奏されなかった期間」）
        let longestGapDays = null;
        let longestGapStart = null;
        let longestGapEnd = null;

        for (let i = 1; i < performanceDates.length; i++) {
            const gapDays = Math.floor(
                (performanceDates[i] - performanceDates[i - 1]) / (1000 * 60 * 60 * 24)
            );
            if (longestGapDays === null || gapDays > longestGapDays) {
                longestGapDays = gapDays;
                longestGapStart = performanceDates[i - 1].toISOString().slice(0, 10);
                longestGapEnd = performanceDates[i].toISOString().slice(0, 10);
            }
        }

        // currentGapDays: 最後の披露日から今日まで（負数ガード）
        const currentGapDays = lastPerformedAt
            ? Math.max(0, Math.floor(
                (new Date() - new Date(lastPerformedAt)) / (1000 * 60 * 60 * 24)
              ))
            : null;

        // 年別データを構築し欠番補完（MIN_YEAR: 2000、MAX_YEAR: 現在年）
        const MIN_YEAR = 2000;
        const MAX_YEAR = new Date().getFullYear();
        const startYear = firstPerformedAt
            ? Math.max(MIN_YEAR, parseInt(firstPerformedAt.slice(0, 4)))
            : MIN_YEAR;

        const yearMap = {};
        for (const row of yearlyResult.rows) {
            yearMap[row.year] = { count: row.count, tours: row.tours };
        }

        // ツアー名は5件まで表示、tourLabel は API 側で生成（Tooltip のパフォーマンス最適化）
        const yearlyData = [];
        for (let y = startYear; y <= MAX_YEAR; y++) {
            const entry = yearMap[y] ?? { count: 0, tours: [] };
            const tours = (entry.tours ?? []).slice(0, 5);
            const hasMoreTours = (entry.tours ?? []).length > 5;
            const tourLabel = tours.join(' / ') + (hasMoreTours ? '…他' : '');
            yearlyData.push({ year: y, count: entry.count, tours, hasMoreTours, tourLabel });
        }

        // 演奏密度メタデータを計算
        const totalPerformances = yearlyData.reduce((sum, y) => sum + y.count, 0);
        const activeYears = yearlyData.filter(y => y.count > 0);
        const peakEntry = activeYears.reduce(
            (max, y) => (y.count > (max?.count ?? 0) ? y : max),
            null
        );
        const avgYearlyCount = activeYears.length > 0
            ? parseFloat((totalPerformances / activeYears.length).toFixed(1))
            : 0;

        // 連続披露年数: 最長の連続する演奏あり年の長さ
        let consecutiveYears = 0;
        let currentStreak = 0;
        for (const y of yearlyData) {
            if (y.count > 0) {
                currentStreak++;
                consecutiveYears = Math.max(consecutiveYears, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        res.json({
            totalPerformances,
            firstPerformedAt,
            lastPerformedAt,
            longestGapDays,
            longestGapStart,
            longestGapEnd,
            currentGapDays,
            peakYear: peakEntry?.year ?? null,
            peakCount: peakEntry?.count ?? null,
            avgYearlyCount,
            consecutiveYears: consecutiveYears > 0 ? consecutiveYears : null,
            yearlyData,
        });
    } catch (err) {
        console.error('[performance-timeline] Error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// CREATE a Song (Admin only)
router.post('/', authorize, adminCheck, async (req, res) => {
    try {
        const { title: rawTitle, album, release_year, mv_url, author, spotify_track_id, yt_video_id } = req.body;

        // Normalize title (translate Romaji/English to Japanese if applicable)
        const title = normalizeSongTitle(rawTitle);

        // DEBUG: Log translation attempt
        console.log(`[Song Translation] Input: "${rawTitle}" -> Output: "${title}"${rawTitle !== title ? ' (TRANSLATED)' : ''}`);

        // Check duplicate using the normalized title
        const check = await db.query("SELECT * FROM songs WHERE title = $1", [title]);
        if (check.rows.length > 0) {
            // If exists, update it to include new IDs if they were provided
            const existing = check.rows[0];
            const updated = await db.query(
                `UPDATE songs SET 
                    album = COALESCE($1, album), 
                    release_year = COALESCE($2, release_year), 
                    mv_url = COALESCE($3, mv_url), 
                    author = COALESCE($4, author),
                    spotify_track_id = COALESCE($5, spotify_track_id),
                    yt_video_id = COALESCE($6, yt_video_id)
                 WHERE id = $7 RETURNING *`,
                [album, release_year, mv_url, author, spotify_track_id, yt_video_id, existing.id]
            );
            return res.json(updated.rows[0]);
        }

        const newSong = await db.query(
            "INSERT INTO songs (title, album, release_year, mv_url, author, spotify_track_id, yt_video_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [title, album, release_year, mv_url, author, spotify_track_id, yt_video_id]
        );

        res.json(newSong.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE a Song (Admin only)
router.put('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, album, release_year, mv_url, author, spotify_track_id, yt_video_id } = req.body;

        const updateSong = await db.query(
            "UPDATE songs SET title = $1, album = $2, release_year = $3, mv_url = $4, author = $5, spotify_track_id = $6, yt_video_id = $7 WHERE id = $8 RETURNING *",
            [title, album, release_year, mv_url, author, spotify_track_id, yt_video_id, id]
        );

        if (updateSong.rows.length === 0) {
            return res.status(404).json("Song not found");
        }

        res.json(updateSong.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE a Song (Admin only) — 論理削除（deleted_at を設定）
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            "UPDATE songs SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json("Song not found or already deleted");
        }

        res.json("Song deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// RESTORE a Song (Admin only) — 論理削除を解除
router.patch('/:id/restore', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            "UPDATE songs SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json("Song not found or not deleted");
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// UPDATE Spotify Track ID (Admin only)
router.patch('/:id/spotify', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { spotify_track_id } = req.body;

        const updateSong = await db.query(
            "UPDATE songs SET spotify_track_id = $1 WHERE id = $2 RETURNING *",
            [spotify_track_id, id]
        );

        if (updateSong.rows.length === 0) {
            return res.status(404).json("Song not found");
        }

        res.json(updateSong.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
