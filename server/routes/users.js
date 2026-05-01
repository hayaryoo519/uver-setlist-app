const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const jwt = require('jsonwebtoken');

const getOptionalUserId = (req) => {
    const token = req.header('token');
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.user_id;
    } catch {
        return null;
    }
};

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

        // Validate username if provided
        if (username !== undefined) {
            if (username.trim().length < 2 || username.length > 30) {
                return res.status(400).json({ message: "ユーザー名は2文字以上30文字以内で入力してください" });
            }
        }

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
        if (req.body.is_public !== undefined) {
            updates.push(`is_public = $${idx++}`);
            values.push(req.body.is_public);
        }

        if (updates.length === 0) {
            return res.json({ message: "No changes requested" });
        }

        values.push(currentUserId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, role, is_public`;

        const updateResult = await db.query(sql, values);

        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// GET /api/users/:id/profile — 公開プロフィール（認証任意）
router.get('/:id/profile', async (req, res) => {
    const userId        = parseInt(req.params.id, 10);
    const currentUserId = getOptionalUserId(req);

    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }

    try {
        const result = await db.query(`
            SELECT
                u.id,
                u.username,
                u.created_at,
                u.is_public,
                (SELECT COUNT(*) FROM user_follows WHERE follower_id  = u.id)::int AS following_count,
                (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id)::int AS follower_count,
                CASE
                    WHEN $2::int IS NULL THEN false
                    ELSE EXISTS(
                        SELECT 1 FROM user_follows
                        WHERE follower_id = $2 AND following_id = u.id
                    )
                END AS is_following
            FROM users u
            WHERE u.id = $1
        `, [userId, currentUserId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ユーザーが見つかりません' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('User profile error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/users/:id/attended_lives — 公開参戦ライブ一覧
// is_public = false の場合は 403
router.get('/:id/attended_lives', async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }

    try {
        const userCheck = await db.query(
            'SELECT is_public FROM users WHERE id = $1', [userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'ユーザーが見つかりません' });
        }
        if (!userCheck.rows[0].is_public) {
            return res.status(403).json({ message: 'このユーザーの参戦記録は非公開です' });
        }

        const livesResult = await db.query(`
            SELECT
                l.id, l.tour_name, l.title, l.date, l.venue, l.type,
                a.created_at AS attended_at
            FROM attendance a
            JOIN lives l ON a.live_id = l.id
            WHERE a.user_id = $1
            ORDER BY l.date DESC
        `, [userId]);

        const livesWithSetlists = await Promise.all(
            livesResult.rows.map(async (live) => {
                const setlistResult = await db.query(`
                    SELECT s.id, s.title, sl.id AS setlist_id
                    FROM setlists sl
                    JOIN songs s ON sl.song_id = s.id
                    WHERE sl.live_id = $1
                `, [live.id]);
                return { ...live, setlist: setlistResult.rows };
            })
        );

        res.json(livesWithSetlists);
    } catch (err) {
        console.error('Public attended lives error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/users/:id/predictions — ユーザーの予想一覧（常に公開）
router.get('/:id/predictions', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const currentUserId = getOptionalUserId(req);

    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }

    try {
        const result = await db.query(`
            SELECT
                p.id,
                p.user_id,
                p.live_id,
                p.title,
                p.created_at,
                u.username,
                li.tour_name,
                li.venue,
                li.date AS live_date,
                COUNT(DISTINCT pl.user_id)::int                          AS like_count,
                CASE
                    WHEN $2::int IS NULL THEN false
                    ELSE EXISTS(
                        SELECT 1 FROM prediction_likes
                        WHERE prediction_id = p.id AND user_id = $2
                    )
                END                                                       AS is_liked,
                (p.user_id = $2)                                         AS is_mine
            FROM predictions          p
            JOIN users                u   ON u.id  = p.user_id
            LEFT JOIN lives           li  ON li.id = p.live_id
            LEFT JOIN prediction_likes pl ON pl.prediction_id = p.id
            WHERE p.user_id = $1
            GROUP BY p.id, u.username, li.id
            ORDER BY p.created_at DESC
        `, [userId, currentUserId]);

        res.json(result.rows);
    } catch (err) {
        console.error('User predictions error:', err.message);
        res.status(500).send('Server Error');
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
