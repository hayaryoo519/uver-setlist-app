jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn(), genSalt: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn(), sendEmailChangeConfirmation: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => {
    const pass = (req, res, next) => next();
    return { loginLimiter: pass, resetLimiter: pass, registerLimiter: pass, verificationLimiter: pass, resetConfirmationLimiter: pass, verificationResendLimiter: pass, profileUpdateLimiter: pass };
});
jest.mock('../../middleware/authorization', () => ({ authorize: (req, res, next) => { req.user = { user_id: 1, session_version: 0 }; next(); }, adminCheck: (req, res, next) => next() }));
const express = require('express');
const request = require('supertest');
const db = require('../../db'); const bcrypt = require('bcrypt');
const { hashToken } = require('../../utils/authTokens');
const { sendEmailChangeConfirmation } = require('../../utils/email');
const app = express(); app.use(express.json()); app.use('/users', require('../../routes/users')); app.use('/auth', require('../../routes/auth'));

describe('reauthenticated and confirmed email changes', () => {
    const account = { id: 1, email: 'old@example.invalid', username: 'fixture-user', role: 'user', password: 'password-hash' };
    beforeEach(() => {
        jest.resetAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {});
        bcrypt.compare.mockResolvedValue(true); bcrypt.genSalt.mockResolvedValue('salt'); bcrypt.hash.mockResolvedValue('new-hash');
        db.query.mockImplementation(async sql => {
            if (sql.startsWith('SELECT password')) return { rows: [account] };
            if (sql.startsWith('SELECT id FROM users WHERE email')) return { rows: [] };
            return { rows: [account], rowCount: 1 };
        });
    });
    afterEach(() => { jest.restoreAllMocks(); });
    it.each([undefined, '', {}, []])('rejects an email change without a typed current password (%j)', async currentPassword => {
        expect((await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword })).status).toBe(400);
        expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false); expect(sendEmailChangeConfirmation.mock.calls.length).toBe(0);
    });
    it('rejects an incorrect current password before destination lookup or update', async () => {
        bcrypt.compare.mockResolvedValue(false);
        expect((await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword: 'wrong' })).status).toBe(400);
        expect(db.query.mock.calls.length).toBe(1); expect(sendEmailChangeConfirmation.mock.calls.length).toBe(0);
    });
    it('preserves unchanged-email profile updates without password verification', async () => {
        expect((await request(app).put('/users/me').send({ email: account.email, username: 'updated-user' })).status).toBe(200);
        expect(bcrypt.compare.mock.calls.length).toBe(0);
        const sql = db.query.mock.calls[1][0]; expect(sql).not.toContain('email ='); expect(sql).not.toContain('pending_email');
    });
    it('keeps the current address and stores only a pending digest bound to the session version', async () => {
        const response = await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword: 'correct' });
        expect(response.status).toBe(200); expect(response.body.email).toBe(account.email); expect(response.body.emailChangeRequested).toBe(true);
        const [sql, values] = db.query.mock.calls[2]; const raw = sendEmailChangeConfirmation.mock.calls[0][1];
        expect(sql).not.toMatch(/SET email =/); expect(sql).toContain('pending_email = $1'); expect(sql).toContain('email_change_session_version = $4');
        expect(sql).toContain('session_version = $6'); expect(sql).toContain('email_change_token_expires <= $7');
        expect(values[0]).toBe('new@example.invalid'); expect(values[1]).toBe(hashToken(raw)); expect(values[3]).toBe(0);
        expect(JSON.stringify(values)).not.toContain(raw); expect(values[6]).toBe(values[2] - 60000);
    });
    it('does not reveal an unavailable destination or send mail to it', async () => {
        db.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT id FROM') ? [{ id: 2 }] : [account], rowCount: 1 }));
        const response = await request(app).put('/users/me').send({ email: 'taken@example.invalid', currentPassword: 'correct' });
        expect(response.status).toBe(200); expect(response.body.emailChangeRequested).toBe(true); expect(response.body.email).toBe(account.email);
        expect(db.query.mock.calls[2][1].slice(0, 2)).toEqual([null, null]); expect(sendEmailChangeConfirmation.mock.calls.length).toBe(0);
    });
    it('binds a combined password/email change to the new session version', async () => {
        expect((await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword: 'correct', password: 'new-password' })).status).toBe(200);
        const [sql, values] = db.query.mock.calls[2]; expect(sql).toContain('session_version = session_version + 1'); expect(values[4]).toBe(1);
    });
    it('does not send a confirmation if a concurrent change wins the guarded update', async () => {
        db.query.mockImplementation(async sql => ({ rows: sql.startsWith('UPDATE') ? [] : sql.startsWith('SELECT id FROM') ? [] : [account], rowCount: 0 }));
        expect((await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword: 'correct' })).status).toBe(409);
        expect(sendEmailChangeConfirmation.mock.calls.length).toBe(0);
    });
    it('does not expose a delivery failure after accepting the pending change', async () => {
        sendEmailChangeConfirmation.mockRejectedValue(new Error('private-change-marker'));
        expect((await request(app).put('/users/me').send({ email: 'new@example.invalid', currentPassword: 'correct' })).status).toBe(200);
        expect(console.error).toHaveBeenCalledWith('[users] Email change confirmation delivery failed'); expect(JSON.stringify(console.error.mock.calls)).not.toContain('private-');
    });
    it('confirms atomically, guards expiry/session/destination, and revokes previous credentials', async () => {
        const raw = 'fixture-change'; const response = await request(app).post('/auth/confirm-email-change').send({ token: raw });
        expect(response.status).toBe(200); expect(response.body.token).toBeUndefined();
        const [sql, values] = db.query.mock.calls[0]; expect(sql).toMatch(/^UPDATE users AS account/);
        expect(sql).toContain('email_change_session_version = session_version'); expect(sql).toContain('email_change_token_expires > $2');
        expect(sql).toContain('deleted_at IS NULL AND NOT EXISTS'); expect(sql).toContain('session_version = session_version + 1');
        expect(sql).toContain('reset_password_token_hash = NULL'); expect(values[0]).toBe(hashToken(raw));
    });
    it.each(['no-match', 'unique-race'])('rejects unavailable confirmations with the same response (%s)', async reason => {
        if (reason === 'no-match') db.query.mockResolvedValueOnce({ rows: [] });
        else db.query.mockRejectedValueOnce(Object.assign(new Error('private-constraint-marker'), { code: '23505' }));
        const response = await request(app).post('/auth/confirm-email-change').send({ token: 'fixture-change' });
        expect(response.status).toBe(400); expect(response.body).toEqual({ message: '無効または期限切れのリンクです' });
        expect(JSON.stringify(console.error.mock.calls)).not.toContain('private-');
    });
});
