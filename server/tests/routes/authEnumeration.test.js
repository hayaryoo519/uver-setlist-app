jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => {
    const pass = (req, res, next) => next();
    return { loginLimiter: pass, resetLimiter: pass, registerLimiter: pass, verificationLimiter: pass, resetConfirmationLimiter: pass, verificationResendLimiter: pass, profileUpdateLimiter: pass };
});
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');
const app = express(); app.use(express.json()); app.use('/auth', require('../../routes/auth'));

describe('authentication account enumeration protection', () => {
    const input = { username: 'fixture-user', email: 'fake@example.invalid', password: 'fixture-password' };
    const originalSecret = process.env.JWT_SECRET;
    beforeEach(() => {
        jest.resetAllMocks();
        process.env.JWT_SECRET = 'isolated-enumeration-key';
        jest.spyOn(console, 'error').mockImplementation(() => {});
        db.query.mockResolvedValue({ rows: [] });
        bcrypt.genSalt.mockResolvedValue('salt'); bcrypt.hash.mockResolvedValue('hash'); bcrypt.compare.mockResolvedValue(false);
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
    });
    it('uses the same registration status and body for new, verified, unverified and deleted addresses', async () => {
        let expected;
        for (const inserted of [true, false, false, false]) {
            db.query.mockResolvedValueOnce({ rows: inserted ? [{ id: 1 }] : [] });
            const response = await request(app).post('/auth/register').send(input);
            expect(response.status).toBe(200);
            if (expected) expect(response.body).toEqual(expected); else expected = response.body;
            expect(response.body.requireVerification).toBe(true);
        }
        expect(bcrypt.hash.mock.calls.length).toBe(4);
        expect(sendVerificationEmail.mock.calls.length).toBe(1);
        expect(db.query.mock.calls.every(([sql]) => sql.includes('ON CONFLICT (email) DO NOTHING RETURNING id'))).toBe(true);
    });
    it('does not wait for SMTP or expose a delivery failure through registration', async () => {
        let failDelivery;
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        sendVerificationEmail.mockImplementation(() => new Promise((resolve, reject) => { failDelivery = reject; }));
        try {
            const response = await request(app).post('/auth/register').send(input);
            expect(response.status).toBe(200);
            expect(response.body.token).toBeUndefined();
        } finally { failDelivery(new Error('private-delivery-marker')); }
        await new Promise(resolve => setImmediate(resolve));
        expect(console.error).toHaveBeenCalledWith('Register Error: verification email delivery failed');
        expect(JSON.stringify(console.error.mock.calls)).not.toContain('private-delivery-marker');
    });
    it.each([
        { rows: [] },
        { rows: [{ id: 1, password: 'hash', is_verified: true }] },
        { rows: [{ id: 1, password: 'hash', is_verified: false }] }
    ])('does not disclose account state for a wrong password', async ({ rows }) => {
        db.query.mockResolvedValueOnce({ rows });
        const response = await request(app).post('/auth/login').send(input);
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'メールアドレスまたはパスワードが間違っています' });
        expect(bcrypt.compare.mock.calls.length).toBe(1);
        expect(bcrypt.compare.mock.calls[0][0]).toBe(input.password);
        expect(bcrypt.compare.mock.calls[0][1]).toMatch(rows.length ? /^hash$/ : /^\$2b\$10\$/);
    });
    it('still gives verification guidance to someone with the correct password', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1, password: 'hash', is_verified: false }] });
        bcrypt.compare.mockResolvedValue(true);
        const response = await request(app).post('/auth/login').send(input);
        expect(response.status).toBe(401); expect(response.body.requireVerification).toBe(true);
        expect(response.body.token).toBeUndefined();
    });
    it('still issues a JWT to a verified user with a correct password', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1, password: 'hash', is_verified: true, role: 'user', session_version: 2 }] });
        bcrypt.compare.mockResolvedValue(true);
        const response = await request(app).post('/auth/login').send(input);
        expect(response.status).toBe(200);
        expect(jwt.verify(response.body.token, process.env.JWT_SECRET).session_version).toBe(2);
    });
    it('rejects an unknown user even if a password matches the dummy hash', async () => {
        bcrypt.compare.mockResolvedValue(true);
        expect((await request(app).post('/auth/login').send(input)).status).toBe(401);
    });
    it('accepts a reset request without waiting for account lookup', async () => {
        let completeLookup;
        db.query.mockImplementationOnce(() => new Promise(resolve => { completeLookup = resolve; }));
        try {
            const response = await request(app).post('/auth/forgot-password').send({ email: input.email });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('アカウントがある場合');
            expect(sendPasswordResetEmail.mock.calls.length).toBe(0);
        } finally { completeLookup({ rows: [] }); }
    });
    it('keeps reset responses identical for missing accounts, SMTP failures and DB failures', async () => {
        const missing = await request(app).post('/auth/forgot-password').send({ email: input.email });
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        sendPasswordResetEmail.mockRejectedValue(new Error('private-reset-marker'));
        const deliveryFailure = await request(app).post('/auth/forgot-password').send({ email: input.email });
        db.query.mockRejectedValueOnce(new Error('private-db-marker'));
        const dbFailure = await request(app).post('/auth/forgot-password').send({ email: input.email });
        for (const response of [missing, deliveryFailure, dbFailure]) {
            expect(response.status).toBe(200); expect(response.body).toEqual(missing.body);
        }
        expect(JSON.stringify(console.error.mock.calls)).not.toContain('private-');
        expect(console.error.mock.calls.length).toBe(2);
    });
});
