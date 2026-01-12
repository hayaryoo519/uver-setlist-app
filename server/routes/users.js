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

module.exports = router;
