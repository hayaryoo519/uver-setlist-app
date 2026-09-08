const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

router.use(authorize);
router.use(adminCheck);

const APP_URL = process.env.APP_URL || 'https://uver-setlist-archive.org';
const POST_TYPES = new Set(['on_this_day', 'frequent_ranking', 'rare_song', 'seasonal', 'tour_stats']);

function parseXPostUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        if (url.protocol !== 'https:' || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname)) return null;
        const match = url.pathname.match(/^\/(?:i\/web\/)?(?:[^/]+\/)?status\/(\d+)\/?$/);
        if (!match) return null;
        return { postId: match[1], postUrl: `https://x.com/i/status/${match[1]}` };
    } catch {
        return null;
    }
}

function lineList(rows, formatter) {
    return rows.map((row, index) => formatter(row, index)).join('\n');
}

function buildOnThisDay(live, songs) {
    const years = new Date().getFullYear() - new Date(live.date).getFullYear();
    return `【今日は${years}年前】\n${new Date(live.date).toLocaleDateString('ja-JP')}、UVERworldは\n${live.venue}でライブを開催しました🎸\n\n📋 その日のセトリ（全${songs.length}曲）\n${lineList(songs.slice(0, 8), (song, i) => `${i + 1}. ${song.title}`)}${songs.length > 8 ? '\n… 続きはこちら👇' : ''}\n${APP_URL}/live/${live.id}\n\n#UVERworld #OnThisDay`;
}

function buildFrequentRanking(rows, totalLives) {
    return `【UVERworld 全ライブ演奏回数ランキング】\n${totalLives}公演のデータから集計📊\n\n${lineList(rows.slice(0, 5), (row, i) => `${['🥇', '🥈', '🥉'][i] || `${i + 1}位`}「${row.title}」… ${row.cnt}回`)}\n\nあなたが一番好きな曲は何位？🎵\n全曲ランキングはこちら👇\n${APP_URL}\n\n#UVERworld #セトリ統計`;
}

function buildRareSongs(rows) {
    return `【知ってる？UVERworldの激レア曲】💎\nライブでの演奏回数がたった1〜3回の曲たち…\n\n${lineList(rows.slice(0, 3), row => `🔮「${row.title}」… 演奏回数 ${row.play_count}回（初披露: ${row.first_played}）`)}\n\nこの曲が来たら神セトリ確定👑\n全曲の演奏回数はこちら👇\n${APP_URL}\n\n#UVERworld #レア曲`;
}

function buildSeasonal(rows, season) {
    const label = season === 'summer' ? '夏' : '冬';
    return `【${label}のUVERworldといえばこの曲】${season === 'summer' ? '🌊☀️' : '❄️'}\n${season === 'summer' ? '7〜8月' : '12〜2月'}のライブで特に演奏回数が多い曲をピックアップ！\n\n${lineList(rows.slice(0, 3), row => `🌟「${row.title}」… ${label}ライブ${row.cnt}回`)}\n\n過去の${label}ライブセトリはこちら👇\n${APP_URL}\n\n#UVERworld #${season === 'summer' ? '夏フェス' : 'セトリ'}`;
}

async function generatePost(postType, req) {
    if (postType === 'on_this_day') {
        const liveResult = await db.query(`SELECT l.id, l.date, l.venue FROM lives l WHERE TO_CHAR(l.date, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') AND l.date < CURRENT_DATE AND (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s WHERE s.live_id = l.id)) ORDER BY l.date DESC LIMIT 1`);
        if (!liveResult.rows.length) throw Object.assign(new Error('今日は過去ライブの対象データがありません'), { statusCode: 422 });
        const songs = await db.query('SELECT s.title FROM setlists sl JOIN songs s ON s.id = sl.song_id WHERE sl.live_id = $1 ORDER BY sl.position', [liveResult.rows[0].id]);
        return { body: buildOnThisDay(liveResult.rows[0], songs.rows), liveId: liveResult.rows[0].id, keyPart: `on_this_day:${new Date().toISOString().slice(0, 10)}` };
    }

    if (postType === 'frequent_ranking') {
        const rows = await db.query(`SELECT s.title, COUNT(*)::int AS cnt FROM setlists sl JOIN songs s ON s.id = sl.song_id JOIN lives l ON l.id = sl.live_id WHERE l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id) GROUP BY s.id, s.title ORDER BY cnt DESC, s.title LIMIT 10`);
        const total = await db.query(`SELECT COUNT(DISTINCT l.id)::int AS count FROM lives l WHERE l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s WHERE s.live_id = l.id)`);
        if (!rows.rows.length) throw Object.assign(new Error('ランキング対象のデータがありません'), { statusCode: 422 });
        return { body: buildFrequentRanking(rows.rows, total.rows[0].count), keyPart: `frequent_ranking:${new Date().toISOString().slice(0, 10)}` };
    }

    if (postType === 'rare_song') {
        const rows = await db.query(`SELECT s.title, COUNT(*)::int AS play_count, MIN(l.date)::text AS first_played FROM setlists sl JOIN songs s ON s.id = sl.song_id JOIN lives l ON l.id = sl.live_id WHERE l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id) GROUP BY s.id, s.title HAVING COUNT(*) BETWEEN 1 AND 3 ORDER BY play_count ASC, first_played DESC LIMIT 10`);
        if (!rows.rows.length) throw Object.assign(new Error('レア曲の対象データがありません'), { statusCode: 422 });
        return { body: buildRareSongs(rows.rows), keyPart: `rare_song:${new Date().toISOString().slice(0, 10)}` };
    }

    if (postType === 'seasonal') {
        const month = new Date().getMonth() + 1;
        const summer = month >= 6 && month <= 8;
        const months = summer ? [7, 8] : [12, 1, 2];
        const rows = await db.query(`SELECT s.title, COUNT(*)::int AS cnt FROM setlists sl JOIN songs s ON s.id = sl.song_id JOIN lives l ON l.id = sl.live_id WHERE EXTRACT(MONTH FROM l.date) = ANY($1::int[]) GROUP BY s.id, s.title ORDER BY cnt DESC, s.title LIMIT 5`, [months]);
        if (!rows.rows.length) throw Object.assign(new Error('季節ネタの対象データがありません'), { statusCode: 422 });
        return { body: buildSeasonal(rows.rows, summer ? 'summer' : 'winter'), keyPart: `seasonal:${summer ? 'summer' : 'winter'}:${new Date().getFullYear()}` };
    }

    const tourName = String(req.body.tourName || '').trim();
    if (!tourName) throw Object.assign(new Error('ツアー名を指定してください'), { statusCode: 400 });
    const rows = await db.query(`SELECT s.title, COUNT(*)::int AS cnt FROM setlists sl JOIN songs s ON s.id = sl.song_id JOIN lives l ON l.id = sl.live_id WHERE l.tour_name = $1 GROUP BY s.id, s.title ORDER BY cnt DESC, s.title LIMIT 5`, [tourName]);
    const total = await db.query('SELECT COUNT(*)::int AS count FROM lives WHERE tour_name = $1', [tourName]);
    if (!rows.rows.length) throw Object.assign(new Error('指定ツアーのセトリがありません'), { statusCode: 422 });
    const body = `【${tourName} 全${total.rows[0].count}公演 データまとめ📊】\n\n▶️ 演奏回数ランキング\n${lineList(rows.rows.slice(0, 3), (row, i) => `${['🥇', '🥈', '🥉'][i]}「${row.title}」… ${row.cnt}回`)}\n\n全セトリ詳細はこちら👇\n${APP_URL}\n\n#UVERworld`;
    return { body, keyPart: `tour_stats:${tourName}:${new Date().toISOString().slice(0, 10)}` };
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        let where = '';
        if (['draft', 'approved', 'published', 'failed'].includes(req.query.status)) {
            params.push(req.query.status); where = 'WHERE sp.status = $1';
        }
        const result = await db.query(`SELECT sp.*, l.date AS live_date, l.venue AS live_venue, l.tour_name AS live_tour_name FROM social_posts sp LEFT JOIN lives l ON l.id = sp.live_id ${where} ORDER BY sp.created_at DESC LIMIT 100`, params);
        res.json(result.rows);
    } catch (err) { console.error('[social-posts] list error:', err); res.status(500).json({ message: '投稿候補の取得に失敗しました' }); }
});

router.post('/generate', async (req, res) => {
    const postType = String(req.body.postType || '');
    if (!POST_TYPES.has(postType)) return res.status(400).json({ message: '無効な投稿カテゴリです' });
    try {
        const generated = await generatePost(postType, req);
        const key = crypto.createHash('sha256').update(`x:${generated.keyPart}`).digest('hex');
        const result = await db.query(`INSERT INTO social_posts (platform, post_type, live_id, body, idempotency_key, created_by) VALUES ('x', $1, $2, $3, $4, $5) ON CONFLICT (idempotency_key) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW() RETURNING *`, [postType, generated.liveId || null, generated.body.slice(0, 280), key, req.user.user_id || req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error('[social-posts] generate error:', err); res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : '投稿候補の生成に失敗しました' }); }
});

router.patch('/:id', async (req, res) => {
    const { body, status } = req.body;
    if (body !== undefined && (!body || body.length > 280)) return res.status(400).json({ message: '投稿本文は1〜280文字で指定してください' });
    if (status !== undefined && !['draft', 'approved'].includes(status)) return res.status(400).json({ message: '変更できないステータスです' });
    const fields = []; const params = [];
    if (body !== undefined) { fields.push(`body = $${params.length + 1}`); params.push(body); }
    if (status !== undefined) { fields.push(`status = $${params.length + 1}`); params.push(status); }
    if (!fields.length) return res.status(400).json({ message: '更新項目がありません' });
    params.push(req.params.id);
    try {
        const result = await db.query(`UPDATE social_posts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} AND status IN ('draft', 'approved') RETURNING *`, params);
        if (!result.rows.length) return res.status(404).json({ message: '編集可能な投稿候補が見つかりません' });
        res.json(result.rows[0]);
    } catch (err) { console.error('[social-posts] update error:', err); res.status(500).json({ message: '投稿候補の更新に失敗しました' }); }
});

router.post('/:id/publish', async (req, res) => {
    const parsed = parseXPostUrl(req.body.postUrl);
    if (!parsed) return res.status(400).json({ message: '有効なXの投稿URLを入力してください' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `UPDATE social_posts
             SET status = 'published', external_post_id = $1, external_post_url = $2,
                 published_at = NOW(), error_message = NULL, updated_at = NOW()
             WHERE id = $3 AND status = 'approved'
             RETURNING *`,
            [parsed.postId, parsed.postUrl, req.params.id]
        );
        if (!result.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'チェック済みの投稿だけを投稿済みにできます' });
        }
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[social-posts] publish error:', err);
        res.status(500).json({ message: '投稿済みへの更新に失敗しました' });
    } finally {
        client.release();
    }
});

module.exports = router;
module.exports.parseXPostUrl = parseXPostUrl;
