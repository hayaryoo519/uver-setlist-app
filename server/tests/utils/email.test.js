const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: mockSendMail }))
}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');

describe('Email log privacy', () => {
    const marker = 'private-email-token-marker';
    const recipient = `${marker}@example.invalid`;
    const originalEnv = { EMAIL_USER: process.env.EMAIL_USER, APP_URL: process.env.APP_URL, NODE_ENV: process.env.NODE_ENV };
    let log, error;

    beforeEach(() => {
        mockSendMail.mockReset();
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
        ['development', undefined], ['development', 'your_email@example.invalid'],
        ['production', undefined], ['production', 'your_email@example.invalid']
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
        ['verification', sendVerificationEmail, '/verify-email'],
        ['reset', sendPasswordResetEmail, '/reset-password']
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
        ['verification', sendVerificationEmail], ['reset', sendPasswordResetEmail]
    ])('propagates %s SMTP errors without logging their message or properties', async (kind, send) => {
        process.env.EMAIL_USER = 'sender@example.invalid';
        const failure = Object.assign(new Error(marker), { response: marker, envelope: { to: [recipient] }, command: marker });
        mockSendMail.mockRejectedValue(failure);
        await expect(send(recipient, marker)).rejects.toBe(failure);
        expect(error.mock.calls).toHaveLength(1);
        expectPrivateLogs();
    });
});
