const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const requestLogging = require('../../middleware/requestLogging');
const { authorize, adminCheck } = require('../../middleware/authorization');

describe('Request and authorization log privacy', () => {
    let app;
    let log, warn, error;
    const originalSecret = process.env.JWT_SECRET;
    const marker = 'private-marker@example.invalid';

    beforeEach(() => {
        process.env.JWT_SECRET = 'isolated-log-test-secret';
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        error = jest.spyOn(console, 'error').mockImplementation(() => {});
        app = express();
        app.use(express.json());
        app.use(requestLogging);
        app.get('/callback', (req, res) => res.send('callback'));
        app.get('/users/:id', (req, res) => res.send('profile'));
        app.post('/protected', authorize, (req, res) => res.send('accepted'));
        app.get('/admin', authorize, adminCheck, (req, res) => res.send('admin'));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    });

    function output() {
        return JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls]);
    }

    it('records status and route template without OAuth queries or actual path values', async () => {
        expect((await request(app).get('/callback').query({ code: marker, state: marker })).status).toBe(200);
        expect((await request(app).get(`/users/${encodeURIComponent(marker)}`)).status).toBe(200);
        expect((await request(app).get(`/missing/${marker}`).query({ token: marker })).status).toBe(404);
        expect(log.mock.calls.map(call => call[1])).toEqual([
            { method: 'GET', route: '/callback', status: 200 },
            { method: 'GET', route: '/users/:id', status: 200 },
            { method: 'GET', route: '<unmatched>', status: 404 }
        ]);
        expect(output()).not.toContain(marker);
        expect(output()).not.toContain(encodeURIComponent(marker));
    });

    it('rejects missing/invalid JWT without recording cookies, headers or bodies', async () => {
        for (const token of [null, marker]) {
            const req = request(app).post('/protected')
                .set('Cookie', `session=${marker}`).set('Authorization', `Bearer ${marker}`)
                .set('X-Private-Value', marker).send({ email: marker, password: marker });
            if (token) req.set('token', token);
            expect((await req).status).toBe(403);
        }
        expect(warn).toHaveBeenCalledWith('[AUTH] No token provided');
        expect(error).toHaveBeenCalledWith('[AUTH ERROR] Token verification failed');
        expect(output()).not.toContain(marker);
    });

    it('preserves valid user/admin authorization without logging JWT claims', async () => {
        const userToken = jwt.sign({ user_id: marker, role: marker }, process.env.JWT_SECRET);
        const adminToken = jwt.sign({ user_id: marker, role: 'admin' }, process.env.JWT_SECRET);
        expect((await request(app).post('/protected').set('token', userToken)).status).toBe(200);
        expect((await request(app).get('/admin').set('token', userToken)).status).toBe(403);
        expect((await request(app).get('/admin').set('token', adminToken)).status).toBe(200);
        expect(warn).toHaveBeenCalledWith('[ADMIN CHECK] Access denied');
        expect(output()).not.toContain(marker);
        expect(output()).not.toContain(userToken);
        expect(output()).not.toContain(adminToken);
    });
});
