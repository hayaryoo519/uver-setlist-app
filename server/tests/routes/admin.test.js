const request = require('supertest');
const express = require('express');
const path = require('path');
const { EventEmitter } = require('events');
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

    it('本番DBでは書き込み可能なアプリ配下の保存先をスクリプトへ渡す', async () => {
        process.env.DB_NAME = 'uver_setlist_prod';
        const proc = new EventEmitter();
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        spawn.mockImplementation(() => {
            process.nextTick(() => {
                proc.stdout.emit('data', '[INFO] backup_20261008_120000.dump.gz');
                proc.emit('close', 0);
            });
            return proc;
        });

        const res = await request(app).post('/api/admin/backup').send({});

        expect(res.statusCode).toBe(200);
        // Compare only selected values so a failed assertion cannot dump process.env.
        expect(spawn.mock.calls.length).toBe(1);
        const [command, args, options] = spawn.mock.calls[0];
        expect(command).toBe('bash');
        expect(args).toEqual([path.resolve(__dirname, '../../../scripts/backup-db.sh')]);
        expect(options.env.BACKUP_DIR).toBe(path.resolve(__dirname, '../../../backups'));
    });

    it.each(['close', 'error'])('バックアップの%s失敗で秘密値を応答へ返さない', async event => {
        process.env.DB_NAME = 'uver_setlist_prod';
        const marker = 'private-backup-password-marker';
        const proc = new EventEmitter();
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
        spawn.mockImplementation(() => {
            process.nextTick(() => {
                proc.stderr.emit('data', marker);
                if (event === 'close') proc.emit('close', 1);
                else proc.emit('error', new Error(marker));
            });
            return proc;
        });
        try {
            const res = await request(app).post('/api/admin/backup').send({});
            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBeTruthy();
            expect(res.text).not.toContain(marker);
            expect(JSON.stringify(errorLog.mock.calls)).not.toContain(marker);
            expect(errorLog.mock.calls.length).toBe(1);
        } finally {
            errorLog.mockRestore();
        }
    });
});
