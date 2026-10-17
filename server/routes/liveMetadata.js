const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const { validateCandidates, validateManual, mergeManual, mergeCandidateSources } = require('../utils/liveMetadata');
const { effectiveLiveMetadata } = require('../services/liveMetadataProjection');

router.use(authorize, adminCheck);
router.use((req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) > 2147483647) {
        return res.status(400).json({ message: 'Invalid live ID' });
    }
    next();
});

async function artistsFor(items, connection = db, lock = false) {
    const ids = [...new Set(items.map(item => item.artistId))].sort((a, b) => a - b);
    if (!ids.length) return [];
    const result = await connection.query(`SELECT id, name, aliases, revision FROM live_artists WHERE id = ANY($1::int[]) ORDER BY id${lock ? ' FOR KEY SHARE' : ''}`, [ids]);
    if (result.rows.length !== ids.length) {
        const error = new Error('Unknown participant artist; select a registered artist');
        error.statusCode = 400;
        throw error;
    }
    return result.rows;
}

const response = (row, live) => ({
    ...row,
    effective: effectiveLiveMetadata(live, row.candidates, row.overrides),
});

router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT l.id AS live_id, l.title, l.tour_name, l.special_note, COALESCE(m.candidates, '{}'::jsonb) AS candidates,
                    COALESCE(m.overrides, '{}'::jsonb) AS overrides, COALESCE(m.revision, 0) AS revision
             FROM lives l LEFT JOIN live_metadata m ON m.live_id = l.id WHERE l.id = $1`, [req.params.id],
        );
        if (!result.rows.length) return res.status(404).json({ message: 'Live not found' });
        const { title, tour_name, special_note, ...metadata } = result.rows[0];
        const payload = response(metadata, { title, tour_name, special_note });
        payload.artists = await artistsFor(payload.effective.participants.items);
        res.json(payload);
    } catch (err) {
        res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Metadata read failed' });
    }
});

function update(operation) {
    return async (req, res) => {
        let client;
        try {
            const { revision, patch } = req.body || {};
            if (!Number.isSafeInteger(revision) || revision < 0 || Object.keys(req.body).some(k => !['revision', 'patch'].includes(k))) {
                return res.status(400).json({ message: 'revision and patch are required' });
            }
            const validated = operation === 'manual' ? validateManual(patch) : validateCandidates(patch);
            client = await db.pool.connect();
            await client.query('BEGIN');
            // 公演行のロックで属性行の初回作成も直列化。ライブやセトリ自体は更新しない。
            const live = await client.query('SELECT id, title, tour_name, special_note FROM lives WHERE id = $1 FOR UPDATE', [req.params.id]);
            if (!live.rows.length) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Live not found' });
            }
            const result = await client.query('SELECT * FROM live_metadata WHERE live_id = $1', [req.params.id]);
            const before = result.rows[0] || { live_id: Number(req.params.id), candidates: {}, overrides: {}, revision: 0 };
            if (before.revision !== revision) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Metadata changed; reload before saving' });
            }
            const after = {
                live_id: before.live_id,
                candidates: operation === 'candidates' ? mergeCandidateSources(before.candidates, validated) : before.candidates,
                overrides: operation === 'manual' ? mergeManual(before.overrides, validated) : before.overrides,
                revision: revision + 1,
            };
            const payload = response(after, live.rows[0]); // 公開と同じ有効値で保存前の整合性を検証する。
            payload.artists = await artistsFor(payload.effective.participants.items, client, true);
            await client.query(
                `INSERT INTO live_metadata (live_id, candidates, overrides, revision)
                 VALUES ($1, $2::jsonb, $3::jsonb, $4)
                 ON CONFLICT (live_id) DO UPDATE SET candidates = EXCLUDED.candidates,
                 overrides = EXCLUDED.overrides, revision = EXCLUDED.revision, updated_at = NOW()`,
                [req.params.id, JSON.stringify(after.candidates), JSON.stringify(after.overrides), after.revision],
            );
            if (Object.prototype.hasOwnProperty.call(validated, 'participants')) {
                await client.query('DELETE FROM live_collaborators WHERE live_id = $1', [req.params.id]);
                for (const item of payload.effective.participants.items) {
                    await client.query('INSERT INTO live_collaborators (live_id, artist_id, role) VALUES ($1, $2, $3)',
                        [req.params.id, item.artistId, item.role]);
                }
            }
            await client.query(
                `INSERT INTO live_metadata_history (live_id, actor_id, operation, before_state, after_state)
                 VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
                [req.params.id, req.user.user_id, operation, JSON.stringify(before), JSON.stringify(after)],
            );
            await client.query('COMMIT');
            res.json(payload);
        } catch (err) {
            if (client) {
                try { await client.query('ROLLBACK'); } catch { /* 接続異常でも元のエラー応答とreleaseを維持する。 */ }
            }
            res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Metadata update failed' });
        } finally {
            if (client) client.release();
        }
    };
}

router.patch('/', update('manual'));
router.patch('/candidates', update('candidates'));
module.exports = router;
