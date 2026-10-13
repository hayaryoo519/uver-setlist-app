jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const app = express(); app.use(express.json()); app.use('/auth', require('../../routes/auth'));

describe('actual auth limiters and independent reset quotas', () => {
    it.each([
        ['/register', 5], ['/verify-email', 5], ['/login', 5], ['/forgot-password', 3], ['/reset-password', 3], ['/resend-verification', 3]
    ])('limits invalid requests to %s independently', async (path, limit) => {
        for (let index = 0; index < limit; index++) {
            expect((await request(app).post('/auth' + path).send({})).status).toBe(400);
        }
        const limited = await request(app).post('/auth' + path).send({});
        expect(limited.status).toBe(429);
        expect(limited.headers['retry-after']).toBeTruthy();
        expect(limited.headers['x-ratelimit-limit']).toBeUndefined();
        expect(db.query.mock.calls.length).toBe(0);
    });
});

it('limits profile credential guesses per authorized account independently', async () => {
    const profile = express();
    profile.post('/profile', (req, res, next) => { req.user = { user_id: req.get('fixture-user') }; next(); },
        require('../../middleware/rateLimiter').profileUpdateLimiter, (req, res) => res.send('ok'));
    for (let index = 0; index < 10; index++) expect((await request(profile).post('/profile').set('fixture-user', '1')).status).toBe(200);
    expect((await request(profile).post('/profile').set('fixture-user', '1')).status).toBe(429);
    expect((await request(profile).post('/profile').set('fixture-user', '2')).status).toBe(200);
});
