jest.mock('../../db');

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const { anniversariesFor, getTodayInHistory } = require('../../services/todayInHistory');
const statsRouter = require('../../routes/stats');

describe('今日のUVER史', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('JSTの月日で過去ライブを検索し、何年前かを付与する', async () => {
        db.query.mockResolvedValueOnce({
            rows: [{ id: 3, date: '2016-07-06', title: 'LIVE', tour_name: null, venue: 'Zepp', prefecture: '東京都', type: 'ONEMAN', song_count: 20 }],
        });
        // UTC 7/5 15:00 は JST 7/6 0:00
        const result = await getTodayInHistory({ now: new Date('2026-07-05T15:00:00Z') });

        expect(db.query).toHaveBeenCalledWith(expect.stringContaining("TO_CHAR(l.date, 'MM-DD') = $1"), ['07-06', '2026-07-06']);
        expect(result.date).toBe('2026-07-06');
        expect(result.lives[0]).toMatchObject({ id: 3, years_ago: 10, song_count: 20 });
        expect(result.anniversaries).toEqual([
            expect.objectContaining({ type: 'debut', label: 'メジャーデビュー記念日', year: 2005, years: 21 }),
        ]);
    });

    it('誕生日は経過年数を持たず、該当しない日は空になる', () => {
        expect(anniversariesFor('2026-12-21')).toEqual([{ type: 'birthday', label: 'TAKUYA∞ 誕生日' }]);
        expect(anniversariesFor('2026-01-01')).toEqual([]);
    });

    it('GET /api/stats/today-in-history はDB例外の詳細を返さない', async () => {
        const marker = 'private-db-detail';
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        db.query.mockRejectedValueOnce(new Error(marker));
        const app = express();
        app.use('/api/stats', statsRouter);

        const res = await request(app).get('/api/stats/today-in-history');

        expect(res.statusCode).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(JSON.stringify(spy.mock.calls)).not.toContain(marker);
        spy.mockRestore();
    });
});
