jest.mock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
jest.mock('../../utils/pushNotification', () => ({ notifyNewLive: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/songTranslations', () => ({ normalizeVenueName: name => name }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (req, res, next) => next(),
}));
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const { notifyNewLive } = require('../../utils/pushNotification');
const app = express();
app.use(express.json());
app.use('/api/lives', require('../../routes/lives'));
let client;
const body = () => ({
    tour_name: 'Fixture Tour', date: '2020-12-21', venue: 'Fixture Hall',
    metadata_source: { type: 'setlistfm', original: {
        id: 'fixture', eventDate: '21-12-2020', tour: { name: 'Fixture Tour' },
        info: 'UVERworld VS Fixture Artist', venue: { name: 'Fixture Hall', city: { country: { code: 'KR' } } },
        url: 'https://example.test/live',
    } },
});
beforeEach(() => {
    jest.clearAllMocks();
    client = { query: jest.fn(async sql => {
        if (sql.includes('INSERT INTO lives')) return { rows: [{ id: 42, tour_name: 'Fixture Tour' }] };
        if (sql.startsWith('SELECT id FROM lives')) return { rows: [{ id: 42 }] };
        return { rows: [] };
    }), release: jest.fn() };
    db.pool.connect.mockResolvedValue(client);
    db.query.mockResolvedValue({ rows: [{ id: 42 }] });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('検索画面からの公演追加＋原文候補保存', () => {
    it('公演と原文候補を同一トランザクションで保存し、commit後に通知する', async () => {
        const res = await request(app).post('/api/lives').send(body());
        expect(res.status).toBe(200);
        const live = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO lives'));
        expect(live[0]).toContain('setlistfm_id');
        expect(live[1][9]).toBe('fixture');
        const meta = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO live_metadata ('));
        expect(JSON.parse(meta[1][1])).toMatchObject({ countryCode: 'KR', tags: ['vs'], sourceId: 'setlistfm:fixture' });
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(notifyNewLive).toHaveBeenCalledTimes(1);
        expect(client.query.mock.calls.some(([sql]) => sql.includes('setlists'))).toBe(false);
    });

    it('原文候補の保存失敗は公演追加もロールバックし、通知しない', async () => {
        const impl = client.query.getMockImplementation();
        client.query.mockImplementation(async (sql, params) => {
            if (sql.includes('INSERT INTO live_metadata (')) throw new Error('fixture metadata failure');
            return impl(sql, params);
        });
        expect((await request(app).post('/api/lives').send(body())).status).toBe(500);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.query).not.toHaveBeenCalledWith('COMMIT');
        expect(notifyNewLive).not.toHaveBeenCalled();
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('setlist.fm IDの重複は409で、公演・候補を追加しない', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.includes('INSERT INTO lives')) throw Object.assign(new Error('duplicate'), { code: '23505' });
            return { rows: [] };
        });
        expect((await request(app).post('/api/lives').send(body())).status).toBe(409);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(notifyNewLive).not.toHaveBeenCalled();
    });

    it('出典ID欠落や取得元と公演日が不一致の場合は追加前に拒否する', async () => {
        const missing = body(); delete missing.metadata_source.original.id;
        const wrongDate = body(); wrongDate.date = '2020-12-25';
        for (const input of [missing, wrongDate, { ...body(), metadata_source: { type: 'unknown' } }]) {
            expect((await request(app).post('/api/lives').send(input)).status).toBe(400);
        }
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('原文なしの旧クライアント追加は従来の契約を維持する', async () => {
        const input = body(); delete input.metadata_source;
        const res = await request(app).post('/api/lives').send(input);
        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lives'), expect.any(Array));
        expect(db.pool.connect).not.toHaveBeenCalled();
    });
});
