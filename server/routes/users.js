const router = require('express').Router();
const db = require('../db');
const authorize = require('../middleware/authorization');

// GET all users (Protected)
router.get('/', authorize, async (req, res) => {
    try {
        // 1. Get user_id from req.user (from token)
        const currentUserId = req.user.user_id;

        // 2. Check if the requester is an admin
        const currentUser = await db.query("SELECT role FROM users WHERE id = $1", [currentUserId]);

        if (currentUser.rows.length === 0 || currentUser.rows[0].role !== 'admin') {
            return res.status(403).json("Access Denied: Admins only");
        }

        // 3. Fetch all users
        const allUsers = await db.query("SELECT id, username, email, created_at, role FROM users ORDER BY created_at DESC");
        res.json(allUsers.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE User Role (Admin only)
router.put('/:id/role', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const targetUserId = req.params.id;
        const { role } = req.body; // 'admin' or 'user'

        // Check if admin
        const currentUser = await db.query("SELECT role FROM users WHERE id = $1", [currentUserId]);
        if (currentUser.rows.length === 0 || currentUser.rows[0].role !== 'admin') {
            return res.status(403).json("Access Denied");
        }

        // Prevent admin from removing their own admin status (optional safety)
        if (currentUserId == targetUserId && role !== 'admin') {
            return res.status(400).json("Cannot remove your own admin status");
        }

        const updateKey = await db.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING *",
            [role, targetUserId]
        );

        if (updateKey.rows.length === 0) {
            return res.json("User not found");
        }

        res.json("User role updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE User (Admin only)
router.delete('/:id', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const targetUserId = req.params.id;

        // Check if admin
        const currentUser = await db.query("SELECT role FROM users WHERE id = $1", [currentUserId]);
        if (currentUser.rows.length === 0 || currentUser.rows[0].role !== 'admin') {
            return res.status(403).json("Access Denied");
        }

        // Prevent deleting yourself
        if (currentUserId == targetUserId) {
            return res.status(400).json("Cannot delete yourself");
        }

        const deleteUser = await db.query("DELETE FROM users WHERE id = $1", [targetUserId]);

        if (deleteUser.rowCount === 0) {
            return res.json("User not found");
        }

        res.json("User deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// GET Attended Lives (User's History)
router.get('/me/attended_lives', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;

        // Join attendance with lives to get details
        const query = `
            SELECT 
                l.id, l.tour_name, l.title, l.date, l.venue, l.type,
                a.created_at as attended_at
            FROM attendance a
            JOIN lives l ON a.live_id = l.id
            WHERE a.user_id = $1
            ORDER BY l.date DESC
        `;

        const result = await db.query(query, [currentUserId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// POST Add to Attended Lives
router.post('/me/attended_lives', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { liveId } = req.body;

        if (!liveId) {
            return res.status(400).json("liveId is required");
        }

        // Check if already attended
        const check = await db.query(
            "SELECT * FROM attendance WHERE user_id = $1 AND live_id = $2",
            [currentUserId, liveId]
        );

        if (check.rows.length > 0) {
            return res.status(400).json("Live already in attendance list");
        }

        // Insert
        await db.query(
            "INSERT INTO attendance (user_id, live_id) VALUES ($1, $2)",
            [currentUserId, liveId]
        );

        res.json("Added to attendance list");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE Remove from Attended Lives
router.delete('/me/attended_lives/:liveId', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { liveId } = req.params;

        const deleteOp = await db.query(
            "DELETE FROM attendance WHERE user_id = $1 AND live_id = $2",
            [currentUserId, liveId]
        );

        if (deleteOp.rowCount === 0) {
            return res.json("Not found in attendance list"); // Idempotent success
        }

        res.json("Removed from attendance list");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
