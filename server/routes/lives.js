const router = require('express').Router();
const db = require('../db');
const authorize = require('../middleware/authorization');

// GET All Lives
router.get('/', async (req, res) => {
    try {
        let query;
        if (req.query.include_setlists === 'true') {
            query = `
                SELECT l.*, 
                       COALESCE(
                           JSON_AGG(
                               JSON_BUILD_OBJECT('id', s.id, 'title', s.title, 'position', sl.position) 
                               ORDER BY sl.position
                           ) FILTER (WHERE s.id IS NOT NULL), 
                           '[]'
                       ) as setlist
                FROM lives l
                LEFT JOIN setlists sl ON l.id = sl.live_id
                LEFT JOIN songs s ON sl.song_id = s.id
                GROUP BY l.id
                ORDER BY l.date DESC
            `;
        } else {
            query = 'SELECT * FROM lives ORDER BY date DESC';
        }

        const result = await db.query(query);
        res.json(result.rows);
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

        res.json({ ...live, setlist: setlistRes.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// CREATE a Live (Admin only)
router.post('/', authorize, async (req, res) => {
    try {
        const { tour_name, title, date, venue, type = 'ONEMAN' } = req.body;

        const newLive = await db.query(
            "INSERT INTO lives (tour_name, title, date, venue, type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [tour_name, title, date, venue, type]
        );

        res.json(newLive.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// UPDATE a Live
router.put('/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { tour_name, title, date, venue, type } = req.body;

        const updateLive = await db.query(
            "UPDATE lives SET tour_name = $1, title = $2, date = $3, venue = $4, type = $5 WHERE id = $6 RETURNING *",
            [tour_name, title, date, venue, type, id]
        );

        if (updateLive.rows.length === 0) {
            return res.status(404).json("Live not found");
        }

        res.json(updateLive.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE Setlist for a Live
router.put('/:id/setlist', authorize, async (req, res) => {
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

// DELETE a Live
router.delete('/:id', authorize, async (req, res) => {
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
