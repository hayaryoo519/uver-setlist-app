const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/authorization');
const jwt = require('jsonwebtoken');

// 共通: トークンがあれば currentUserId を取得（任意認証）
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

// POST /api/follows/:userId — フォロー/アンフォロー トグル
router.post('/:userId', authorize, async (req, res) => {
    const followerId  = req.user.user_id;
    const followingId = parseInt(req.params.userId, 10);

    if (isNaN(followingId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }
    if (followerId === followingId) {
        return res.status(400).json({ message: '自分自身はフォローできません' });
    }

    try {
        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [followingId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'ユーザーが見つかりません' });
        }

        const existing = await db.query(
            'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );

        if (existing.rows.length > 0) {
            await db.query(
                'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
                [followerId, followingId]
            );
            return res.json({ following: false });
        } else {
            await db.query(
                'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
                [followerId, followingId]
            );
            return res.json({ following: true });
        }
    } catch (err) {
        console.error('Toggle follow error:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/follows/:userId — 明示的アンフォロー
router.delete('/:userId', authorize, async (req, res) => {
    const followerId  = req.user.user_id;
    const followingId = parseInt(req.params.userId, 10);

    if (isNaN(followingId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }

    try {
        await db.query(
            'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );
        res.json({ following: false });
    } catch (err) {
        console.error('Unfollow error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/follows/my/followers — 自分のフォロワー一覧（認証必須）
router.get('/my/followers', authorize, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const result = await db.query(`
            SELECT u.id, u.username
            FROM user_follows f
            JOIN users u ON u.id = f.follower_id
            WHERE f.following_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('My followers error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/follows/my/following — 自分がフォロー中のユーザー一覧（認証必須）
router.get('/my/following', authorize, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const result = await db.query(`
            SELECT u.id, u.username
            FROM user_follows f
            JOIN users u ON u.id = f.following_id
            WHERE f.follower_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('My following error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/follows/my/stats — 自分のフォロー統計（認証必須）
// ※ /stats/:userId より前に定義すること（userId='my' で NaN になる防止）
router.get('/my/stats', authorize, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM user_follows WHERE follower_id  = $1)::int AS following_count,
                (SELECT COUNT(*) FROM user_follows WHERE following_id = $1)::int AS follower_count
        `, [userId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('My follow stats error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/follows/stats/:userId — 特定ユーザーのフォロー統計（認証任意）
router.get('/stats/:userId', async (req, res) => {
    const userId        = parseInt(req.params.userId, 10);
    const currentUserId = getOptionalUserId(req);

    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザーIDです' });
    }

    try {
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM user_follows WHERE follower_id  = $1)::int AS following_count,
                (SELECT COUNT(*) FROM user_follows WHERE following_id = $1)::int AS follower_count,
                CASE
                    WHEN $2::int IS NULL THEN false
                    ELSE EXISTS(
                        SELECT 1 FROM user_follows
                        WHERE follower_id = $2 AND following_id = $1
                    )
                END AS is_following
        `, [userId, currentUserId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Follow stats error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
