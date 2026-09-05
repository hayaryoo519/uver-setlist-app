const request = require('supertest');
const express = require('express');
const { spawn } = require('child_process');

jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));

jest.mock('../../middleware/authorization', () => ({
    authorize: (req, _res, next) => {
        req.user = { user_id: 1, role: 'admin' };
        next();
    },
    adminCheck: (_req, _res, next) => next(),
}));

const adminRouter = require('../../routes/admin');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('POST /api/admin/backup', () => {
    const originalDbName = process.env.DB_NAME;

    afterEach(() => {
        process.env.DB_NAME = originalDbName;
        jest.clearAllMocks();
    });

    it('staging DB ではバックアップを実行しない', async () => {
        process.env.DB_NAME = 'uver_setlist_staging';

        const res = await request(app).post('/api/admin/backup').send({});

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('バックアップは本番環境でのみ実行できます');
        expect(spawn).not.toHaveBeenCalled();
    });
});
