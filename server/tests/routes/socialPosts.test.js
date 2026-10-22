const request = require('supertest');
const express = require('express');

jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (_req, _res, next) => next(),
}));

const db = require('../../db');
const socialPostsRouter = require('../../routes/socialPosts');

const app = express();
app.use(express.json());
app.use('/api/social-posts', socialPostsRouter);

describe('投稿候補のエラー保護', () => {
    const marker = 'private-social@example.invalid Bearer fixture-token';
    let spy;
    beforeEach(() => {
        jest.clearAllMocks();
        spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        try { expect(JSON.stringify(spy.mock.calls)).not.toContain(marker); }
        finally { spy.mockRestore(); }
    });

    it.each([
        ['get', '/', {}, 'list'],
        ['patch', '/5', { body: marker }, 'update'],
        ['post', '/generate', { postType: 'on_this_day' }, 'generate'],
        ['post', '/generate', { postType: 'song_history' }, 'generate'],
    ])('%s %s のDB詳細をログと応答に出さない', async (method, suffix, body, diagnostic) => {
        db.query.mockRejectedValueOnce(new Error(marker));
        const res = await request(app)[method](`/api/social-posts${suffix}`).send(body);
        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(spy).toHaveBeenCalledWith(`[social-posts] ${diagnostic} error: details suppressed`);
    });

    it.each([400, 422, 503, 'private-status'])('外部例外のstatusCode=%sを利用者向けエラーと扱わない', async statusCode => {
        db.query.mockRejectedValueOnce(Object.assign(new Error(marker), { statusCode }));
        const res = await request(app).post('/api/social-posts/generate').send({ postType: 'song_history' });
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ message: '投稿候補の生成に失敗しました' });
    });

    it('投稿済み更新が失敗したらロールバックし詳細を出さない', async () => {
        const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
        client.query.mockRejectedValueOnce(new Error(marker));
        db.pool.connect.mockResolvedValueOnce(client);
        const res = await request(app).post('/api/social-posts/5/publish').send({ postUrl: 'https://x.com/i/status/123' });
        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('[social-posts] publish error: details suppressed');
    });

    it.each([
        ['frequent_ranking', 'ランキング対象のデータがありません'],
        ['rare_song', 'レア曲の対象データがありません'],
        ['seasonal', '季節ネタの対象データがありません'],
        ['song_history', '楽曲履歴の対象データがありません'],
        ['longest_absence', '最長未披露ランキングの対象データがありません'],
        ['debut_anniversary', '今日は初披露記念日の対象曲がありません'],
        ['tour_stats', '指定ツアーのセトリがありません'],
    ])('%s の対象データなし422と案内を維持する', async (postType, message) => {
        db.query.mockResolvedValue({ rows: [] });
        const res = await request(app).post('/api/social-posts/generate').send({ postType, tourName: 'fixture-tour' });
        expect(res.statusCode).toBe(422);
        expect(res.body).toEqual({ message });
    });

    it('ツアー指定不足の400と案内を維持する', async () => {
        const res = await request(app).post('/api/social-posts/generate').send({ postType: 'tour_stats' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ message: 'ツアー名を指定してください' });
        expect(db.query).not.toHaveBeenCalled();
    });
});

describe('POST /api/social-posts/generate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('初披露・最終披露の下書きを生成する', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 10, title: 'ODD FUTURE', first_date: '2018-05-02', last_date: '2026-07-06', total_count: 42, days_since_last: 70 }] })
            .mockResolvedValueOnce({ rows: [{ id: 1, post_type: 'song_history' }] });

        const res = await request(app).post('/api/social-posts/generate').send({ postType: 'song_history' });

        expect(res.statusCode).toBe(201);
        expect(db.query.mock.calls[0][0]).toContain('l.date <= CURRENT_DATE');
        expect(db.query.mock.calls[1][1][2]).toContain('初披露：2018-05-02');
        expect(db.query.mock.calls[1][1][2]).toContain('/song/10');
    });

    it('最長未披露ランキングの下書きを生成する', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 11, title: 'CHANCE!', last_date: '2010-11-27', days_since: 5769 }] })
            .mockResolvedValueOnce({ rows: [{ id: 2, post_type: 'longest_absence' }] });

        const res = await request(app).post('/api/social-posts/generate').send({ postType: 'longest_absence' });

        expect(res.statusCode).toBe(201);
        expect(db.query.mock.calls[1][1][2]).toContain('最終披露：2010-11-27');
    });

    it('初披露記念日の下書きを生成する', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 12, title: 'CORE PRIDE', first_date: '2011-09-14', total_count: 100, years_ago: 15 }] })
            .mockResolvedValueOnce({ rows: [{ id: 3, post_type: 'debut_anniversary' }] });

        const res = await request(app).post('/api/social-posts/generate').send({ postType: 'debut_anniversary' });

        expect(res.statusCode).toBe(201);
        expect(db.query.mock.calls[1][1][2]).toContain('初披露されてから15周年');
    });
});

describe('POST /api/social-posts/:id/publish', () => {
    const client = { query: jest.fn(), release: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        db.pool.connect.mockResolvedValue(client);
    });

    it('Xの投稿URLを正規化して投稿済みにする', async () => {
        client.query.mockImplementation((sql) => {
            if (sql.includes('UPDATE social_posts')) return Promise.resolve({ rows: [{ id: 5, status: 'published', external_post_id: '123', external_post_url: 'https://x.com/i/status/123' }] });
            return Promise.resolve({ rows: [] });
        });

        const res = await request(app).post('/api/social-posts/5/publish').send({ postUrl: 'https://twitter.com/uver/status/123?s=20' });

        expect(res.statusCode).toBe(200);
        expect(res.body.external_post_url).toBe('https://x.com/i/status/123');
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining("status = 'published'"), ['123', 'https://x.com/i/status/123', '5']);
        expect(client.release).toHaveBeenCalled();
    });

    it('X以外のURLを拒否する', async () => {
        const res = await request(app).post('/api/social-posts/5/publish').send({ postUrl: 'https://example.com/status/123' });

        expect(res.statusCode).toBe(400);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('承認済みでない投稿は更新しない', async () => {
        client.query.mockResolvedValue({ rows: [] });

        const res = await request(app).post('/api/social-posts/5/publish').send({ postUrl: 'https://x.com/uver/status/123' });

        expect(res.statusCode).toBe(409);
        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
});
