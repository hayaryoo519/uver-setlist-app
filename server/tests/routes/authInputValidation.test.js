jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => {
    const pass = (req, res, next) => next();
    return { loginLimiter: pass, resetLimiter: pass, registerLimiter: pass, verificationLimiter: pass, resetConfirmationLimiter: pass, verificationResendLimiter: pass };
});
jest.mock('../../middleware/authorization', () => ({ authorize: (req, res, next) => {
    req.user = { user_id: 1, role: 'user', session_version: 0 }; next();
}, adminCheck: (req, res, next) => next() }));
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const bcrypt = require('bcrypt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');
const app = express(); app.use(express.json());
app.use('/auth', require('../../routes/auth')); app.use('/users', require('../../routes/users'));

describe('bounded and typed authentication input', () => {
    const valid = { username: 'fixture-user', email: 'fake@example.invalid', password: 'fixture-password' };
    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockResolvedValue({ rows: [], rowCount: 1 });
        bcrypt.genSalt.mockResolvedValue('salt'); bcrypt.hash.mockResolvedValue('hash');
    });
    it.each([
        { username: [] }, { username: {} }, { username: 'a' }, { username: 'a'.repeat(31) },
        { email: [] }, { email: {} }, { email: 'missing-at' }, { email: 'a@b\r\nInjected' }, { email: 'a'.repeat(256) + '@b' },
        { password: [] }, { password: {} }, { password: 'short' }, { password: 'a'.repeat(73) },
        { password: 'あ'.repeat(25) }, { is_public: 'false' }
    ])('rejects malformed registration fields %j before DB, bcrypt or SMTP', async invalid => {
        const res = await request(app).post('/auth/register').send({ ...valid, ...invalid });
        expect(res.status).toBe(400);
        expect(db.query.mock.calls.length).toBe(0);
        expect(bcrypt.hash.mock.calls.length).toBe(0);
        expect(sendVerificationEmail.mock.calls.length).toBe(0);
    });
    it.each(['a'.repeat(72), 'あ'.repeat(24)])('accepts a full 72-byte new password', async password => {
        const res = await request(app).post('/auth/register').send({ ...valid, password });
        expect(res.status).toBe(200);
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 'salt');
    });
    it.each([
        ['/auth/login', { email: {}, password: 'fixture-password' }],
        ['/auth/login', { email: valid.email, password: {} }],
        ['/auth/forgot-password', { email: [] }],
        ['/auth/verify-email', { token: [] }],
        ['/auth/verify-email', { token: 'x'.repeat(257) }],
        ['/auth/reset-password', { token: {}, password: 'fixture-password' }],
        ['/auth/reset-password', { token: 'fake-token', password: 'あ'.repeat(25) }],
        ['/users/me', { username: {} }], ['/users/me', { email: {} }],
        ['/users/me', { password: {}, currentPassword: 'fixture-password' }],
        ['/users/me', { password: 'fixture-password', currentPassword: {} }],
        ['/users/me', { is_public: 'true' }]
    ])('returns 400 for invalid fields at %s', async (path, body) => {
        const res = await request(app)[path === '/users/me' ? 'put' : 'post'](path).send(body);
        expect(res.status).toBe(400);
        expect(db.query.mock.calls.length).toBe(0);
        expect(bcrypt.compare.mock.calls.length).toBe(0);
        expect(sendPasswordResetEmail.mock.calls.length).toBe(0);
    });
    it('preserves legacy long-password login attempts', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'user', session_version: 0, is_verified: true, password: 'hash' }] });
        bcrypt.compare.mockResolvedValue(false);
        const password = 'a'.repeat(100);
        const res = await request(app).post('/auth/login').send({ email: valid.email, password });
        expect(res.status).toBe(401);
        expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hash');
    });
    it('preserves email case and internal-domain addresses', async () => {
        const email = 'Fixture.User@internal';
        const res = await request(app).post('/auth/forgot-password').send({ email });
        expect(res.status).toBe(200);
        expect(db.query.mock.calls[0][1]).toEqual([email]);
        expect(db.query.mock.calls[0][0]).toContain('deleted_at IS NULL');
    });
});
