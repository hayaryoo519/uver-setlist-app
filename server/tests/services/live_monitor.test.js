jest.mock('../../db');
jest.mock('../../services/collector', () => ({ collect: jest.fn().mockResolvedValue(0) }));

const db = require('../../db');
const collector = require('../../services/collector');
const monitor = require('../../services/live_monitor');

describe('live_monitor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('buildQueries', () => {
        it('会場・日付・ツアー名から3〜5件のクエリを生成すること', () => {
            const queries = monitor.buildQueries({
                date: '2026-08-12',
                venue: '日本ガイシホール',
                tour_name: 'EPIPHANY',
                prefecture: '愛知県',
            });

            expect(queries.length).toBeGreaterThanOrEqual(3);
            expect(queries.length).toBeLessThanOrEqual(5);
            expect(queries).toContain('UVERworld セトリ 日本ガイシホール');
            expect(queries).toContain('UVERworld セトリ 2026/08/12');
            expect(queries).toContain('UVERworld EPIPHANY セトリ');
        });

        it('会場・ツアー名が無くても日付クエリを生成すること', () => {
            const queries = monitor.buildQueries({ date: '2026-08-12' });
            expect(queries).toEqual(['UVERworld セトリ 2026/08/12']);
        });

        it('Date 型の date も扱えること', () => {
            const queries = monitor.buildQueries({ date: new Date('2026-08-12T00:00:00Z') });
            expect(queries).toContain('UVERworld セトリ 2026/08/12');
        });

        it('重複するクエリを除去すること', () => {
            const queries = monitor.buildQueries({ date: '2026-08-12', venue: '愛知', prefecture: '愛知' });
            expect(new Set(queries).size).toBe(queries.length);
        });
    });

    describe('findTargetLives', () => {
        it('セトリ登録済みを除外する条件で当日・前日を検索すること', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await monitor.findTargetLives();

            const [sql, params] = db.query.mock.calls[0];
            expect(sql).toContain("setlist_status IS DISTINCT FROM 'NORMAL'");
            expect(sql).toContain('NOT EXISTS');
            expect(params).toHaveLength(2);
        });
    });

    describe('monitor', () => {
        it('収集対象時刻でなければ何もしないこと', async () => {
            // JST 12:00 = UTC 03:00
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T03:00:00Z'));

            await monitor.monitor();

            expect(db.query).not.toHaveBeenCalled();
        });

        it('収集対象時刻なら対象ライブごとに収集を実行すること', async () => {
            // JST 20:00 = UTC 11:00
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockResolvedValue({
                rows: [{ id: 7, date: '2026-08-12', venue: '日本ガイシホール', tour_name: null, prefecture: null }],
            });

            await monitor.monitor();

            expect(collector.collect).toHaveBeenCalled();
            expect(collector.collect.mock.calls.every(([, liveId]) => liveId === 7)).toBe(true);
        });

        it('レート制限エラーを検知したら残りのクエリを実行しないこと', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockResolvedValue({
                rows: [{ id: 7, date: '2026-08-12', venue: '日本ガイシホール', tour_name: 'EPIPHANY', prefecture: '愛知' }],
            });

            const { XCollectorAbortError } = require('../../services/xClient');
            collector.collect.mockRejectedValueOnce(new XCollectorAbortError('429'));

            await expect(monitor.monitor()).resolves.toBeUndefined();
            expect(collector.collect).toHaveBeenCalledTimes(1);
        });
    });
});
