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

module.exports = router;
