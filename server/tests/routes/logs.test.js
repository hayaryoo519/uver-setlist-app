const request = require('supertest');
const express = require('express');
const db = require('../../db');

jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => {
        req.user = { user_id: 1, role: 'admin' };
        next();
    },
    adminCheck: (_req, _res, next) => next(),
}));

const logsRouter = require('../../routes/logs');

const app = express();
app.use(express.json());
app.use('/api/logs', logsRouter);

/**
 * GET /api/logs/collector に渡された LIMIT を取り出す
 */
function limitPassedToDb() {
    const call = db.query.mock.calls.find(([sql]) => sql.includes('FROM collector_logs'));
    return call[1][0];
}

describe('GET /api/logs/collector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockResolvedValue({ rows: [] });
    });

    it('limit 未指定なら既定の10件を返すこと', async () => {
        const res = await request(app).get('/api/logs/collector');

        expect(res.statusCode).toBe(200);
        expect(limitPassedToDb()).toBe(10);
    });

    it('指定した件数を使うこと', async () => {
        await request(app).get('/api/logs/collector?limit=50');

        expect(limitPassedToDb()).toBe(50);
    });

    // ダッシュボードからの指定値をそのまま信用しない
    it('上限200を超える指定は200に丸めること', async () => {
        await request(app).get('/api/logs/collector?limit=9999');

        expect(limitPassedToDb()).toBe(200);
    });

    it('0以下の指定は1に丸めること', async () => {
        await request(app).get('/api/logs/collector?limit=0');

        expect(limitPassedToDb()).toBe(1);
    });

    it('数値でない指定は既定値に戻すこと', async () => {
        await request(app).get('/api/logs/collector?limit=abc');

        expect(limitPassedToDb()).toBe(10);
    });

    it('収集ログを返すこと', async () => {
        const logs = [{ id: 1, level: 'info', message: 'X collection finished', details: { fetched: 20 } }];
        db.query.mockResolvedValue({ rows: logs });

        const res = await request(app).get('/api/logs/collector');

        expect(res.body.logs).toEqual(logs);
    });
});
