const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/authorization');

// 1. GET All Predictions (Ranking)
// Query params: live_id, sort (popular | new)
router.get('/', async (req, res) => {
    try {
        let { live_id, sort } = req.query;
        const currentUserId = req.header('token') ? require('jsonwebtoken').decode(req.header('token'))?.user_id : null;

        // 1. If live_id is not provided, find the most recent/upcoming live
        if (!live_id) {
            const nextLive = await db.query(`
                SELECT id FROM lives 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 1
            `);
            if (nextLive.rows.length > 0) {
                live_id = nextLive.rows[0].id;
            } else {
                // If no upcoming lives, get the latest past live
                const lastLive = await db.query(`
                    SELECT id FROM lives 
                    ORDER BY date DESC 
                    LIMIT 1
                `);
                if (lastLive.rows.length > 0) {
                    live_id = lastLive.rows[0].id;
                }
            }
        }

        let query = `
            SELECT 
                p.*, 
                u.username,
                li.tour_name, li.venue, li.date as live_date,
                COUNT(DISTINCT pl.user_id) as like_count,
                EXISTS(SELECT 1 FROM prediction_likes WHERE prediction_id = p.id AND user_id = $1) as is_liked,
                (p.user_id = $1) as is_mine
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            JOIN lives li ON p.live_id = li.id
            LEFT JOIN prediction_likes pl ON p.id = pl.prediction_id
        `;

        const params = [currentUserId];
        let paramIndex = 2;

        if (live_id) {
            query += ` WHERE p.live_id = $${paramIndex}`;
            params.push(live_id);
            paramIndex++;
        }

        query += ` GROUP BY p.id, u.username, li.id `;

        if (sort === 'new') {
            query += ` ORDER BY p.created_at DESC `;
        } else {
            // Default: popular (like_count)
            query += ` ORDER BY like_count DESC, p.created_at DESC `;
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch predictions error:', err.message);
        res.status(500).send('Server Error');
    }
});

// 2. GET Single Prediction Detail
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.header('token') ? require('jsonwebtoken').decode(req.header('token'))?.user_id : null;

        // Get basic info
        const predResult = await db.query(`
            SELECT 
                p.*, 
                u.username,
                COUNT(DISTINCT l.user_id) as like_count,
                EXISTS(SELECT 1 FROM prediction_likes WHERE prediction_id = p.id AND user_id = $1) as is_liked,
                li.tour_name, li.venue, li.date as live_date
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN prediction_likes l ON p.id = l.prediction_id
            LEFT JOIN lives li ON p.live_id = li.id
            WHERE p.id = $2
            GROUP BY p.id, u.username, li.id
        `, [currentUserId, id]);

        if (predResult.rows.length === 0) {
            return res.status(404).json({ message: 'Prediction not found' });
        }

        // Get songs
        const songsResult = await db.query(`
            SELECT ps.order_index as position, s.id, s.title
            FROM prediction_songs ps
            JOIN songs s ON ps.song_id = s.id
            WHERE ps.prediction_id = $1
            ORDER BY ps.order_index ASC
        `, [id]);

        res.json({
            ...predResult.rows[0],
            songs: songsResult.rows
        });
    } catch (err) {
        console.error('Fetch prediction detail error:', err.message);
        res.status(500).send('Server Error');
    }
});

// 3. CREATE Prediction
router.post('/', authorize, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { live_id, songs, title } = req.body; // songs is array of song IDs
        const userId = req.user.user_id;

        if (!songs || !Array.isArray(songs) || songs.length === 0) {
            return res.status(400).json({ message: 'At least one song is required' });
        }

        await client.query('BEGIN');

        // Insert prediction
        const newPred = await client.query(`
            INSERT INTO predictions (user_id, live_id, title)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [userId, live_id, title || 'セットリスト予想']);

        const predictionId = newPred.rows[0].id;

        // Insert songs
        for (let i = 0; i < songs.length; i++) {
            await client.query(`
                INSERT INTO prediction_songs (prediction_id, song_id, order_index)
                VALUES ($1, $2, $3)
            `, [predictionId, songs[i], i + 1]);
        }

        await client.query('COMMIT');
        res.json(newPred.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create prediction error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// 4. Toggle Like
router.post('/:id/like', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        // Check if already liked
        const checkLike = await db.query(
            'SELECT * FROM prediction_likes WHERE prediction_id = $1 AND user_id = $2',
            [id, userId]
        );

        let liked = false;
        if (checkLike.rows.length > 0) {
            // Unlike
            await db.query(
                'DELETE FROM prediction_likes WHERE prediction_id = $1 AND user_id = $2',
                [id, userId]
            );
            liked = false;
        } else {
            // Like
            await db.query(
                'INSERT INTO prediction_likes (prediction_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );
            liked = true;
        }

        res.json({ liked });
    } catch (err) {
        console.error('Toggle like error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
