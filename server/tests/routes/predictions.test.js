jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => { req.user = { user_id: 27 }; next(); },
    getOptionalUserId: jest.fn().mockResolvedValue(27),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const app = express();
app.use(express.json());
app.use('/api/predictions', require('../../routes/predictions'));

describe('予想APIのログ保護と既存動作', () => {
    const marker = 'private-prediction@example.invalid Bearer fixture-token';
    let errorSpy;
    let client;

    beforeEach(() => {
        jest.clearAllMocks();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        client = { query: jest.fn(), release: jest.fn() };
        db.pool = { connect: jest.fn().mockResolvedValue(client) };
    });

    afterEach(() => {
        try {
            expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(marker);
        } finally {
            errorSpy.mockRestore();
        }
    });

    it.each([
        ['get', '/lives', {}, 'Fetch predictable lives error', false],
        ['get', '/?live_id=5', {}, 'Fetch predictions error', false],
        ['get', '/me', {}, 'Fetch predictions error', false],
        ['get', '/5', {}, 'Fetch prediction detail error', false],
        ['post', '/', { live_id: 5, songs: [1], title: marker }, 'Create prediction error', true],
        ['put', '/5', { songs: [1], title: marker }, 'Update prediction error', true],
        ['delete', '/5', {}, 'Delete prediction error', false],
        ['post', '/5/like', {}, 'Toggle like error', false],
    ])('%s %s のエラー詳細を出さない', async (method, path, body, diagnostic, usesClient) => {
        const query = usesClient ? client.query : db.query;
        query.mockRejectedValueOnce(new Error(marker)).mockResolvedValue({ rows: [] });
        const res = await request(app)[method](`/api/predictions${path}`).send(body);
        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(errorSpy).toHaveBeenCalledWith(`${diagnostic}: details suppressed`);
        if (usesClient) {
            expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            expect(client.release).toHaveBeenCalledTimes(1);
        }
    });

    it('他人の予想は更新せず403を返し接続を解放する', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ id: 5, user_id: 28, live_date: '2999-01-01' }] });
        const res = await request(app).put('/api/predictions/5').send({ songs: [1], title: 'T' });
        expect(res.statusCode).toBe(403);
        expect(client.query).toHaveBeenCalledTimes(1);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('予想削除の所有者条件を維持する', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).delete('/api/predictions/5');
        expect(res.statusCode).toBe(404);
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('AND user_id = $2 AND deleted_at IS NULL'), ['5', 27]);
    });

    it('予想作成のトランザクションと応答を維持する', async () => {
        client.query.mockResolvedValue({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ date: '2999-01-01' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 5, title: 'T' }] });
        const res = await request(app).post('/api/predictions').send({ live_id: 7, songs: [1, 2], title: 'T' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ id: 5, title: 'T' });
        expect(client.query).toHaveBeenCalledWith('BEGIN');
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO predictions'), [27, 7, 'T']);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO prediction_songs'), [5, 2, 2]);
        expect(client.query.mock.calls.at(-1)[0]).toBe('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('自分の予想更新の楽曲差替えとトランザクションを維持する', async () => {
        client.query.mockResolvedValue({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 5, user_id: 27, live_date: '2999-01-01', title: 'old' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 5, title: 'new' }] });
        const res = await request(app).put('/api/predictions/5').send({ songs: [2], title: 'new' });
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('new');
        expect(client.query).toHaveBeenCalledWith('BEGIN');
        expect(client.query).toHaveBeenCalledWith('DELETE FROM prediction_songs WHERE prediction_id = $1', ['5']);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE predictions SET title'), ['new', '5']);
        expect(client.query.mock.calls.at(-1)[0]).toBe('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('重複作成時は詳細を出さず既存の409応答を維持する', async () => {
        client.query.mockRejectedValueOnce(Object.assign(new Error(marker), { code: '23505' }))
            .mockResolvedValueOnce({ rows: [] });
        db.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
        const res = await request(app).post('/api/predictions').send({ live_id: 7, songs: [1] });
        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({ message: 'already_exists', prediction_id: 5 });
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('user_id = $1 AND live_id = $2'), [27, 7]);
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
