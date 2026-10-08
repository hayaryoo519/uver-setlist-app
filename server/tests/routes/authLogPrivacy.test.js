jest.mock('../../db');
jest.mock('../../utils/email', () => ({
    sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn()
}));
jest.mock('../../middleware/rateLimiter', () => ({
    loginLimiter: (req, res, next) => next(), resetLimiter: (req, res, next) => next()
}));
jest.mock('bcrypt', () => ({ genSalt: jest.fn(), hash: jest.fn(), compare: jest.fn() }));
const request = require('supertest');
const express = require('express');
const db = require('../../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');
const router = require('../../routes/auth');

describe('Authentication error log privacy', () => {
    const marker = 'private-auth-error@example.invalid';
    const failure = Object.assign(new Error(marker), { detail: marker, query: marker });
    const originalSecret = process.env.JWT_SECRET;
    let app, error;

    beforeEach(() => {
        jest.resetAllMocks();
        process.env.JWT_SECRET = 'isolated-auth-log-test-secret';
        error = jest.spyOn(console, 'error').mockImplementation(() => {});
        app = express();
        app.use(express.json());
        app.use('/api/auth', router);
        bcrypt.genSalt.mockResolvedValue('salt');
        bcrypt.hash.mockResolvedValue('hash');
        bcrypt.compare.mockResolvedValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    });

    it.each(['register', 'verify-email', 'login', 'forgot-password', 'reset-password'])('does not expose %s database errors in console or system audit details', async route => {
        db.query.mockRejectedValueOnce(failure).mockResolvedValue({ rows: [] });
        const res = await request(app).post(`/api/auth/${route}`).send({
            username: 'test-user', email: marker, password: marker, token: marker
        });
        expect(res.status).toBe(500);
        expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
        expect(error).toHaveBeenCalled();
        if (route === 'login') {
            const audit = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO security_logs'));
            expect(audit).toBeDefined();
            expect(JSON.parse(audit[1][2])).toEqual({ error: 'Authentication processing failed' });
        }
    });

    it.each(['register', 'forgot-password'])('does not log SMTP errors propagated through %s', async route => {
        db.query.mockResolvedValueOnce({ rows: route === 'register' ? [] : [{ id: 1 }] })
            .mockResolvedValue({ rows: [] });
        sendVerificationEmail.mockRejectedValue(failure);
        sendPasswordResetEmail.mockRejectedValue(failure);
        expect((await request(app).post(`/api/auth/${route}`).send({
            username: 'test-user', email: marker, password: marker
        })).status).toBe(500);
        expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
        expect(error).toHaveBeenCalled();
    });

    it('preserves successful login when the security audit insert fails without logging its error details', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'test-user', email: marker, role: 'user', password: 'hash', is_verified: true }] })
            .mockRejectedValueOnce(failure);
        const res = await request(app).post('/api/auth/login').send({ email: marker, password: marker });
        expect(res.status).toBe(200);
        expect(jwt.verify(res.body.token, process.env.JWT_SECRET)).toMatchObject({ user_id: 1, role: 'user' });
        expect(res.body.user.email).toBe(marker);
        expect(error).toHaveBeenCalledWith('Failed to log security event');
        expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
    });

    it('returns a controlled failure even when logging the login error also fails', async () => {
        db.query.mockRejectedValue(failure);
        expect((await request(app).post('/api/auth/login').send({ email: marker, password: marker })).status).toBe(500);
        expect(error).toHaveBeenCalledWith('Failed to log error');
        expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
    });
});
