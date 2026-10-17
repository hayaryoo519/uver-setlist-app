jest.mock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { if (!req.header('token')) return res.sendStatus(403); req.user = { user_id: 1, role: req.header('token') }; next(); },
    adminCheck: (req, res, next) => req.user.role === 'admin' ? next() : res.sendStatus(403),
}));
const request = require('supertest');
const express = require('express');
const db = require('../../db');
const { normalizeArtistName, validateArtist } = require('../../utils/liveArtists');
const app = express(); app.use(express.json()); app.use('/api/live-artists', require('../../routes/liveArtists'));
let client;
let current;
beforeEach(() => {
    jest.clearAllMocks();
    current = { id: 10, name: 'Fixture Artist', aliases: ['FA'], revision: 0 };
    client = { query: jest.fn(async sql => {
        if (sql.includes('FOR UPDATE')) return { rows: [current] };
        if (sql.startsWith('INSERT INTO live_artists') || sql.startsWith('UPDATE live_artists')) return { rows: [current] };
        return { rows: [] };
    }), release: jest.fn() };
    db.pool.connect.mockResolvedValue(client);
    db.query.mockResolvedValue({ rows: [current] });
});
const save = (body, path = '') => request(app)[path ? 'patch' : 'post'](`/api/live-artists${path}`).set('token', 'admin').send(body);

describe('共演アーティスト辞書', () => {
    it.each(['', 'user'])('未認証/一般ユーザーは検索・登録できない (%s)', async token => {
        expect((await request(app).get('/api/live-artists').set('token', token)).status).toBe(403);
        expect((await request(app).post('/api/live-artists').set('token', token).send({ name: 'A', aliases: [] })).status).toBe(403);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });
    it('正式名/別名の検索にNFKCと小文字化を使い、記号は残す', async () => {
        const res = await request(app).get('/api/live-artists').query({ search: 'ＢＥ：ＦＩＲＳＴ' }).set('token', 'admin');
        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('unnest(normalized_aliases)'), ['%be:first%']);
        expect(normalizeArtistName(' BE:FIRST ')).toBe('be:first');
        expect(normalizeArtistName('BEFIRST')).not.toBe(normalizeArtistName('BE:FIRST'));
    });
    it('検索ワイルドカードはリテラルとしてエスケープする', async () => {
        await request(app).get('/api/live-artists').query({ search: 'A%_B' }).set('token', 'admin');
        expect(db.query.mock.calls[0][1]).toEqual(['%a\\%\\_b%']);
    });
    it('正式名と別名を同一IDへ登録し、辞書履歴も保存する', async () => {
        const res = await save({ name: 'Fixture Artist', aliases: ['FA', 'ＦＡ', 'fixture artist'] });
        expect(res.status).toBe(201);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO live_artists'), ['Fixture Artist', 'fixture artist', ['FA'], ['fa']]);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO live_artist_history'), expect.any(Array));
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
    });
    it('正式名の正規化重複は409で拒否し、別名一致だけで自動統合しない', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.startsWith('INSERT INTO live_artists')) throw Object.assign(new Error('duplicate'), { code: '23505' });
            return { rows: [] };
        });
        expect((await save({ name: 'fixture artist', aliases: [] })).status).toBe(409);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
    it('辞書更新の古いrevisionを拒否する', async () => {
        current.revision = 2;
        expect((await save({ name: 'Fixture Artist', aliases: ['Alias'], revision: 1 }, '/10')).status).toBe(409);
        expect(client.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE live_artists'))).toBe(false);
    });
    it('名前/別名を更新でき、IDは変えない', async () => {
        expect((await save({ name: 'Renamed Artist', aliases: ['Old Name'], revision: 0 }, '/10')).status).toBe(200);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE live_artists'), ['Renamed Artist', 'renamed artist', ['Old Name'], ['old name'], '10']);
    });
    it('辞書履歴保存が失敗したら登録もロールバックする', async () => {
        const impl = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, params) => {
            if (sql.includes('INSERT INTO live_artist_history')) throw new Error('fixture history error');
            return impl(sql, params);
        });
        expect((await save({ name: 'A', aliases: [] })).status).toBe(500);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    });
    it.each([{ name: '', aliases: [] }, { name: 'A', aliases: [null] }, { name: 'A', aliases: [], unexpected: true }])('不正な辞書入力を拒否する %j', async value => {
        expect((await save(value)).status).toBe(400);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });
    it('同じアーティストの別名だけ重複を除去する', () => {
        expect(validateArtist({ name: 'Ａ', aliases: ['a', 'B', 'ｂ', 'B!'] }).aliases).toEqual(['B', 'B!']);
    });
});
