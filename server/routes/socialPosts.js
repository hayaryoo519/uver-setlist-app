const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

router.use(authorize);
router.use(adminCheck);

function buildLivePost(live, songs) {
    const title = live.tour_name || live.title || 'UVERworldライブ';
    const date = new Date(live.date).toLocaleDateString('ja-JP');
    const visibleSongs = songs.slice(0, 8);
    const songLines = visibleSongs.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    const more = songs.length > visibleSongs.length ? '\n...ほか' : '';
    return `【${title}】\n${date} ${live.venue}\n\n${songLines}${more}\n\nセトリ詳細→ ${process.env.APP_URL || 'https://uver-setlist-archive.org'}/live/${live.id}\n\n#UVERworld #セトリ`;
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        let where = '';
        if (['draft', 'approved', 'published', 'failed'].includes(req.query.status)) {
            params.push(req.query.status);
            where = 'WHERE sp.status = $1';
        }
        const result = await db.query(
            `SELECT sp.*, l.date AS live_date, l.venue AS live_venue, l.tour_name AS live_tour_name
             FROM social_posts sp LEFT JOIN lives l ON l.id = sp.live_id
             ${where} ORDER BY sp.created_at DESC LIMIT 100`, params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[social-posts] list error:', err);
        res.status(500).json({ message: '投稿候補の取得に失敗しました' });
    }
});

router.post('/generate', async (req, res) => {
    const liveId = Number(req.body.liveId);
    if (!Number.isInteger(liveId) || liveId <= 0) {
        return res.status(400).json({ message: 'ライブIDが指定されていません' });
    }

    try {
        const liveResult = await db.query('SELECT id, date, venue, title, tour_name FROM lives WHERE id = $1', [liveId]);
        if (liveResult.rows.length === 0) return res.status(404).json({ message: 'ライブが見つかりません' });
        const songsResult = await db.query(
            `SELECT s.title FROM setlists sl JOIN songs s ON s.id = sl.song_id
             WHERE sl.live_id = $1 ORDER BY sl.position`, [liveId]
        );
        if (songsResult.rows.length === 0) return res.status(422).json({ message: 'セットリストが登録されていません' });

        const key = crypto.createHash('sha256').update(`x:live-setlist:${liveId}`).digest('hex');
        const body = buildLivePost(liveResult.rows[0], songsResult.rows);
        const result = await db.query(
            `INSERT INTO social_posts (platform, post_type, live_id, body, idempotency_key, created_by)
             VALUES ('x', 'live_setlist', $1, $2, $3, $4)
             ON CONFLICT (idempotency_key) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()
             RETURNING *`, [liveId, body, key, req.user.user_id || req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[social-posts] generate error:', err);
        res.status(500).json({ message: '投稿候補の生成に失敗しました' });
    }
});

router.patch('/:id', async (req, res) => {
    const { body, status } = req.body;
    if (body !== undefined && (!body || body.length > 280)) {
        return res.status(400).json({ message: '投稿本文は1〜280文字で指定してください' });
    }
    if (status !== undefined && !['draft', 'approved'].includes(status)) {
        return res.status(400).json({ message: '変更できないステータスです' });
    }
    const fields = [];
    const params = [];
    if (body !== undefined) { fields.push(`body = $${params.length + 1}`); params.push(body); }
    if (status !== undefined) { fields.push(`status = $${params.length + 1}`); params.push(status); }
    if (fields.length === 0) return res.status(400).json({ message: '更新項目がありません' });
    params.push(req.params.id);
    try {
        const result = await db.query(
            `UPDATE social_posts SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id = $${params.length} AND status IN ('draft', 'approved') RETURNING *`, params
        );
        if (result.rows.length === 0) return res.status(404).json({ message: '編集可能な投稿候補が見つかりません' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[social-posts] update error:', err);
        res.status(500).json({ message: '投稿候補の更新に失敗しました' });
    }
});

module.exports = router;
