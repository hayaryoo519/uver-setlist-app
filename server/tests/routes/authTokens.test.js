jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => {
    const pass = (req, res, next) => next();
    return { loginLimiter: pass, resetLimiter: pass, registerLimiter: pass, verificationLimiter: pass, resetConfirmationLimiter: pass, verificationResendLimiter: pass };
});
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const bcrypt = require('bcrypt');
const { hashToken, createToken } = require('../../utils/authTokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');
const app = express(); app.use(express.json()); app.use('/auth', require('../../routes/auth'));

describe('bounded, hashed, single-use email tokens', () => {
    const originalSecret = process.env.JWT_SECRET;
    beforeEach(() => {
        jest.resetAllMocks(); process.env.JWT_SECRET = 'isolated-token-key';
        db.query.mockResolvedValue({ rows: [{ id: 1, role: 'user', session_version: 0 }], rowCount: 1 });
        bcrypt.genSalt.mockResolvedValue('salt'); bcrypt.hash.mockResolvedValue('password-hash');
    });
    afterEach(() => { if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret; });
    it('generates distinct random tokens with SHA-256 digests and a bounded lifetime', () => {
        const start = Date.now(); const first = createToken(1000); const second = createToken(1000);
        expect(first.token).toMatch(/^[0-9a-f]{64}$/); expect(first.hash).toBe(hashToken(first.token));
        expect(first.hash).not.toBe(first.token); expect(first.token).not.toBe(second.token);
        expect(first.expires).toBeGreaterThanOrEqual(start + 1000); expect(first.expires).toBeLessThanOrEqual(Date.now() + 1000);
    });
    it('stores only a hash of the registration token with a 24-hour expiry', async () => {
        const start = Date.now();
        expect((await request(app).post('/auth/register').send({ username: 'fixture-user', email: 'fake@example.invalid', password: 'fixture-password' })).status).toBe(200);
        const raw = sendVerificationEmail.mock.calls[0][1]; const [sql, values] = db.query.mock.calls[0];
        expect(sql).toContain('verification_token_hash, verification_token_expires');
        expect(values[4]).toBe(hashToken(raw)); expect(JSON.stringify(values)).not.toContain(raw);
        expect(values[5]).toBeGreaterThanOrEqual(start + 86400000); expect(values[5]).toBeLessThanOrEqual(Date.now() + 86400000);
    });
    it('stores only a reset hash and clears the legacy token with a 1-hour expiry', async () => {
        const start = Date.now();
        expect((await request(app).post('/auth/forgot-password').send({ email: 'fake@example.invalid' })).status).toBe(200);
        const raw = sendPasswordResetEmail.mock.calls[0][1]; const [sql, values] = db.query.mock.calls[1];
        expect(sql).toContain('reset_password_token = NULL, reset_password_token_hash = $1');
        expect(sql).toContain('AND deleted_at IS NULL RETURNING id'); expect(values[0]).toBe(hashToken(raw));
        expect(JSON.stringify(values)).not.toContain(raw);
        expect(values[1]).toBeGreaterThanOrEqual(start + 3600000); expect(values[1]).toBeLessThanOrEqual(Date.now() + 3600000);
    });
    it('sends no reset email when deletion wins the guarded token update', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [], rowCount: 0 });
        expect((await request(app).post('/auth/forgot-password').send({ email: 'fake@example.invalid' })).status).toBe(200);
        expect(sendPasswordResetEmail.mock.calls.length).toBe(0);
    });
    it('atomically verifies an active unverified account and consumes both token formats', async () => {
        const token = 'fixture-verification'; const start = Date.now();
        const response = await request(app).post('/auth/verify-email').send({ token });
        expect(response.status).toBe(200); expect(jwt.verify(response.body.token, process.env.JWT_SECRET).session_version).toBe(0);
        expect(db.query.mock.calls.length).toBe(1);
        const [sql, values] = db.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE users/); expect(sql).toContain('verification_token_hash = NULL, verification_token_expires = NULL');
        expect(sql).toContain('verification_token_hash IS NULL AND verification_token = $2');
        expect(sql).toContain('verification_token_expires > $3 AND is_verified = FALSE AND deleted_at IS NULL');
        expect(values.slice(0, 2)).toEqual([hashToken(token), token]); expect(values[2]).toBeGreaterThanOrEqual(start);
    });
    it('rejects verification when no active unexpired token is consumed', async () => {
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const response = await request(app).post('/auth/verify-email').send({ token: 'fixture-token' });
        expect(response.status).toBe(400); expect(response.body.token).toBeUndefined();
    });
    it('checks the hash or bounded legacy reset token in both lookup and atomic consumption', async () => {
        const raw = 'fixture-reset';
        expect((await request(app).post('/auth/reset-password').send({ token: raw, password: 'new-password' })).status).toBe(200);
        const [lookup, lookupValues] = db.query.mock.calls[0]; const [update, updateValues] = db.query.mock.calls[1];
        expect(lookup).toContain('reset_password_token_hash IS NULL AND reset_password_token = $2');
        expect(lookup).toContain('reset_password_expires > $3 AND deleted_at IS NULL');
        expect(lookupValues.slice(0, 2)).toEqual([hashToken(raw), raw]);
        expect(update).toContain('reset_password_token_hash IS NULL AND reset_password_token = $4');
        expect(update).toContain('reset_password_token_hash = NULL');
        expect(update).toContain('session_version = session_version + 1');
        expect(updateValues.slice(2, 4)).toEqual([hashToken(raw), raw]);
    });
});
