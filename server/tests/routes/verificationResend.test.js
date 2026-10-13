jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../utils/email', () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('../../middleware/rateLimiter', () => {
    const pass = (req, res, next) => next();
    return { loginLimiter: pass, resetLimiter: pass, registerLimiter: pass, verificationLimiter: pass, resetConfirmationLimiter: pass, verificationResendLimiter: pass };
});
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const { hashToken } = require('../../utils/authTokens');
const { sendVerificationEmail } = require('../../utils/email');
const app = express(); app.use(express.json()); app.use('/auth', require('../../routes/auth'));

describe('verification resend without account enumeration', () => {
    const email = 'fake@example.invalid';
    beforeEach(() => { jest.resetAllMocks(); db.query.mockResolvedValue({ rows: [] }); jest.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => { jest.restoreAllMocks(); });
    it.each([{}, { email: [] }, { email: 'invalid' }])('rejects invalid input before DB or mail', async body => {
        expect((await request(app).post('/auth/resend-verification').send(body)).status).toBe(400);
        expect(db.query.mock.calls.length).toBe(0); expect(sendVerificationEmail.mock.calls.length).toBe(0);
    });
    it('uses the same response regardless of eligibility or processing failure', async () => {
        const missing = await request(app).post('/auth/resend-verification').send({ email });
        db.query.mockResolvedValueOnce({ rows: [{ email }] });
        sendVerificationEmail.mockRejectedValueOnce(new Error('private-email-marker'));
        const smtpFailure = await request(app).post('/auth/resend-verification').send({ email });
        db.query.mockRejectedValueOnce(new Error('private-db-marker'));
        const dbFailure = await request(app).post('/auth/resend-verification').send({ email });
        for (const response of [missing, smtpFailure, dbFailure]) { expect(response.status).toBe(200); expect(response.body).toEqual(missing.body); }
        expect(console.error.mock.calls.length).toBe(2); expect(JSON.stringify(console.error.mock.calls)).not.toContain('private-');
    });
    it('only updates eligible token fields and stores a 24-hour digest with an atomic cooldown guard', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ email }] }); const start = Date.now();
        expect((await request(app).post('/auth/resend-verification').send({ email })).status).toBe(200);
        const [sql, values] = db.query.mock.calls[0]; const raw = sendVerificationEmail.mock.calls[0][1];
        expect(sql).toContain('is_verified = FALSE AND deleted_at IS NULL');
        expect(sql).toContain('verification_token_expires IS NULL OR verification_token_expires <= $4');
        expect(sql).not.toMatch(/SET.*password/); expect(sql).not.toContain('session_version =');
        expect(values[0]).toBe(hashToken(raw)); expect(values[1]).toBeGreaterThanOrEqual(start + 86400000);
        expect(values[2]).toBe(email); expect(values[3]).toBe(values[1] - 60000); expect(JSON.stringify(values)).not.toContain(raw);
    });
    it('responds without waiting for token update or SMTP delivery', async () => {
        let completeUpdate;
        db.query.mockImplementationOnce(() => new Promise(resolve => { completeUpdate = resolve; }));
        try { expect((await request(app).post('/auth/resend-verification').send({ email })).status).toBe(200); }
        finally { completeUpdate({ rows: [] }); }
    });
});
