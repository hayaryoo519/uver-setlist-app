jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (_req, _res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const statsRouter = require('../../routes/stats');

const app = express();
app.use(express.json());
app.use('/api/stats', statsRouter);

function sqlFor(fragment) {
    const call = db.query.mock.calls.find(([sql]) => sql.includes(fragment));
    return call ? call[0] : null;
}

describe('GET /api/stats のライブ抽出条件', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockResolvedValue({ rows: [] });
    });

    // ドラフト取り込みでは setlists に曲が入るだけのことがあり、
    // setlist_status だけを見ると当日のライブが LatestLive から漏れる
    it('LatestLive は setlists の存在も確定条件に含めること', async () => {
        await request(app).get('/api/stats');

        const sql = sqlFor('ORDER BY date DESC');
        expect(sql).toContain("setlist_status = 'NORMAL'");
        expect(sql).toContain('EXISTS (SELECT 1 FROM setlists');
    });

    it('NextLive は LatestLive の条件を厳密に裏返すこと', async () => {
        await request(app).get('/api/stats');

        const sql = sqlFor('ORDER BY date ASC');
        expect(sql).toContain("setlist_status IS DISTINCT FROM 'NORMAL'");
        expect(sql).toContain('NOT EXISTS (SELECT 1 FROM setlists');
    });

    // 同じ公演が LatestLive と NextLive の両方に出たり、
    // どちらからも漏れたりしないこと
    it('当日のライブがどちらか一方にだけ該当すること', async () => {
        await request(app).get('/api/stats');

        const latest = sqlFor('ORDER BY date DESC');
        const next = sqlFor('ORDER BY date ASC');
        const confirmed = { status: 'NORMAL', hasSetlist: true };
        const unconfirmed = { status: null, hasSetlist: false };

        const inLatest = (l) => l.status === 'NORMAL' || l.hasSetlist;
        const inNext = (l) => l.status !== 'NORMAL' && !l.hasSetlist;

        expect(latest && next).toBeTruthy();
        for (const live of [confirmed, unconfirmed, { status: null, hasSetlist: true }]) {
            expect(inLatest(live)).toBe(!inNext(live));
        }
    });
});
