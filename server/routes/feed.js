const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/authorization');

// GET /api/feed — フォロワーの予想フィード（認証必須）
router.get('/', authorize, async (req, res) => {
    const userId = req.user.user_id;
    const limit  = Math.min(parseInt(req.query.limit  || '20', 10), 50);
    const offset = parseInt(req.query.offset || '0', 10);

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
                COUNT(DISTINCT pl.user_id)::int                              AS like_count,
                EXISTS(
                    SELECT 1 FROM prediction_likes
                    WHERE prediction_id = p.id AND user_id = $1
                )                                                            AS is_liked,
                false                                                        AS is_mine
            FROM user_follows         f
            JOIN predictions          p   ON p.user_id  = f.follower_id
            JOIN users                u   ON u.id       = p.user_id
            JOIN lives                li  ON li.id      = p.live_id
            LEFT JOIN prediction_likes pl ON pl.prediction_id = p.id
            WHERE f.following_id = $1
            GROUP BY p.id, u.username, li.id
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        res.json(result.rows);
    } catch (err) {
        console.error('Feed error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
