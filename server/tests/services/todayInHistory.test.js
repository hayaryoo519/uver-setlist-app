jest.mock('../../db');

const request = require('supertest');
const express = require('express');
const db = require('../../db');
const { anniversariesFor, getTodayInHistory } = require('../../services/todayInHistory');
const statsRouter = require('../../routes/stats');

const live = (id, date, extra = {}) => ({
    id, date, title: `LIVE ${id}`, tour_name: null, venue: 'Zepp', prefecture: '東京都', type: 'oneman', song_count: 20, ...extra,
});

describe('過去の今日のライブ', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('JSTの当日と前後3日の月日をまとめて検索する', async () => {
        db.query.mockResolvedValueOnce({ rows: [live(3, '2016-07-06')] });
        // UTC 7/5 15:00 は JST 7/6 0:00
        const result = await getTodayInHistory({ now: new Date('2026-07-05T15:00:00Z') });

        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("TO_CHAR(l.date, 'MM-DD') = ANY($1::text[])"),
            [['07-06', '07-07', '07-05', '07-08', '07-04', '07-09', '07-03'], '2026-07-06']
        );
        expect(result).toMatchObject({ date: '2026-07-06', matched_date: '2026-07-06', offset_days: 0 });
        expect(result.lives[0]).toMatchObject({ id: 3, years_ago: 10, is_milestone: true });
        expect(result.anniversaries).toEqual([
            expect.objectContaining({ type: 'debut', label: 'メジャーデビュー記念日', year: 2005, years: 21 }),
        ]);
    });

    it('節目の公演を先に、それぞれ新しい順に並べる', async () => {
        db.query.mockResolvedValueOnce({
            rows: [live(1, '2010-10-23'), live(2, '2016-10-23'), live(3, '2021-10-23'), live(4, '2023-10-23')],
        });
        const result = await getTodayInHistory({ now: new Date('2026-10-23T03:00:00Z') });

        expect(result.lives.map(row => [row.id, row.years_ago, row.is_milestone])).toEqual([
            [3, 5, true], [2, 10, true], [4, 3, false], [1, 16, false],
        ]);
    });

    it('当日に公演がなければ近い日を探し、同じ距離なら先の日を優先する', async () => {
        db.query.mockResolvedValueOnce({ rows: [live(1, '2015-01-12'), live(2, '2018-01-16')] });
        const result = await getTodayInHistory({ now: new Date('2026-01-14T03:00:00Z') });

        expect(result).toMatchObject({ matched_date: '2026-01-16', offset_days: 2 });
        expect(result.lives.map(row => row.id)).toEqual([2]);
    });

    it('近い日が過去側でも、対象日から1年未満の公演は含めない', async () => {
        // 昨日（2026-10-22）の公演は「0年前」なので歴史として扱わない
        db.query.mockResolvedValueOnce({ rows: [live(1, '2026-10-22'), live(2, '2019-10-21')] });
        const result = await getTodayInHistory({ now: new Date('2026-10-23T03:00:00Z') });

        expect(result).toMatchObject({ matched_date: '2026-10-21', offset_days: -2 });
        expect(result.lives).toEqual([expect.objectContaining({ id: 2, years_ago: 7 })]);
    });

    it('年をまたぐ近い日も対象日の年で経過年数を数える', async () => {
        db.query.mockResolvedValueOnce({ rows: [live(1, '2020-12-31')] });
        const result = await getTodayInHistory({ now: new Date('2027-01-01T03:00:00Z') });

        expect(result).toMatchObject({ matched_date: '2026-12-31', offset_days: -1 });
        expect(result.lives[0]).toMatchObject({ years_ago: 6 });
    });

    it('前後3日にも公演がなければ空で返す', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });
        const result = await getTodayInHistory({ now: new Date('2026-01-03T03:00:00Z') });

        expect(result).toMatchObject({ matched_date: null, offset_days: null, lives: [] });
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
