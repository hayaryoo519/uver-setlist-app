const router = require('express').Router();
const db = require('../db');

// GET All Lives
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM lives ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// CREATE a Live (Admin only - currently open for MVP)
router.post('/', async (req, res) => {
    try {
        const { tour_name, date, venue, setlist_id } = req.body;

        const newLive = await db.query(
            "INSERT INTO lives (tour_name, date, venue, setlist_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [tour_name, date, venue, setlist_id]
        );

        res.json(newLive.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

module.exports = router;
