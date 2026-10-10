jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (req, res, next) => next()
}));
jest.mock('../../utils/pushNotification', () => ({ notifyNewLive: jest.fn() }));
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const errorHandler = require('../../middleware/errorHandler');

describe('API error response privacy', () => {
    const marker = 'private-database-token@example.invalid';
    let app;
    const originalMode = process.env.NODE_ENV;
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        db.query.mockRejectedValue(Object.assign(new Error(marker), { detail: marker, stack: marker }));
        app = express();
        app.use(express.json());
        for (const route of ['songs', 'lives', 'predictions', 'drafts', 'stats', 'spotify', 'youtube', 'socialPosts']) {
            app.use(`/${route}`, require(`../../routes/${route}`));
        }
        app.get('/unexpected', () => { throw new Error(marker); });
        app.use(errorHandler);
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalMode === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalMode;
    });

    it.each(['songs', 'songs/1/performance-timeline', 'lives', 'predictions/lives', 'predictions', 'drafts', 'stats', 'spotify/status', 'youtube/status', 'spotify/history/1', 'youtube/history/1'])('does not expose database errors at %s', async path => {
        const res = await request(app).get(`/${path}`);
        expect(res.status).toBe(500);
        expect(res.body.message).toBeTruthy();
        expect(res.text).not.toContain(marker);
        if ('stack' in res.body) expect(res.body.stack).toBeNull();
    });
    it.each(['production', 'development'])('hides unexpected error details and stack in %s', async mode => {
        process.env.NODE_ENV = mode;
        const res = await request(app).get('/unexpected');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: 'Internal Server Error', error: 'Internal Server Error', stack: null });
    });
    it('keeps the explicit Spotify relink instruction while hiding unknown errors', async () => {
        const message = 'Spotify session expired. Please re-link your account.';
        db.query.mockRejectedValueOnce(new Error(message));
        const res = await request(app).get('/spotify/status');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe(message);
    });
    it('preserves the live timestamp validation response', async () => {
        const res = await request(app).post('/lives').send({ timezone: 'invalid-zone' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('timezone must be a valid IANA time zone');
        expect(db.query).not.toHaveBeenCalled();
    });
    it('hides errors with an unexpected server statusCode', async () => {
        db.query.mockRejectedValueOnce(Object.assign(new Error(marker), { statusCode: 503 }));
        const res = await request(app).post('/lives').send({});
        expect(res.status).toBe(503);
        expect(res.body.message).toBe('Server Error');
    });
    it('preserves the explicit empty-ranking 422 response', async () => {
        db.query.mockResolvedValue({ rows: [] });
        const res = await request(app).post('/socialPosts/generate').send({ postType: 'frequent_ranking' });
        expect(res.status).toBe(422);
        expect(res.body.message).toBe('ランキング対象のデータがありません');
    });
});
