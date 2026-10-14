const request = require('supertest');
const express = require('express');
const feedRouter = require('../../routes/feed');
const db = require('../../db');

jest.mock('../../db');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => {
        req.user = { user_id: 1 };
        next();
    },
}));

const app = express();
app.use(express.json());
app.use('/api/feed', feedRouter);

describe('Feed API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('フォロー中ユーザーの予想を取得すること', async () => {
        const mockFeed = [
            { id: 10, user_id: 2, title: 'セットリスト予想' },
        ];
        db.query.mockResolvedValue({ rows: mockFeed });

        const res = await request(app).get('/api/feed');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockFeed);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('JOIN predictions          p   ON p.user_id  = f.following_id'),
            [1, 20, 0]
        );
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE f.follower_id = $1'),
            [1, 20, 0]
        );
    });

    it('DBエラーの入力値をログと応答に出さない', async () => {
        const marker = 'private-feed@example.invalid Bearer fixture-token';
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            db.query.mockRejectedValueOnce(new Error(marker));
            const res = await request(app).get('/api/feed');
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
            expect(errorSpy).toHaveBeenCalledWith('Feed error: details suppressed');
            expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(marker);
        } finally {
            errorSpy.mockRestore();
        }
    });
});
