const request = require('supertest');
const express = require('express');
const songsRouter = require('../../routes/songs');
const db = require('../../db');

// db.query をモック化
jest.mock('../../db');

const app = express();
app.use(express.json());
app.use('/api/songs', songsRouter);

describe('Songs API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/songs', () => {
        it('全ての楽曲を取得できること', async () => {
            const mockSongs = [
                { id: 1, title: '7th Trigger' },
                { id: 2, title: 'CORE PRIDE' }
            ];
            db.query.mockResolvedValue({ rows: mockSongs });

            const res = await request(app).get('/api/songs');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockSongs);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('deleted_at IS NULL'),
                []
            );
        });

        it('検索クエリが正しく処理されること', async () => {
            const mockSongs = [{ id: 1, title: '7th Trigger' }];
            db.query.mockResolvedValue({ rows: mockSongs });

            const res = await request(app).get('/api/songs?q=7th');

            expect(res.statusCode).toEqual(200);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('title ILIKE $'),
                ['%7th%']
            );
        });

        it('サーバーエラー時に500を返すこと', async () => {
            db.query.mockRejectedValue(new Error('Database Error'));

            const res = await request(app).get('/api/songs');

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('message', 'Server Error');
        });
    });
});
