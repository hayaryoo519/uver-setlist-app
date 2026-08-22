jest.mock('../../db');
jest.mock('../../utils/lineNotification', () => ({
    notifyDraftAdded: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (_req, _res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const draftsRouter = require('../../routes/drafts');

const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

/** commit が使うトランザクション用クライアント */
function mockClient() {
    const client = {
        query: jest.fn().mockImplementation((sql) => {
            if (sql.includes('FROM raw_setlists WHERE id')) return Promise.resolve({ rows: [{ id: 5, live_id: 7 }] });
            if (sql.includes('FROM lives WHERE id')) return Promise.resolve({ rows: [{ id: 7 }] });
            if (sql.includes('FROM songs')) return Promise.resolve({ rows: [{ id: 11 }] });
            return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
    };
    db.pool = { connect: jest.fn().mockResolvedValue(client) };
    return client;
}

describe('POST /api/drafts/:id/commit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // setlists に曲を入れても setlist_status を更新しないと、
    // 当日のライブがダッシュボードの LatestLive にも NextLive にも出なくなる
    it('ライブの setlist_status を NORMAL に更新すること', async () => {
        const client = mockClient();

        const res = await request(app)
            .post('/api/drafts/5/commit')
            .send({ liveId: 7, setlist: [{ songId: 11, position: 1, title: 'CORE PRIDE' }] });

        expect(res.statusCode).toBe(200);
        const update = client.query.mock.calls.find(
            ([sql]) => sql.includes('UPDATE lives') && sql.includes("setlist_status = 'NORMAL'")
        );
        expect(update).toBeDefined();
        expect(update[1]).toEqual([7]);
    });

    it('セトリ登録とドラフト確定を同じトランザクションで行うこと', async () => {
        const client = mockClient();

        await request(app)
            .post('/api/drafts/5/commit')
            .send({ liveId: 7, setlist: [{ songId: 11, position: 1, title: 'CORE PRIDE' }] });

        const sqls = client.query.mock.calls.map(([sql]) => sql);
        expect(sqls[0]).toContain('BEGIN');
        expect(sqls.some((s) => s.includes('INSERT INTO setlists'))).toBe(true);
        expect(sqls.some((s) => s.includes("status = 'approved'"))).toBe(true);
        expect(sqls[sqls.length - 1]).toContain('COMMIT');
    });
});
