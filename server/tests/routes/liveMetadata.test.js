jest.mock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => {
        if (!req.header('token')) return res.sendStatus(403);
        req.user = { user_id: 1, role: req.header('token') };
        next();
    },
    adminCheck: (req, res, next) => req.user.role === 'admin' ? next() : res.sendStatus(403),
}));
const request = require('supertest');
const express = require('express');
const db = require('../../db');
const app = express();
app.use(express.json());
app.use('/api/lives/:id/metadata', require('../../routes/liveMetadata'));
let client;
let stored;
let live;

beforeEach(() => {
    jest.clearAllMocks();
    live = { id: 42, title: 'Fixture live', tour_name: null, special_note: null };
    stored = { live_id: 42, candidates: { tags: ['mens', 'birthday'], countryCode: 'KR' }, overrides: {}, revision: 3 };
    client = { query: jest.fn(), release: jest.fn() };
    client.query.mockImplementation(async sql => {
        if (/^SELECT id(?:, title, tour_name, special_note)? FROM lives/.test(sql)) return { rows: [live] };
        if (sql.startsWith('SELECT * FROM live_metadata')) return { rows: [stored] };
        return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);
    db.query.mockImplementation(async () => ({ rows: [{ ...live, ...stored }] }));
});
const patch = (value, path = '') => request(app).patch(`/api/lives/42/metadata${path}`)
    .set('token', 'admin').send({ revision: 3, patch: value });
const saved = () => {
    const call = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO live_metadata ('));
    return { candidates: JSON.parse(call[1][1]), overrides: JSON.parse(call[1][2]) };
};

describe('ライブ追加情報専用API', () => {
    it.each(['2147483648', '9007199254740991', '0', '-1', '1e3'])('DB整数範囲外/非整数の公演ID %s を全操作でDB接続前に拒否する', async id => {
        for (const suffix of ['', '/candidates']) {
            const write = await request(app).patch(`/api/lives/${id}/metadata${suffix}`).set('token', 'admin').send({ revision: 3, patch: {} });
            expect(write.status).toBe(400);
        }
        expect((await request(app).get(`/api/lives/${id}/metadata`).set('token', 'admin')).status).toBe(400);
        expect(db.query).not.toHaveBeenCalled(); expect(db.pool.connect).not.toHaveBeenCalled();
    });
    it('DB整数範囲の最大公演IDは読み取り対象にできる', async () => {
        stored.live_id = 2147483647;
        expect((await request(app).get('/api/lives/2147483647/metadata').set('token', 'admin')).status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(expect.any(String), ['2147483647']);
    });
    it.each(['', 'user'])('未認証/一般ユーザーには管理情報を公開しない (%s)', async token => {
        const read = await request(app).get('/api/lives/42/metadata').set('token', token);
        const write = await request(app).patch('/api/lives/42/metadata').set('token', token).send({ revision: 3, patch: {} });
        expect(read.status).toBe(403);
        expect(write.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('未確認の国・メンバー候補を確定情報にしない', async () => {
        const res = await request(app).get('/api/lives/42/metadata').set('token', 'admin');
        expect(res.status).toBe(200);
        expect(res.body.effective.country).toEqual({ code: null, status: 'unreviewed' });
        expect(res.body.effective.tags).not.toContain('overseas');
    });

    it('候補タグ未保存の管理GETは公開と同じ名称fallbackを使い、候補そのものは変更しない', async () => {
        live.title = 'Birthday Live'; stored.candidates = { countryCode: 'JP' };
        const res = await request(app).get('/api/lives/42/metadata').set('token', 'admin');
        expect(res.status).toBe(200);
        expect(res.body.effective.tags).toEqual(['birthday']);
        expect(res.body.candidates).toEqual({ countryCode: 'JP' });
        expect(res.body).not.toHaveProperty('title');
    });

    it.each([{ country: { code: 'JP' } }, { tagOverrides: null }])('無関係な手動保存/タグreset後も公開と同じ名称fallbackを返す %j', async value => {
        live.title = 'Birthday Live'; stored.candidates = {};
        if ('tagOverrides' in value) stored.overrides = { tagOverrides: { add: [], remove: ['birthday'] } };
        const res = await patch(value);
        expect(res.status).toBe(200);
        expect(res.body.effective.tags).toEqual(['birthday']);
        expect(saved().candidates).toEqual({});
    });

    it('国候補だけの保存で名称由来タグを消さず、明示タグ空配列だけがfallbackを抑制する', async () => {
        live.title = 'Birthday Live'; stored.candidates = {};
        const omitted = await patch({ countryCode: 'JP' }, '/candidates');
        expect(omitted.status).toBe(200);
        expect(omitted.body.effective.tags).toEqual(['birthday']);
        expect(saved().candidates).not.toHaveProperty('tags');
        const explicit = await patch({ tags: [] }, '/candidates');
        expect(explicit.status).toBe(200);
        expect(explicit.body.effective.tags).toEqual([]);
    });

    it('明示空タグの管理GETと手動保存でも名称fallbackを復活させない', async () => {
        live.title = 'Birthday Live'; stored.candidates = { tags: [] };
        expect((await request(app).get('/api/lives/42/metadata').set('token', 'admin')).body.effective.tags).toEqual([]);
        expect((await patch({ country: { code: 'JP' } })).body.effective.tags).toEqual([]);
    });

    it('手動確定した開催国から海外属性を導出し、更新履歴も同時保存する', async () => {
        const res = await patch({ country: { code: 'kr' } });
        expect(res.status).toBe(200);
        expect(res.body.effective.country).toEqual({ code: 'KR', status: 'confirmed' });
        expect(res.body.effective.tags).toContain('overseas');
        expect(res.body.revision).toBe(4);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO live_metadata_history'), expect.arrayContaining(['manual']));
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(client.query.mock.calls.some(([sql]) => /UPDATE lives|DELETE FROM setlists|INSERT INTO setlists/.test(sql))).toBe(false);
    });

    it('再取得した候補で手動追加・除外・開催国を上書きしない', async () => {
        stored.overrides = { tagOverrides: { add: ['vs'], remove: ['mens'] }, country: { code: 'JP' } };
        const res = await patch({ tags: ['mens', 'christmas'], countryCode: 'KR' }, '/candidates');
        expect(res.status).toBe(200);
        expect(saved().overrides).toEqual(stored.overrides);
        expect(res.body.effective.tags).toEqual(['christmas', 'vs']);
        expect(res.body.effective.country.code).toBe('JP');
    });

    it('項目省略で他の手動設定を保持し、nullは指定項目だけ自動候補へ戻す', async () => {
        stored.overrides = { tagOverrides: { add: [], remove: ['mens'] }, country: { code: 'JP' } };
        const res = await patch({ tagOverrides: null });
        expect(res.status).toBe(200);
        expect(res.body.effective.tags).toContain('mens');
        expect(saved().overrides).toEqual({ country: { code: 'JP' } });
    });

    it('確認済みのメンバーなしと未確認を区別する', async () => {
        const res = await patch({ members: { ids: [] } });
        expect(res.status).toBe(200);
        expect(res.body.effective.members).toEqual({ ids: [], status: 'confirmed' });
    });

    it('分類に収まらない企画のメモを保存できる', async () => {
        const res = await patch({ classification: { needsReview: true, note: '未知の企画。公式説明を確認する' } });
        expect(res.status).toBe(200);
        expect(res.body.effective.classification.needsReview).toBe(true);
    });

    it.each([
        { country: { code: 'XX' } },
        { country: { code: null } },
        { tagOverrides: { add: ['free-tag'] } },
        { tagOverrides: { add: ['mens'], remove: ['mens'] } },
        { members: { ids: ['unknown'] } },
        { arbitrary: 'value' },
    ])('不正な手動設定を保存前に拒否する %j', async value => {
        expect((await patch(value)).status).toBe(400);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('生誕祭を除外したまま対象メンバーを確定できない', async () => {
        const res = await patch({ tagOverrides: { remove: ['birthday'] }, members: { ids: ['takuya'] } });
        expect(res.status).toBe(400);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO live_metadata'))).toBe(false);
    });

    it('同時編集の古いrevisionを409で拒否する', async () => {
        stored.revision = 4;
        expect((await patch({ country: { code: 'JP' } })).status).toBe(409);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO live_metadata'))).toBe(false);
    });

    it('新規属性行をrevision 0から作成し、原文も保存する', async () => {
        client.query.mockImplementation(async sql => ({ rows: /^SELECT id(?:, title, tour_name, special_note)? FROM lives/.test(sql) ? [live] : [] }));
        const res = await request(app).patch('/api/lives/42/metadata/candidates').set('token', 'admin').send({
            revision: 0, patch: { tags: ['vs'], sourceId: 'fixture', original: { info: 'UVERworld vs Fixture Artist' }, ruleVersion: 1 },
        });
        expect(res.status).toBe(200);
        expect(res.body.revision).toBe(1);
        expect(saved().candidates.original.info).toBe('UVERworld vs Fixture Artist');
    });

    it('存在しない公演は404で、孤立した属性行を作らない', async () => {
        client.query.mockResolvedValue({ rows: [] });
        expect((await patch({})).status).toBe(404);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('履歴保存失敗も含めてロールバックする', async () => {
        const implementation = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, values) => {
            if (sql.includes('INSERT INTO live_metadata_history')) throw new Error('fixture audit failure');
            return implementation(sql, values);
        });
        expect((await patch({ country: { code: 'JP' } })).status).toBe(500);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query).not.toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('対バン相手を確認済みで保存し、関連テーブルとタグも更新する', async () => {
        const impl = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, values) => sql.includes('FROM live_artists')
            ? { rows: [{ id: 10, name: 'Fixture Artist', aliases: [], revision: 0 }] } : impl(sql, values));
        const res = await patch({ participants: { items: [{ artistId: 10, role: 'co_headliner' }] } });
        expect(res.status).toBe(200);
        expect(res.body.effective.tags).toContain('vs');
        expect(res.body.effective.participants.status).toBe('confirmed');
        expect(res.body.artists[0].name).toBe('Fixture Artist');
        expect(client.query).toHaveBeenCalledWith('INSERT INTO live_collaborators (live_id, artist_id, role) VALUES ($1, $2, $3)', ['42', 10, 'co_headliner']);
    });

    it('ゲストだけでは対バンタグを生成しない', async () => {
        const impl = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, values) => sql.includes('FROM live_artists')
            ? { rows: [{ id: 10, name: 'Fixture Artist', aliases: [], revision: 0 }] } : impl(sql, values));
        const res = await patch({ participants: { items: [{ artistId: 10, role: 'guest' }] } });
        expect(res.status).toBe(200);
        expect(res.body.effective.tags).not.toContain('vs');
    });

    it('確認済み共演者なしと未確認への復帰を区別し、古い関連行を削除する', async () => {
        const none = await patch({ participants: { items: [] } });
        expect(none.status).toBe(200);
        expect(none.body.effective.participants).toEqual({ items: [], status: 'confirmed' });
        const reset = await patch({ participants: null });
        expect(reset.status).toBe(200);
        expect(reset.body.effective.participants).toEqual({ items: [], status: 'unreviewed' });
        expect(client.query).toHaveBeenCalledWith('DELETE FROM live_collaborators WHERE live_id = $1', ['42']);
    });

    it('共演者関連の保存失敗も属性・履歴と同じトランザクションで取り消す', async () => {
        const impl = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, values) => {
            if (sql.includes('FROM live_artists')) return { rows: [{ id: 10, name: 'Fixture Artist', aliases: [], revision: 0 }] };
            if (sql.startsWith('INSERT INTO live_collaborators')) throw new Error('fixture relation error');
            return impl(sql, values);
        });
        expect((await patch({ participants: { items: [{ artistId: 10, role: 'guest' }] } })).status).toBe(500);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    });

    it('未登録アーティストは保存しない', async () => {
        const res = await patch({ participants: { items: [{ artistId: 999, role: 'guest' }] } });
        expect(res.status).toBe(400);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO live_metadata'))).toBe(false);
    });

    it.each([
        [{ artistId: 10, role: 'festival_act' }],
        [{ artistId: '10', role: 'guest' }],
        [{ artistId: 10, role: 'guest' }, { artistId: 10, role: 'guest' }],
    ])('不正/重複した共演者を拒否する %j', async items => {
        expect((await patch({ participants: { items } })).status).toBe(400);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('対バン相手を登録したまま対バンタグを除外する矛盾を拒否する', async () => {
        const res = await patch({ participants: { items: [{ artistId: 10, role: 'co_headliner' }] }, tagOverrides: { remove: ['vs'] } });
        expect(res.status).toBe(400);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('不正なURLと候補タグ、巨大原文を拒否する', async () => {
        for (const value of [{ sourceUrl: 'javascript:alert(1)' }, { tags: ['acoustic'] }, { original: { text: 'a'.repeat(66000) } }]) {
            expect((await patch(value, '/candidates')).status).toBe(400);
        }
        expect(db.pool.connect).not.toHaveBeenCalled();
    });
});
