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

// UPDATE current user profile (username/email/password)
router.put('/me', authorize, async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { username, email, password, currentPassword } = req.body;
        const bcrypt = require('bcrypt');

        // Optional: Check if email is already taken by ANOTHER user
        if (email) {
            const emailCheck = await db.query("SELECT * FROM users WHERE email = $1 AND id != $2", [email, currentUserId]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ message: "このメールアドレスは既に他のユーザーに使用されています" });
            }
        }

        let newPasswordHash = null;

        // Handle Password Update
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: "パスワードは6文字以上で設定してください" });
            }

            if (!currentPassword) {
                return res.status(400).json({ message: "現在のパスワードを入力してください" });
            }

            // Get current user password
            const userResult = await db.query("SELECT password FROM users WHERE id = $1", [currentUserId]);
            if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found" });

            const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
            if (!validPassword) {
                return res.status(400).json({ message: "現在のパスワードが間違っています" });
            }

            const salt = await bcrypt.genSalt(10);
            newPasswordHash = await bcrypt.hash(password, salt);
        }

        // Dynamic Update Query
        let query = "UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email)";
        const params = [username, email, currentUserId];

        if (newPasswordHash) {
            query += ", password = $" + (params.length + 1); // $4
            params.push(newPasswordHash); // index 3
        }

        query += " WHERE id = $" + (newPasswordHash ? 3 : 3) + " RETURNING id, username, email, role";

        // Wait, if I push to params, the index shifts.
        // param 1: username, param 2: email, param 3: currentUserId.
        // If password added:
        // params becomes [username, email, currentUserId, newPasswordHash]
        // WHERE id should be $3.
        // SET password = $4.

        // Re-construct cleaner query building
        const updates = [];
        const values = [];
        let idx = 1;

        if (username !== undefined) {
            updates.push(`username = $${idx++}`);
            values.push(username);
        }
        if (email !== undefined) {
            updates.push(`email = $${idx++}`);
            values.push(email);
        }
        if (newPasswordHash) {
            updates.push(`password = $${idx++}`);
            values.push(newPasswordHash);
        }

        if (updates.length === 0) {
            return res.json({ message: "No changes requested" });
        }

        values.push(currentUserId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, role`;

        const updateResult = await db.query(sql, values);

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
