const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const { normalizeVenueName } = require('../utils/songTranslations');

// GET All Lives with Advanced Filters
router.get('/', async (req, res) => {
    try {
        const {
            search,
            startDate,
            endDate,
            prefecture,
            album,
            songIds,
            include_setlists
        } = req.query;

        let paramIndex = 1;
        let params = [];
        let whereClauses = [];
        let havingClause = '';

        // 1. Build Filter Conditions for CTE
        if (search) {
            whereClauses.push(`(l.title ILIKE $${paramIndex} OR l.venue ILIKE $${paramIndex} OR l.tour_name ILIKE $${paramIndex} OR l.special_note ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (startDate) {
            whereClauses.push(`l.date >= $${paramIndex}`);
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereClauses.push(`l.date <= $${paramIndex}`);
            params.push(endDate);
            paramIndex++;
        }

        if (prefecture) {
            whereClauses.push(`l.prefecture = $${paramIndex}`);
            params.push(prefecture);
            paramIndex++;
        }

        if (album) {
            whereClauses.push(`s.album = $${paramIndex}`);
            params.push(album);
            paramIndex++;
        }

        let songIdList = [];
        if (songIds) {
            songIdList = songIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (songIdList.length > 0) {
                whereClauses.push(`s.id = ANY($${paramIndex}::int[])`);
                params.push(songIdList);
                paramIndex++;

                // Ensure ALL selected songs are present (AND logic)
                havingClause = `HAVING COUNT(DISTINCT s.id) >= ${songIdList.length}`;
            }
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        // 2. Construct Query with CTE for filtering
        // We use DISTINCT l.id in the CTE to get the list of matching lives
        let query = `
            WITH filtered_lives AS (
                SELECT l.id
                FROM lives l
                LEFT JOIN setlists sl ON l.id = sl.live_id
                LEFT JOIN songs s ON sl.song_id = s.id
                ${whereSql}
                GROUP BY l.id
                ${havingClause}
            )
            SELECT l.*
        `;

        if (include_setlists === 'true') {
            query += `,
                   COALESCE(
                       JSON_AGG(
                           JSON_BUILD_OBJECT('id', s_full.id, 'title', s_full.title, 'position', sl_full.position) 
                           ORDER BY sl_full.position
                       ) FILTER (WHERE s_full.id IS NOT NULL), 
                       '[]'
                   ) as setlist
            `;
        }

        query += `
            FROM lives l
            JOIN filtered_lives fl ON l.id = fl.id
        `;

        // If including setlists, we need to join again to get the full setlist details
        if (include_setlists === 'true') {
            query += `
                LEFT JOIN setlists sl_full ON l.id = sl_full.live_id
                LEFT JOIN songs s_full ON sl_full.song_id = s_full.id
                GROUP BY l.id
            `;
        }

        query += ` ORDER BY l.date DESC`;

        const result = await db.query(query, params);

        // Normalize venue names in response (translate romaji to Japanese)
        const normalizedRows = result.rows.map(row => ({
            ...row,
            venue: normalizeVenueName(row.venue)
        }));

        res.json(normalizedRows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// GET Single Live with Setlist
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Live Details
        const liveRes = await db.query("SELECT * FROM lives WHERE id = $1", [id]);
        if (liveRes.rows.length === 0) return res.status(404).json("Live not found");
        const live = liveRes.rows[0];

        // 2. Get Setlist with Song Details
        // Join setlists -> songs
        const setlistRes = await db.query(
            `SELECT s.id as song_id, s.title, sl.position 
             FROM setlists sl
             JOIN songs s ON sl.song_id = s.id
             WHERE sl.live_id = $1
             ORDER BY sl.position ASC`,
            [id]
        );

        res.json({ ...live, venue: normalizeVenueName(live.venue), setlist: setlistRes.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// CREATE a Live (Admin only)
router.post('/', authorize, adminCheck, async (req, res) => {
    try {
        const { tour_name, title, date, venue: rawVenue, type = 'ONEMAN', special_note } = req.body;

        // Normalize venue name (translate English to Japanese if applicable)
        const venue = normalizeVenueName(rawVenue);

        // DEBUG: Log venue translation attempt
        console.log(`[Venue Translation] Input: "${rawVenue}" -> Output: "${venue}"${rawVenue !== venue ? ' (TRANSLATED)' : ''}`);

        const newLive = await db.query(
            "INSERT INTO lives (tour_name, title, date, venue, type, special_note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [tour_name, title, date, venue, type, special_note]
        );

        res.json(newLive.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// UPDATE a Live (Admin only)
router.put('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { tour_name, title, date, venue, type, special_note } = req.body;

        console.log(`[UPDATE LIVE] ID: ${id}, Body:`, req.body);

        const updateLive = await db.query(
            "UPDATE lives SET tour_name = $1, title = $2, date = $3, venue = $4, type = $5, special_note = $6 WHERE id = $7 RETURNING *",
            [tour_name, title, date, venue, type, special_note, id]
        );

        if (updateLive.rows.length === 0) {
            console.warn(`[UPDATE LIVE] Live not found: ${id}`);
            return res.status(404).json("Live not found");
        }

        console.log("Live updated successfully:", updateLive.rows[0]);
        res.json(updateLive.rows[0]);
    } catch (err) {
        console.error("[UPDATE LIVE ERROR]", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
});

// UPDATE Setlist for a Live (Admin only)
router.put('/:id/setlist', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { songs } = req.body; // Expect array of song_ids

        // Transaction mostly
        await db.query("BEGIN");

        // 1. Delete existing setlist
        await db.query("DELETE FROM setlists WHERE live_id = $1", [id]);

        // 2. Insert new
        if (songs && songs.length > 0) {
            for (let i = 0; i < songs.length; i++) {
                const songId = songs[i];
                const position = i + 1;
                await db.query(
                    "INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)",
                    [id, songId, position]
                );
            }
        }

        await db.query("COMMIT");
        res.json({ message: "Setlist updated" });
    } catch (err) {
        await db.query("ROLLBACK");
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// IMPORT Setlist from SetlistFM logic (Admin only)
router.post('/:id/import-setlist', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { songs } = req.body; // Expect array of { title, order } objects from SetlistFM

        if (!songs || !Array.isArray(songs)) {
            return res.status(400).json({ message: "Invalid songs data" });
        }

        await db.query("BEGIN");

        // 1. Delete existing setlist
        await db.query("DELETE FROM setlists WHERE live_id = $1", [id]);

        // 2. Process each song
        for (const song of songs) {
            // Check if song exists
            let songId;
            const songRes = await db.query("SELECT id FROM songs WHERE title = $1", [song.title]);

            if (songRes.rows.length > 0) {
                songId = songRes.rows[0].id;
            } else {
                // Create new song
                const newSong = await db.query("INSERT INTO songs (title) VALUES ($1) RETURNING id", [song.title]);
                songId = newSong.rows[0].id;
            }

            // Insert into setlists
            await db.query(
                "INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)",
                [id, songId, song.order || 1] // Fallback order if missing, but usually provided
            );
        }

        await db.query("COMMIT");
        res.json({ message: "Setlist imported successfully", count: songs.length });

    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Import Setlist Error:", err);
        res.status(500).json({ message: "Failed to import setlist" });
    }
});

// BATCH DELETE Lives (Admin only)
router.post('/batch-delete', authorize, adminCheck, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json("Invalid IDs provided");
        }

        const deleteQuery = "DELETE FROM lives WHERE id = ANY($1::int[])";
        const result = await db.query(deleteQuery, [ids]);

        res.json({ message: "Lives deleted", count: result.rowCount });
    } catch (err) {
        console.error("Batch delete error:", err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE a Live (Admin only)
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteLive = await db.query("DELETE FROM lives WHERE id = $1", [id]);

        if (deleteLive.rowCount === 0) {
            return res.status(404).json("Live not found");
        }

        res.json("Live deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
