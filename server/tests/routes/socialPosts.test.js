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
