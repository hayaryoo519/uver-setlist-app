const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/authorization');
const { isLiveClosed } = require('../utils/date');
const jwt = require('jsonwebtoken');

// 0. GET Predictable Lives (Portal)
router.get('/lives', async (req, res) => {
    try {
        const currentUserId = req.header('token') ? (jwt.decode(req.header('token'))?.user_id || null) : null;
        
        const result = await db.query(`
            SELECT 
                l.id, l.tour_name, l.title, l.date::text as date, l.venue, l.type,
                COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL) as prediction_count,
                MAX(CASE WHEN p.user_id = $1 AND p.deleted_at IS NULL THEN p.id::text ELSE NULL END) as my_prediction_id
            FROM lives l
            LEFT JOIN predictions p ON l.id = p.live_id
            WHERE l.date >= CURRENT_DATE - INTERVAL '1 day'
            GROUP BY l.id
            ORDER BY l.date ASC
        `, [currentUserId]);

        // JST基準で締切フラグを付与
        const livesWithStatus = result.rows.map(live => ({
            ...live,
            is_closed: isLiveClosed(live.date),
            has_predicted: !!live.my_prediction_id
        }));

        res.json(livesWithStatus);
    } catch (err) {
        console.error('Fetch predictable lives error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message, stack: err.stack });
    }
});

// 1. GET All Predictions (Ranking & My Page Alias)
// Query params: live_id, sort (popular | new), mine (true)
// Logic for fetching predictions
const fetchPredictions = async (req, res) => {
    try {
        let { live_id, sort, mine } = req.query;
        const currentUserId = req.header('token') ? (jwt.decode(req.header('token'))?.user_id || null) : null;

        // 1. If live_id is not provided, and we are not explicitly requesting 'mine', find the most recent/upcoming live
        if (!live_id && mine !== 'true') {
            const nextLive = await db.query(`
                SELECT id FROM lives 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 1
            `);
            if (nextLive.rows.length > 0) {
                live_id = nextLive.rows[0].id;
            } else {
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
                li.tour_name, li.venue, li.date::text as live_date,
                COUNT(DISTINCT pl.user_id) as like_count,
                EXISTS(SELECT 1 FROM prediction_likes WHERE prediction_id = p.id AND user_id = $1) as is_liked,
                (p.user_id = $1) as is_mine,
                EXISTS(SELECT 1 FROM setlists WHERE live_id = p.live_id) as has_setlist
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            JOIN lives li ON p.live_id = li.id
            LEFT JOIN prediction_likes pl ON p.id = pl.prediction_id
            WHERE p.deleted_at IS NULL
        `;

        const params = [currentUserId];
        let paramIndex = 2;
        let conditions = [];

        if (live_id) {
            conditions.push(`p.live_id = $${paramIndex}`);
            params.push(live_id);
            paramIndex++;
        }

        if (mine === 'true') {
            if (!currentUserId) return res.status(401).json("Unauthorized");
            conditions.push(`p.user_id = $${paramIndex}`);
            params.push(currentUserId);
            paramIndex++;
        }

        if (conditions.length > 0) {
            query += ` AND ` + conditions.join(' AND ');
        }

        query += ` GROUP BY p.id, u.username, li.id `;

        if (sort === 'new') {
            query += ` ORDER BY p.created_at DESC `;
        } else {
            query += ` ORDER BY like_count DESC, p.created_at DESC `;
        }

        const result = await db.query(query, params);
        
        // 自分の予想一覧の場合はJST締切フラグを付与
        const resultsWithStatus = result.rows.map(p => ({
            ...p,
            is_closed: isLiveClosed(p.live_date)
        }));

        res.json(resultsWithStatus);
    } catch (err) {
        console.error('Fetch predictions error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message, stack: err.stack });
    }
};

router.get('/', fetchPredictions);

// Alias for My Page
router.get('/me', authorize, (req, res) => {
    req.query.mine = 'true';
    fetchPredictions(req, res);
});

// 2. GET Single Prediction Detail
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.header('token') ? (jwt.decode(req.header('token'))?.user_id || null) : null;

        const predResult = await db.query(`
            SELECT 
                p.*, 
                u.username,
                COUNT(DISTINCT l.user_id) as like_count,
                EXISTS(SELECT 1 FROM prediction_likes WHERE prediction_id = p.id AND user_id = $1) as is_liked,
                (p.user_id = $1) as is_mine,
                li.tour_name, li.venue, li.date::text as live_date
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN prediction_likes l ON p.id = l.prediction_id
            LEFT JOIN lives li ON p.live_id = li.id
            WHERE p.id = $2 AND p.deleted_at IS NULL
            GROUP BY p.id, u.username, li.id
        `, [currentUserId, id]);

        if (predResult.rows.length === 0) {
            return res.status(404).json({ message: 'Prediction not found' });
        }

        const songsResult = await db.query(`
            SELECT ps.position, s.id, s.title
            FROM prediction_songs ps
            JOIN songs s ON ps.song_id = s.id
            WHERE ps.prediction_id = $1
            ORDER BY ps.position ASC
        `, [id]);

        const pred = predResult.rows[0];
        res.json({
            ...pred,
            is_closed: isLiveClosed(pred.live_date),
            songs: songsResult.rows
        });
    } catch (err) {
        console.error('Fetch prediction detail error:', err.message);
        res.status(500).send('Server Error');
    }
});

// 楽曲バリデーション用ヘルパー
const validateSongs = (songs) => {
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
        return '少なくとも1曲以上必要です';
    }
    if (songs.length > 30) {
        return '予想できるのは30曲までです';
    }
    // 重複チェック
    const uniqueSongs = new Set(songs);
    if (uniqueSongs.size !== songs.length) {
        return '同じ曲を複数回含めることはできません';
    }
    return null;
};

// 3. CREATE Prediction
router.post('/', authorize, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { live_id, songs, title } = req.body;
        const userId = req.user.user_id;

        // 1. バリデーション
        const songError = validateSongs(songs);
        if (songError) return res.status(400).json({ message: songError });

        // 2. ライブ情報の取得と締切チェック
        const liveResult = await client.query('SELECT date::text as date FROM lives WHERE id = $1', [live_id]);
        if (liveResult.rows.length === 0) return res.status(404).json({ message: 'Live not found' });
        
        if (isLiveClosed(liveResult.rows[0].date)) {
            return res.status(403).json({ message: 'このライブの予想受付は終了しました' });
        }

        await client.query('BEGIN');

        // 3. Insert prediction
        // ON CONFLICT ハンドリングのために、SQLレベルでも防護するが、23505をキャッチする
        const newPred = await client.query(`
            INSERT INTO predictions (user_id, live_id, title)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [userId, live_id, title || 'セットリスト予想']);

        const predictionId = newPred.rows[0].id;

        // 4. Insert songs
        for (let i = 0; i < songs.length; i++) {
            await client.query(`
                INSERT INTO prediction_songs (prediction_id, song_id, position)
                VALUES ($1, $2, $3)
            `, [predictionId, songs[i], i + 1]);
        }

        await client.query('COMMIT');
        res.json(newPred.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            // UNIQUE制約違反 (同一ユーザー・同一ライブID)
            const existing = await db.query(
                'SELECT id FROM predictions WHERE user_id = $1 AND live_id = $2 AND deleted_at IS NULL',
                [req.user.user_id, req.body.live_id]
            );
            return res.status(409).json({
                message: 'already_exists',
                prediction_id: existing.rows[0]?.id,
            });
        }
        console.error('Create prediction error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// 4. UPDATE Prediction
router.put('/:id', authorize, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { id } = req.params;
        const { songs, title } = req.body;
        const userId = req.user.user_id;

        // 1. 所有権と締切チェック
        const predResult = await client.query(
            'SELECT p.*, li.date::text as live_date FROM predictions p JOIN lives li ON p.live_id = li.id WHERE p.id = $1 AND p.deleted_at IS NULL',
            [id]
        );
        if (predResult.rows.length === 0) return res.status(404).json({ message: 'Prediction not found' });
        if (predResult.rows[0].user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

        if (isLiveClosed(predResult.rows[0].live_date)) {
            return res.status(403).json({ message: 'ライブ開催後は編集できません' });
        }

        // 2. バリデーション
        const songError = validateSongs(songs);
        if (songError) return res.status(400).json({ message: songError });

        await client.query('BEGIN');
        
        // 3. 楽曲入れ替え (DELETE -> INSERT)
        // NOTE: 将来的には差分更新にする余地あり
        await client.query('DELETE FROM prediction_songs WHERE prediction_id = $1', [id]);
        for (let i = 0; i < songs.length; i++) {
            await client.query(
                'INSERT INTO prediction_songs (prediction_id, song_id, position) VALUES ($1, $2, $3)',
                [id, songs[i], i + 1]
            );
        }

        const updated = await client.query(
            'UPDATE predictions SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [title || predResult.rows[0].title, id]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update prediction error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// 5. DELETE Prediction (Soft Delete)
router.delete('/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        // 所有権チェックを含めた論理削除
        const result = await db.query(
            'UPDATE predictions SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Prediction not found or already deleted' });
        }

        res.status(200).json({ message: 'Prediction deleted successfully' });
    } catch (err) {
        console.error('Delete prediction error:', err.message);
        res.status(500).send('Server Error');
    }
});

// 6. Toggle Like
router.post('/:id/like', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const checkLike = await db.query(
            'SELECT * FROM prediction_likes WHERE prediction_id = $1 AND user_id = $2',
            [id, userId]
        );

        let liked = false;
        if (checkLike.rows.length > 0) {
            await db.query(
                'DELETE FROM prediction_likes WHERE prediction_id = $1 AND user_id = $2',
                [id, userId]
            );
            liked = false;
        } else {
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
