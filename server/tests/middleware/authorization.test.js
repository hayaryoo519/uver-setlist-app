jest.mock('dotenv', () => ({ config: jest.fn() }));
const { authorize } = require('../../middleware/authorization');

describe('認証失敗ログの資格情報保護', () => {
    it('トークンがなくてもCookie/Authorizationヘッダーをログに含めない', async () => {
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const req = { header: jest.fn().mockReturnValue(undefined), headers: {
            cookie: 'PRIVATE_COOKIE_FIXTURE', authorization: 'Bearer PRIVATE_AUTHORIZATION_FIXTURE',
        } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        try {
            await authorize(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
            expect(warning).toHaveBeenCalledWith('[AUTH] No token provided');
            expect(JSON.stringify(warning.mock.calls)).not.toContain('PRIVATE_COOKIE_FIXTURE');
            expect(JSON.stringify(warning.mock.calls)).not.toContain('PRIVATE_AUTHORIZATION_FIXTURE');
        } finally { warning.mockRestore(); }
    });
});
