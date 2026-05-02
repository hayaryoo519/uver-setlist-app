const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const { normalizeSongTitle } = require('../utils/songTranslations');

// GET All Songs (for search/autocomplete)
router.get('/', async (req, res) => {
    try {
        // Optional search query
        const { q } = req.query;
        let query = "SELECT * FROM songs";
        let params = [];

        if (q) {
            query += " WHERE title ILIKE $1";
            params.push(`%${q}%`);
        }

        query += " ORDER BY title ASC";

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ message: "Server Error", error: err.message });
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

// DELETE a Song (Admin only)
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteSong = await db.query("DELETE FROM songs WHERE id = $1", [id]);

        if (deleteSong.rowCount === 0) {
            return res.status(404).json("Song not found");
        }

        res.json("Song deleted");
    } catch (err) {
        console.error(err.message);
        // If FK constraint fails (e.g. used in setlist), 500 will be returned.
        // Ideally handle code '23503' for foreign_key_violation
        res.status(500).json({ message: "Server Error (Song might be used in a setlist)" });
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
