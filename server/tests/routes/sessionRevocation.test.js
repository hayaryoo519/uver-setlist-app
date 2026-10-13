jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => ({ loginLimiter: (req, res, next) => next(), resetLimiter: (req, res, next) => next(), registerLimiter: (req, res, next) => next(), verificationLimiter: (req, res, next) => next(), resetConfirmationLimiter: (req, res, next) => next(), verificationResendLimiter: (req, res, next) => next() }));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../db');
const { authorize } = require('../../middleware/authorization');
const app = express();
app.use(express.json());
app.get('/protected', authorize, (req, res) => res.send('ok'));
app.use('/auth', require('../../routes/auth'));
app.use('/users', require('../../routes/users'));

describe('credential changes revoke old JWTs', () => {
    const originalSecret = process.env.JWT_SECRET;
    const key = 'isolated-session-version-key';
    let user, updateAllowed;
    const token = version => jwt.sign({ user_id: 1, role: 'user', ...(version === undefined ? {} : { session_version: version }) }, key);
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = key;
        for (const method of ['log', 'warn', 'error']) jest.spyOn(console, method).mockImplementation(() => {});
        user = { id: 1, role: 'user', session_version: 0, password: 'old-hash', is_verified: true, deleted_at: null };
        updateAllowed = true;
        bcrypt.compare.mockResolvedValue(true);
        bcrypt.hash.mockResolvedValue('new-hash');
        bcrypt.genSalt.mockResolvedValue('salt');
        db.query.mockImplementation(async sql => {
            if (sql.startsWith('SELECT')) return { rows: user.deleted_at ? [] : [{ ...user }] };
            if (sql.includes('INSERT INTO security_logs')) return { rows: [] };
            if (sql.includes('session_version = session_version + 1')) {
                if (!updateAllowed) return { rowCount: 0, rows: [] };
                user.session_version++;
            }
            return { rowCount: 1, rows: [{ ...user }] };
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    });
    it('accepts legacy and version-zero JWTs only before revocation', async () => {
        for (const signed of [token(), token(0)]) expect((await request(app).get('/protected').set('token', signed)).status).toBe(200);
        user.session_version = 1;
        for (const signed of [token(), token(0)]) expect((await request(app).get('/protected').set('token', signed)).status).toBe(403);
        expect((await request(app).get('/protected').set('token', token(1))).status).toBe(200);
    });
    it.each([null, '0', -1, 0.5])('rejects invalid session version %j without a DB lookup', async version => {
        expect((await request(app).get('/protected').set('token', token(version))).status).toBe(403);
        expect(db.query.mock.calls.length).toBe(0);
    });
    it.each(['login', 'verify-email'])('issues the current session version through %s', async route => {
        user.session_version = 3;
        const res = await request(app).post(`/auth/${route}`).send({ email: 'fake@example.invalid', password: 'fake-password', token: 'fake-verification' });
        expect(res.status).toBe(200);
        expect(jwt.verify(res.body.token, key).session_version).toBe(3);
    });
    it('revokes both old JWT formats after password reset', async () => {
        const res = await request(app).post('/auth/reset-password').send({ token: 'fake-reset', password: 'new-password' });
        expect(res.status).toBe(200);
        for (const signed of [token(), token(0)]) expect((await request(app).get('/protected').set('token', signed)).status).toBe(403);
        const update = db.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE users SET password'));
        expect(update[0]).toContain('reset_password_token_hash = $3 OR (reset_password_token_hash IS NULL AND reset_password_token = $4)');
        expect(update[0]).toContain('reset_password_expires > $5 AND deleted_at IS NULL');
        expect(update[1].slice(0, 2)).toEqual(['new-hash', 1]);
        expect(update[1][3]).toBe('fake-reset');
    });
    it('rejects an already consumed or expired reset during the update', async () => {
        updateAllowed = false;
        const res = await request(app).post('/auth/reset-password').send({ token: 'fake-reset', password: 'new-password' });
        expect(res.status).toBe(400);
        expect(user.session_version).toBe(0);
    });
    it('does not reset a deleted account', async () => {
        user.deleted_at = '2026-10-13';
        const res = await request(app).post('/auth/reset-password').send({ token: 'fake-reset', password: 'new-password' });
        expect(res.status).toBe(400);
        expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
    });
    it('revokes old sessions and pending resets with a valid current-password change', async () => {
        const res = await request(app).put('/users/me').set('token', token(0)).send({ currentPassword: 'old-password', password: 'new-password' });
        expect(res.status).toBe(200);
        expect((await request(app).get('/protected').set('token', token(0))).status).toBe(403);
        const update = db.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE users SET'));
        expect(update[0]).toContain('reset_password_token = NULL');
        expect(update[0]).toContain('reset_password_token_hash = NULL');
        expect(update[0]).toContain('AND session_version = $3 AND deleted_at IS NULL');
        expect(update[1]).toEqual(['new-hash', 1, 0]);
    });
    it('rejects a current-password change that loses a concurrent revocation', async () => {
        updateAllowed = false;
        const res = await request(app).put('/users/me').set('token', token(0)).send({ currentPassword: 'old-password', password: 'new-password' });
        expect(res.status).toBe(403);
        expect(user.session_version).toBe(0);
    });
    it('leaves sessions valid after an ordinary profile edit', async () => {
        const res = await request(app).put('/users/me').set('token', token(0)).send({ username: 'fixture-user' });
        expect(res.status).toBe(200);
        expect(user.session_version).toBe(0);
        expect((await request(app).get('/protected').set('token', token(0))).status).toBe(200);
    });
    it('does not revoke or change credentials when the current password is wrong', async () => {
        bcrypt.compare.mockResolvedValue(false);
        const res = await request(app).put('/users/me').set('token', token(0)).send({ currentPassword: 'wrong', password: 'new-password' });
        expect(res.status).toBe(400);
        expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
    });
});
