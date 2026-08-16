jest.mock('../../utils/lineNotification', () => ({ notifyDraftsCollected: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/pushNotification', () => ({ notifyAdmins: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }) }));
jest.mock('../../db');
jest.mock('../../services/collector', () => ({ collect: jest.fn().mockResolvedValue(0) }));

const db = require('../../db');
const collector = require('../../services/collector');
const { notifyAdmins } = require('../../utils/pushNotification');
const { notifyDraftsCollected } = require('../../utils/lineNotification');
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

        // フェスの昼枠に対応するため15時から回す
        it('JST 15時は収集対象であること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T06:00:00Z'));
            db.query.mockResolvedValue({ rows: [] });

            await monitor.monitor();

            expect(db.query).toHaveBeenCalled();
        });

        it('JST 14時は収集対象外であること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T05:00:00Z'));

            await monitor.monitor();

            expect(db.query).not.toHaveBeenCalled();
        });

        it('JST 23時は収集対象であること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T14:00:00Z'));
            db.query.mockResolvedValue({ rows: [] });

            await monitor.monitor();

            expect(db.query).toHaveBeenCalled();
        });

        // 深夜〜早朝は投稿が増えないので回さない
        it('JST 3時は収集対象外であること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-11T18:00:00Z'));

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

        // 1公演で最大5クエリ投げるため、通知はクエリ単位ではなく公演単位にまとめる
        it('ドラフトができたら公演ごとに1回だけ通知すること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockResolvedValue({
                rows: [{ id: 7, date: '2026-08-12', venue: '日本ガイシホール', tour_name: 'EPIPHANY', prefecture: '愛知' }],
            });
            collector.collect.mockResolvedValue(2);

            await monitor.monitor();

            expect(notifyAdmins).toHaveBeenCalledTimes(1);
            expect(notifyAdmins.mock.calls[0][0].title).toContain('件');
            expect(notifyAdmins.mock.calls[0][0].body).toContain('日本ガイシホール');
        });

        // ドラフト1件ごとではなく公演ごとに1通へまとめる
        it('LINEにも公演ごとに1通だけ送ること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            const drafts = [
                { id: 10, confidence: '0.80', parsed_json: [{ position: 1, title: 'A' }] },
                { id: 11, confidence: '0.60', parsed_json: [{ position: 1, title: 'B' }] },
            ];
            db.query.mockImplementation((sql) =>
                sql.includes('FROM raw_setlists')
                    ? Promise.resolve({ rows: drafts })
                    : Promise.resolve({ rows: [{ id: 7, date: '2026-08-12', venue: '日本ガイシホール', tour_name: 'EPIPHANY', prefecture: null }] })
            );
            collector.collect.mockResolvedValue(2);

            await monitor.monitor();

            expect(notifyDraftsCollected).toHaveBeenCalledTimes(1);
            const [live, passedDrafts] = notifyDraftsCollected.mock.calls[0];
            expect(live.venue).toBe('日本ガイシホール');
            expect(passedDrafts).toHaveLength(2);
        });

        it('ドラフト取得に失敗しても収集処理を止めないこと', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockImplementation((sql) =>
                sql.includes('FROM raw_setlists')
                    ? Promise.reject(new Error('db down'))
                    : Promise.resolve({ rows: [{ id: 7, date: '2026-08-12', venue: '会場', tour_name: null, prefecture: null }] })
            );
            collector.collect.mockResolvedValue(1);

            await expect(monitor.monitor()).resolves.toBeUndefined();
            expect(notifyAdmins).toHaveBeenCalledTimes(1);
        });

        it('ドラフトが0件なら通知しないこと', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockResolvedValue({
                rows: [{ id: 7, date: '2026-08-12', venue: '日本ガイシホール', tour_name: null, prefecture: null }],
            });
            collector.collect.mockResolvedValue(0);

            await monitor.monitor();

            expect(notifyAdmins).not.toHaveBeenCalled();
        });

        // Cookie 失効は放置すると収集が止まり続けるため必ず知らせる
        it('収集中断時は管理者へ通知すること', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-08-12T11:00:00Z'));
            db.query.mockResolvedValue({
                rows: [{ id: 7, date: '2026-08-12', venue: '会場', tour_name: null, prefecture: null }],
            });
            const { XCollectorAbortError } = require('../../services/xClient');
            collector.collect.mockRejectedValueOnce(new XCollectorAbortError('unauthorized'));

            await monitor.monitor();

            expect(notifyAdmins).toHaveBeenCalledTimes(1);
            expect(notifyAdmins.mock.calls[0][0].body).toContain('Cookie');
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
