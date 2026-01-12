const router = require('express').Router();
const db = require('../db');
const authorize = require('../middleware/authorization');

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
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// CREATE a Song
router.post('/', authorize, async (req, res) => {
    try {
        const { title, album, release_year, mv_url, author } = req.body;

        // Check duplicate?
        const check = await db.query("SELECT * FROM songs WHERE title = $1", [title]);
        if (check.rows.length > 0) {
            // If exists, update it? Or just return?
            // Let's just return for now as title is main identifier
            return res.json(check.rows[0]);
        }

        const newSong = await db.query(
            "INSERT INTO songs (title, album, release_year, mv_url, author) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [title, album, release_year, mv_url, author]
        );

        res.json(newSong.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE a Song
router.put('/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, album, release_year, mv_url, author } = req.body;

        const updateSong = await db.query(
            "UPDATE songs SET title = $1, album = $2, release_year = $3, mv_url = $4, author = $5 WHERE id = $6 RETURNING *",
            [title, album, release_year, mv_url, author, id]
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

// DELETE a Song
router.delete('/:id', authorize, async (req, res) => {
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

module.exports = router;
