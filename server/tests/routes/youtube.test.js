const request = require('supertest');
const express = require('express');
const db = require('../../db');

const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockRefreshAccessToken = jest.fn();

jest.mock('../../db');
jest.mock('../../utils/encryption', () => ({
    encrypt: jest.fn((value) => `encrypted:${value}`),
    decrypt: jest.fn(() => 'stored-refresh-token'),
    signState: jest.fn(() => 'signed-state'),
    verifyState: jest.fn(() => '1'),
}));
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn(() => ({
                getToken: mockGetToken,
                setCredentials: mockSetCredentials,
                refreshAccessToken: mockRefreshAccessToken,
                generateAuthUrl: jest.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth'),
            })),
        },
    },
}));

const youtubeRouter = require('../../routes/youtube');

const app = express();
app.use(express.json());
app.use('/api/youtube', youtubeRouter);

describe('YouTube OAuth callback', () => {
    const originalWarn = console.warn;

    beforeEach(() => {
        jest.clearAllMocks();
        console.warn = jest.fn();
        mockGetToken.mockResolvedValue({
            tokens: {
                access_token: 'new-access-token',
                expiry_date: Date.now() + 3600 * 1000,
            },
        });
    });

    afterEach(() => {
        console.warn = originalWarn;
    });

    it('保存済みrefresh tokenが失効済みなら削除して連携完了にしないこと', async () => {
        mockRefreshAccessToken.mockRejectedValue(new Error('invalid_grant'));
        db.query
            .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: 'encrypted-stale-refresh-token' }] })
            .mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).get('/api/youtube/callback?code=oauth-code&state=signed-state');

        expect(res.statusCode).toBe(400);
        expect(res.text).toContain('YouTube連携を完了できませんでした');
        expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'stored-refresh-token' });
        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM user_google_tokens WHERE user_id = $1',
            ['1']
        );
        expect(db.query).not.toHaveBeenCalledWith(
            expect.stringContaining('UPDATE user_google_tokens SET'),
            expect.any(Array)
        );
    });
});
