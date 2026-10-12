jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (req, res, next) => next()
}));
const express = require('express');
const request = require('supertest');
const db = require('../../db');

describe('user, follow and management log privacy', () => {
    const marker = 'private-user-email@example.invalid';
    let app;
    let logs;
    beforeEach(() => {
        jest.clearAllMocks();
        logs = [];
        for (const method of ['log', 'warn', 'error']) {
            jest.spyOn(console, method).mockImplementation((...args) => logs.push(args));
        }
        db.query.mockRejectedValue(Object.assign(new Error(marker), { detail: marker, stack: marker }));
        app = express();
        app.use(express.json());
        for (const route of ['users', 'follows', 'logs']) app.use(`/${route}`, require(`../../routes/${route}`));
    });
    afterEach(() => jest.restoreAllMocks());
    function expectPrivateLogs() {
        expect(logs.length).toBeGreaterThan(0);
        expect(JSON.stringify(logs)).not.toContain(marker);
        expect(logs.every(args => typeof args[0] === 'string' && args.slice(1).every(value => typeof value === 'number'))).toBe(true);
    }
    it.each([
        ['get', '/users'], ['put', '/users/2/role', { role: 'user' }],
        ['delete', '/users/2'], ['patch', '/users/2/restore'],
        ['get', '/users/me/attended_lives'], ['post', '/users/me/attended_lives', { liveId: marker }],
        ['delete', '/users/me/attended_lives/2'], ['put', '/users/me', { email: marker }],
        ['get', '/users/2/profile'], ['get', '/users/2/attended_lives'], ['get', '/users/2/predictions'],
        ['post', '/follows/2'], ['delete', '/follows/2'], ['get', '/follows/my/followers'],
        ['get', '/follows/my/following'], ['get', '/follows/my/stats'], ['get', '/follows/stats/2'],
        ['get', '/logs/recent'], ['get', '/logs/collector'], ['get', '/logs/analysis'],
        ['get', '/logs/security'], ['delete', '/logs/cleanup']
    ].map(([method, path, body]) => [method, path, body]))('keeps the 500 response without logging private errors at %s %s', async (method, path, body) => {
        const res = await request(app)[method](path).send(body);
        expect(res.status).toBe(500);
        expect(res.text).not.toContain(marker);
        expectPrivateLogs();
    });
    it('adds attendance without logging supplied IDs or body', async () => {
        db.query.mockResolvedValue({ rows: [] });
        const res = await request(app).post('/users/me/attended_lives').send({ liveId: marker, email: marker });
        expect(res.status).toBe(200);
        expect(res.body).toBe('Added to attendance list');
        expect(db.query.mock.calls[1][1]).toEqual([1, marker]);
        expectPrivateLogs();
    });
    it('keeps duplicate attendance validation without leaking the row', async () => {
        db.query.mockResolvedValue({ rows: [{ live_id: marker }] });
        const res = await request(app).post('/users/me/attended_lives').send({ liveId: marker });
        expect(res.status).toBe(400);
        expect(res.body).toBe('Live already in attendance list');
        expect(db.query.mock.calls.length).toBe(1);
        expectPrivateLogs();
    });
    it('keeps required attendance input validation', async () => {
        const res = await request(app).post('/users/me/attended_lives').send({ email: marker });
        expect(res.status).toBe(400);
        expect(res.body).toBe('liveId is required');
        expect(db.query.mock.calls.length).toBe(0);
        expectPrivateLogs();
    });
    it('keeps private attendance access denied', async () => {
        db.query.mockResolvedValue({ rows: [{ is_public: false }] });
        const res = await request(app).get('/users/2/attended_lives');
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.length).toBe(1);
    });
    it.each([['/users', 'users'], ['/follows/my/followers', 'followers'], ['/logs/recent', 'logs']])('preserves authorized returned data at %s', async (path, type) => {
        const rows = [{ id: 2, username: marker, user_email: marker }];
        db.query.mockResolvedValue({ rows });
        const res = await request(app).get(path);
        expect(res.status).toBe(200);
        expect(type === 'logs' ? res.body.logs : res.body).toEqual(rows);
        expect(logs.length).toBe(0);
    });
});
