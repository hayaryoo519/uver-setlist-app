const mockSendMail = jest.fn();
const mockVerify = jest.fn();
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: mockSendMail, verify: mockVerify }))
}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

const { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation, verifyEmailConnection } = require('../../utils/email');

describe('Email log privacy', () => {
    const marker = 'private-email-token-marker';
    const recipient = `${marker}@example.invalid`;
    const originalEnv = { EMAIL_USER: process.env.EMAIL_USER, EMAIL_PASS: process.env.EMAIL_PASS, APP_URL: process.env.APP_URL, NODE_ENV: process.env.NODE_ENV };
    let log, error;

    beforeEach(() => {
        mockSendMail.mockReset();
        mockVerify.mockReset();
        process.env.NODE_ENV = 'test';
        process.env.EMAIL_PASS = 'synthetic-smtp-password';
        process.env.APP_URL = 'https://mail-test.example.invalid';
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
        error = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    function expectPrivateLogs() {
        const output = JSON.stringify([log.mock.calls, error.mock.calls]);
        expect(output).not.toContain(marker);
        expect(output).not.toContain(process.env.APP_URL);
        expect(output).not.toContain('token=');
    }

    it.each([
        ['development', undefined], ['development', 'your_email@example.invalid']
    ])('skips unconfigured delivery without logging links in %s (%s)', async (mode, user) => {
        process.env.NODE_ENV = mode;
        if (user === undefined) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = user;
        await sendVerificationEmail(recipient, marker);
        await sendPasswordResetEmail(recipient, marker);
        expect(mockSendMail).not.toHaveBeenCalled();
        expect(log.mock.calls).toHaveLength(2);
        expectPrivateLogs();
    });

    it.each([
        { EMAIL_USER: undefined }, { EMAIL_USER: 'your_email@example.invalid' },
        { EMAIL_USER: 'Your_Email@example.invalid' }, { EMAIL_PASS: undefined },
        { EMAIL_PASS: 'your_app_password' }, { EMAIL_PASS: ' ' },
        { APP_URL: undefined }, { APP_URL: 'http://mail-test.example.invalid' },
        { APP_URL: 'https://localhost' }, { APP_URL: 'https://user:password@mail-test.example.invalid' },
        { APP_URL: 'https://mail-test.example.invalid/?token=private-marker' },
        { APP_URL: 'https://mail-test.example.invalid/#private-marker' },
        { APP_URL: 'https://mail-test.example.invalid/path' }, { APP_URL: 'invalid-private-marker' }
    ])('fails closed in production for invalid mail settings %j without exposing their values', async invalid => {
        process.env.NODE_ENV = 'production'; process.env.EMAIL_USER = 'sender@example.invalid';
        for (const [key, value] of Object.entries(invalid)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
        for (const send of [sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation]) {
            await expect(send(recipient, marker)).rejects.toThrow('Email configuration is invalid');
        }
        expect(mockSendMail.mock.calls.length).toBe(0); expect(log.mock.calls.length).toBe(0);
        expect(error.mock.calls).toEqual([['Email delivery configuration invalid'], ['Email delivery configuration invalid'], ['Email delivery configuration invalid']]);
        expect(JSON.stringify(error.mock.calls)).not.toContain('private-marker');
    });

    it('verifies SMTP authentication without claiming mailbox delivery or sending a message', async () => {
        process.env.NODE_ENV = 'production'; process.env.EMAIL_USER = 'sender@example.invalid';
        mockVerify.mockResolvedValue(true);
        await verifyEmailConnection();
        expect(mockVerify.mock.calls.length).toBe(1); expect(mockSendMail.mock.calls.length).toBe(0);
        expectPrivateLogs();
    });

    it.each([undefined, '', 'staging', 'unexpected'])('does not skip delivery when NODE_ENV is absent or unknown (%s)', async mode => {
        if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
        delete process.env.EMAIL_USER;
        await expect(sendVerificationEmail(recipient, marker)).rejects.toThrow('Email configuration is invalid');
        expect(mockSendMail.mock.calls.length).toBe(0); expect(log.mock.calls.length).toBe(0);
        expect(error.mock.calls).toEqual([['Email delivery configuration invalid']]);
    });

    it.each([
        ['verification', sendVerificationEmail, '/verify-email'],
        ['reset', sendPasswordResetEmail, '/reset-password'],
        ['email-change', sendEmailChangeConfirmation, '/confirm-email-change']
    ])('preserves the %s email destination and link without logging them', async (kind, send, route) => {
        process.env.EMAIL_USER = 'sender@example.invalid';
        mockSendMail.mockResolvedValue({ accepted: [recipient] });
        await send(recipient, marker);
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'sender@example.invalid', to: recipient,
            html: expect.stringContaining(`${process.env.APP_URL}${route}?token=${marker}`)
        }));
        expectPrivateLogs();
    });

    it.each([
        ['verification', sendVerificationEmail], ['reset', sendPasswordResetEmail], ['email-change', sendEmailChangeConfirmation]
    ])('propagates %s SMTP errors without logging their message or properties', async (kind, send) => {
        process.env.EMAIL_USER = 'sender@example.invalid';
        const failure = Object.assign(new Error(marker), { response: marker, envelope: { to: [recipient] }, command: marker });
        mockSendMail.mockRejectedValue(failure);
        await expect(send(recipient, marker)).rejects.toBe(failure);
        expect(error.mock.calls).toHaveLength(1);
        expectPrivateLogs();
    });
});
