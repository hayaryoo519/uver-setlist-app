const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const { normalizeArtistName, validateArtist } = require('../utils/liveArtists');
router.use(authorize, adminCheck);

router.get('/', async (req, res) => {
    try {
        const search = req.query.search ?? '';
        if (typeof search !== 'string' || search.length > 200) return res.status(400).json({ message: 'Invalid artist search' });
        const needle = `%${normalizeArtistName(search).replace(/[\\%_]/g, '\\$&')}%`;
        const result = await db.query(
            `SELECT id, name, aliases, revision FROM live_artists
             WHERE normalized_name ILIKE $1 ESCAPE '\\'
                OR EXISTS (SELECT 1 FROM unnest(normalized_aliases) AS names(alias) WHERE alias ILIKE $1 ESCAPE '\\')
             ORDER BY name, id LIMIT 100`, [needle],
        );
        res.json(result.rows);
    } catch { res.status(500).json({ message: 'Artist search failed' }); }
});

function save(isUpdate) {
    return async (req, res) => {
        let client;
        try {
            const value = validateArtist(req.body);
            if (isUpdate && (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647 || !Number.isSafeInteger(req.body.revision) || req.body.revision < 0)) {
                return res.status(400).json({ message: 'Valid artist ID and revision are required' });
            }
            if (!isUpdate && req.body.revision !== undefined) return res.status(400).json({ message: 'revision is only used for updates' });
            client = await db.pool.connect();
            await client.query('BEGIN');
            let before = null;
            if (isUpdate) {
                const current = await client.query('SELECT id, name, aliases, revision FROM live_artists WHERE id = $1 FOR UPDATE', [req.params.id]);
                if (!current.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Artist not found' }); }
                before = current.rows[0];
                if (before.revision !== req.body.revision) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Artist changed; reload before saving' }); }
            }
            const result = isUpdate ? await client.query(
                `UPDATE live_artists SET name = $1, normalized_name = $2, aliases = $3, normalized_aliases = $4, revision = revision + 1, updated_at = NOW()
                 WHERE id = $5 RETURNING id, name, aliases, revision`, [value.name, value.normalizedName, value.aliases, value.normalizedAliases, req.params.id],
            ) : await client.query(
                'INSERT INTO live_artists (name, normalized_name, aliases, normalized_aliases) VALUES ($1, $2, $3, $4) RETURNING id, name, aliases, revision',
                [value.name, value.normalizedName, value.aliases, value.normalizedAliases],
            );
            const after = result.rows[0];
            await client.query('INSERT INTO live_artist_history (artist_id, actor_id, before_state, after_state) VALUES ($1, $2, $3::jsonb, $4::jsonb)',
                [after.id, req.user.user_id, before ? JSON.stringify(before) : null, JSON.stringify(after)]);
            await client.query('COMMIT');
            res.status(isUpdate ? 200 : 201).json(after);
        } catch (err) {
            if (client) { try { await client.query('ROLLBACK'); } catch { /* 元のエラーを維持 */ } }
            const status = err.code === '23505' ? 409 : err.statusCode || 500;
            res.status(status).json({ message: err.code === '23505' ? 'Artist name already registered; select the existing artist' : err.statusCode ? err.message : 'Artist save failed' });
        } finally { if (client) client.release(); }
    };
}
router.post('/', save(false));
router.patch('/:id', save(true));
module.exports = router;
