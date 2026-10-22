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
const { notifyDraftAdded } = require('../../utils/lineNotification');
const draftsRouter = require('../../routes/drafts');

const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

describe('ドラフトAPIのログ保護', () => {
    const privateMarker = 'private-draft@example.invalid Bearer private-token';
    let errorSpy;
    let warnSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
    });

    it.each([
        ['post', '/', { rawText: 'CORE PRIDE' }, 'ドラフト作成エラー: 詳細は非表示'],
        ['get', '/', {}, 'ドラフト一覧取得エラー: 詳細は非表示'],
        ['get', '/5', {}, 'ドラフト詳細取得エラー: 詳細は非表示'],
        ['patch', '/5', { status: 'approved' }, 'ドラフト更新エラー: 詳細は非表示'],
        ['delete', '/5', {}, 'ドラフト削除エラー: 詳細は非表示'],
        ['post', '/5/parse', {}, 'GPT整形エラー: 詳細は非表示'],
    ])('%s %s のDBエラー詳細を出さない', async (method, path, body, diagnostic) => {
        db.query.mockRejectedValueOnce(new Error(privateMarker));

        const res = await request(app)[method](`/api/drafts${path}`).send(body);

        expect(res.statusCode).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain(privateMarker);
        expect(errorSpy).toHaveBeenCalledWith(diagnostic);
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateMarker);
    });

    it('通知失敗でもドラフトを作成し、通知エラー詳細を出さない', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
        notifyDraftAdded.mockRejectedValueOnce(new Error(privateMarker));

        const res = await request(app).post('/api/drafts').send({ rawText: 'CORE PRIDE' });

        expect(res.statusCode).toBe(201);
        expect(res.body.id).toBe(5);
        expect(errorSpy).toHaveBeenCalledWith('[LINE] 手動ドラフト通知エラー: 詳細は非表示');
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateMarker);
    });

    it('信頼度チェック失敗は固定ログで記録し、更新を継続する', async () => {
        db.query.mockRejectedValueOnce(new Error(privateMarker));
        db.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

        const res = await request(app).patch('/api/drafts/5').send({ rawText: 'CORE PRIDE' });

        expect(res.statusCode).toBe(200);
        expect(warnSpy).toHaveBeenCalledWith('Confidence計算中のDBチェック失敗: 詳細は非表示');
        expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(privateMarker);
    });

    it('確定失敗時はロールバックして詳細を出さない', async () => {
        const client = mockClient();
        client.query.mockRejectedValueOnce(new Error(privateMarker));

        const res = await request(app).post('/api/drafts/5/commit')
            .send({ liveId: 7, setlist: [{ songId: 11, position: 1 }] });

        expect(res.statusCode).toBe(500);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith('Commit エラー: 詳細は非表示');
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateMarker);
        expect(JSON.stringify(res.body)).not.toContain(privateMarker);
    });
});

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
