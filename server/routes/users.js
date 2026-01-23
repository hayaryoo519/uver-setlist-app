const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

// GET all users (Protected: Admin Only)
router.get('/', authorize, adminCheck, async (req, res) => {
    try {
        // Fetch all users
        const allUsers = await db.query("SELECT id, username, email, created_at, role FROM users ORDER BY created_at DESC");
        res.json(allUsers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE User Role (Admin only)
router.put('/:id/role', authorize, adminCheck, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const targetUserId = req.params.id;
        const { role } = req.body; // 'admin' or 'user'

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
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const targetUserId = req.params.id;

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

        // Step 1: Get attended live IDs and basic info
        const livesQuery = `
            SELECT 
                l.id, l.tour_name, l.title, l.date, l.venue, l.type,
                a.created_at as attended_at
            FROM attendance a
            JOIN lives l ON a.live_id = l.id
            WHERE a.user_id = $1
            ORDER BY l.date DESC
        `;

        const livesResult = await db.query(livesQuery, [currentUserId]);

        // Step 2: For each live, fetch the setlist
        const livesWithSetlists = await Promise.all(
            livesResult.rows.map(async (live) => {
                const setlistQuery = `
                    SELECT s.id, s.title, sl.id as setlist_id
                    FROM setlists sl
                    JOIN songs s ON sl.song_id = s.id
                    WHERE sl.live_id = $1
                `;
                const setlistResult = await db.query(setlistQuery, [live.id]);
                return {
                    ...live,
                    setlist: setlistResult.rows
                };
            })
        );

        res.json(livesWithSetlists);
    } catch (err) {
        console.error('[GET ATTENDED] Error:', err.message);
        res.status(500).send("Server Error");
    }
});

// POST Add to Attended Lives
router.post('/me/attended_lives', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { liveId } = req.body;

        console.log('[ATTENDANCE] POST request received:', { currentUserId, liveId, bodyType: typeof liveId });

        if (!liveId) {
            console.log('[ATTENDANCE] Error: liveId is missing');
            return res.status(400).json("liveId is required");
        }

        // Check if already attended
        const check = await db.query(
            "SELECT * FROM attendance WHERE user_id = $1 AND live_id = $2",
            [currentUserId, liveId]
        );

        console.log('[ATTENDANCE] Existing records:', check.rows.length);

        if (check.rows.length > 0) {
            console.log('[ATTENDANCE] Already attended');
            return res.status(400).json("Live already in attendance list");
        }

        // Insert
        await db.query(
            "INSERT INTO attendance (user_id, live_id) VALUES ($1, $2)",
            [currentUserId, liveId]
        );

        console.log('[ATTENDANCE] Successfully added');
        res.json("Added to attendance list");
    } catch (err) {
        console.error('[ATTENDANCE] Error:', err.message);
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

// UPDATE current user profile (username/email)
router.put('/me', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { username, email } = req.body;

        // Optional: Check if email is already taken by ANOTHER user
        if (email) {
            const emailCheck = await db.query("SELECT * FROM users WHERE email = $1 AND id != $2", [email, currentUserId]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json("このメールアドレスは既に他のユーザーに使用されています");
            }
        }

        const updateResult = await db.query(
            "UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email) WHERE id = $3 RETURNING id, username, email, role",
            [username, email, currentUserId]
        );

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE current user account
router.delete('/me', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;

        // attendance records will be deleted automatically due to ON DELETE CASCADE
        const deleteResult = await db.query("DELETE FROM users WHERE id = $1", [currentUserId]);

        if (deleteResult.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        res.json("Account deleted successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
