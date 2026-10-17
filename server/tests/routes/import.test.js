jest.mock('../../db', () => ({ pool: { connect: jest.fn() } }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => next(),
    adminCheck: (req, res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const router = require('../../routes/import');
const app = express();
app.use('/api/import', router);

let client;
beforeEach(() => {
    jest.clearAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
    client.query.mockImplementation(async sql => {
        if (sql.startsWith('SELECT id FROM lives')) return { rows: [] };
        if (sql.startsWith('INSERT INTO lives')) return { rows: [{ id: 42 }] };
        if (sql.startsWith('SELECT id FROM songs')) return { rows: [{ id: 10 }] };
        return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);
});

const header = 'live_date,venue,tour,title,type,song,order_no,tags,country_code,special_note,live_id';
const row = '2020-12-21,Fixture Hall,Fixture Tour,Fixture Title,ONEMAN,Fixture Song,1,encore,KR,Fixture Note,999';
const upload = (text) => request(app).post('/api/import/csv')
    .attach('file', Buffer.from(text), 'fixture.csv');

describe('CSV ライブ追加/更新の現状確認', () => {
    it('ファイル未指定は400で、DBへ接続しない', async () => {
        const res = await request(app).post('/api/import/csv');
        expect(res.status).toBe(400);
        expect(db.pool.connect).not.toHaveBeenCalled();
    });

    it('同日同会場の行をまとめ、tags列はライブ属性ではなく曲のnoteとして保存する', async () => {
        const res = await upload(`${header}\n${row}\n${row.replace('Fixture Song,1', 'Second Song,2')}`);
        expect(res.status).toBe(200);
        expect(res.body.stats).toMatchObject({ livesCreated: 1, totalRows: 2 });
        const insert = client.query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO lives'));
        expect(insert[1]).toEqual(['2020-12-21', 'Fixture Hall', null, 'Fixture Tour', 'Fixture Title', 'ONEMAN', 'FINISHED']);
        expect(insert[0]).not.toContain('special_note');
        expect(insert[0]).not.toContain('country');
        expect(client.query).toHaveBeenCalledWith(
            'INSERT INTO setlists (live_id, song_id, position, note) VALUES ($1, $2, $3, $4)',
            [42, 10, 1, 'encore'],
        );
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('現状はlive_id列より日付・会場で照合し、既存名称を更新してセトリを置換する', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.startsWith('SELECT id FROM lives')) return { rows: [{ id: 7 }] };
            if (sql.startsWith('SELECT id FROM songs')) return { rows: [{ id: 10 }] };
            return { rows: [] };
        });
        const res = await upload(`${header}\n${row}`);
        expect(res.status).toBe(200);
        expect(res.body.stats).toMatchObject({ livesCreated: 0, livesUpdated: 1 });
        expect(client.query).toHaveBeenCalledWith(
            'SELECT id FROM lives WHERE date = $1 AND venue = $2', ['2020-12-21', 'Fixture Hall'],
        );
        expect(client.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE lives SET tour_name'),
            ['Fixture Tour', 'Fixture Title', null, 'ONEMAN', 'FINISHED', 7],
        );
        expect(client.query).toHaveBeenCalledWith('DELETE FROM setlists WHERE live_id = $1', [7]);
    });

    it('現状は曲なしのCSVでも既存セトリを削除する', async () => {
        client.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT id FROM lives') ? [{ id: 7 }] : [] }));
        const res = await upload('live_date,venue,tour\n2020-08-01,Fixture Hall,Fixture Tour');
        expect(res.status).toBe(200);
        expect(client.query).toHaveBeenCalledWith('DELETE FROM setlists WHERE live_id = $1', [7]);
        expect(client.query.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO setlists'))).toBe(false);
        // 完成仕様ではなく、追加情報だけの更新にこの経路を使う危険性を示す回帰テスト。
    });

    it('途中の保存失敗はトランザクション全体をロールバックする', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.startsWith('SELECT id FROM lives')) return { rows: [] };
            if (sql.startsWith('INSERT INTO lives')) return { rows: [{ id: 42 }] };
            if (sql.startsWith('SELECT id FROM songs')) return { rows: [{ id: 10 }] };
            if (sql.startsWith('INSERT INTO setlists')) throw new Error('fixture write failed');
            return { rows: [] };
        });
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = await upload(`${header}\n${row}`);
            expect(res.status).toBe(500);
            expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            expect(client.query).not.toHaveBeenCalledWith('COMMIT');
            expect(client.release).toHaveBeenCalledTimes(1);
        } finally {
            log.mockRestore();
        }
    });
});
