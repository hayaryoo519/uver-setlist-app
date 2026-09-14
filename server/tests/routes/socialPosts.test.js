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
