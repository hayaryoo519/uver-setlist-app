jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (_req, _res, next) => next(),
    getOptionalUserId: jest.fn().mockResolvedValue(1),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const app = express(); app.use(express.json());
for (const route of ['corrections', 'import', 'music', 'songs', 'stats']) app.use(`/api/${route}`, require(`../../routes/${route}`));

describe('残るAPIのログ保護', () => {
    const marker = 'private-input@example.invalid Bearer fixture-token';
    const originalFetch = global.fetch;
    let errorSpy, logSpy, warnSpy;
    beforeEach(() => {
        jest.clearAllMocks();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        db.query.mockRejectedValue(new Error(marker));
        global.fetch = jest.fn().mockRejectedValue(new Error(marker));
    });
    afterEach(() => {
        try { expect(JSON.stringify([...errorSpy.mock.calls, ...logSpy.mock.calls, ...warnSpy.mock.calls])).not.toContain(marker); }
        finally { jest.restoreAllMocks(); global.fetch = originalFetch; }
    });

    it.each([
        ['post', '/corrections', { correction_type: 'other', description: marker }, '[CORRECTIONS] Error creating correction'],
        ['get', '/corrections', {}, '[CORRECTIONS] Error fetching corrections'],
        ['get', '/corrections/stats', {}, '[CORRECTIONS] Error fetching stats'],
        ['patch', '/corrections/5', { status: 'reviewed', admin_note: marker }, '[CORRECTIONS] Error updating correction'],
        ['delete', '/corrections/5', {}, '[CORRECTIONS] Error deleting correction'],
        ['get', '/songs', {}, 'API Error'],
        ['get', '/songs/5/stats', {}, 'Song stats error'],
        ['get', '/songs/5/performance-timeline', {}, '[performance-timeline] Error'],
        ['post', '/songs', { title: marker }, 'Song creation error'],
        ['put', '/songs/5', { title: marker }, 'Song update error'],
        ['delete', '/songs/5', {}, 'Song deletion error'],
        ['patch', '/songs/5/restore', {}, 'Song restoration error'],
        ['patch', '/songs/5/spotify', { spotify_track_id: marker }, 'Spotify track update error'],
        ['get', '/music/song-image/fixture-song', {}, '[iTunes] API Error'],
        ['get', '/music/album-image/fixture-album', {}, '[iTunes] Album API Error'],
        ['get', '/music/batch?titles=fixture-song', {}, '[iTunes] Batch API Error'],
        ['get', '/stats', {}, '[/api/stats] Error'],
    ])('%s %s のDB詳細を出さない', async (method, path, body, diagnostic) => {
        const res = await request(app)[method](`/api${path}`).send(body);
        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(errorSpy).toHaveBeenCalledWith(`${diagnostic}: details suppressed`);
    });

    it('管理者統計は固定ログで記録し、既存のフォールバックを続ける', async () => {
        const res = await request(app).get('/api/stats?admin=true');
        expect(res.statusCode).toBe(200);
        expect(res.text).not.toContain(marker);
        expect(errorSpy).toHaveBeenCalledWith('[STATS/ADMIN] Query failed: details suppressed');
    });

    it('CSV更新失敗はロールバックして固定ログにする', async () => {
        const client = { query: jest.fn().mockRejectedValueOnce(new Error(marker)).mockResolvedValue({ rows: [] }), release: jest.fn() };
        db.pool.connect.mockResolvedValueOnce(client);
        const res = await request(app).post('/api/import/csv').attach('file', Buffer.from('date,venue,song\n2999-01-01,fixture,CORE PRIDE'), 'fixture.csv');
        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith('CSV Processing Error: details suppressed');
    });

    it('iTunes失敗に含まれる検索語・外部詳細を記録しない', async () => {
        db.query.mockResolvedValue({ rows: [] });
        const res = await request(app).get(`/api/music/song-image/${encodeURIComponent(marker)}`);
        expect(res.statusCode).toBe(500);
        expect(errorSpy).toHaveBeenCalledWith('[iTunes] API Error: details suppressed');
    });

    it('iTunes HTTP失敗の状態だけを残し検索語を出さない', async () => {
        db.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
        const res = await request(app).get(`/api/music/song-image/${encodeURIComponent(marker)}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.source).toBe('not_found');
        expect(errorSpy).toHaveBeenCalledWith('[iTunes] 検索エラー: 503');
    });
});
