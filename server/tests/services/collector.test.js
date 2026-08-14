jest.mock('../../db');
jest.mock('../../utils/lineNotification', () => ({ notifyDraftAdded: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/xClient', () => {
    class XCollectorAbortError extends Error {}
    return { getPosts: jest.fn(), XCollectorAbortError };
});

const db = require('../../db');
const xClient = require('../../services/xClient');
const collector = require('../../services/collector');
const { XCollectorAbortError } = xClient;

const SONGS = [
    { id: 1, title: 'CORE PRIDE', normalized_title: 'core pride' },
    { id: 2, title: 'IMPACT', normalized_title: 'impact' },
    { id: 3, title: '7th Trigger', normalized_title: '7th trigger' },
];

function makePost(overrides = {}) {
    return {
        post_id: '1',
        post_url: 'https://x.com/i/status/1',
        posted_at: '2026-08-12T13:00:00Z',
        author: 'fan',
        text: '本日のセトリ',
        ...overrides,
    };
}

const TWELVE_SONGS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 'CORE PRIDE' : `曲${i}`));

describe('collector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        collector._resetCaches();
        jest.spyOn(collector, 'identifySetlist').mockResolvedValue({ is_setlist: false, songs: [] });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('matchSong', () => {
        const songs = [
            { id: 1, title: 'CORE PRIDE', normalizedTitle: 'core pride', fuzzyKey: 'COREPRIDE' },
            { id: 3, title: '7th Trigger', normalizedTitle: '7th trigger', fuzzyKey: '7THTRIGGER' },
        ];

        it('完全一致で解決すること', () => {
            expect(collector.matchSong('CORE PRIDE', songs).id).toBe(1);
        });

        it('大文字小文字の違いを normalized_title で吸収すること', () => {
            expect(collector.matchSong('7TH TRIGGER', songs).id).toBe(3);
        });

        it('空白・記号の揺れをファジー一致で吸収すること', () => {
            expect(collector.matchSong('COREPRIDE', songs).id).toBe(1);
        });

        it('未知の曲は null を返すこと', () => {
            expect(collector.matchSong('存在しない曲', songs)).toBeNull();
        });

        it('空文字は null を返すこと', () => {
            expect(collector.matchSong('  ', songs)).toBeNull();
        });
    });

    describe('minSongsForType', () => {
        it.each([['FESTIVAL', 5], ['EVENT', 5]])('%s は %i 曲', (type, expected) => {
            expect(collector.minSongsForType(type)).toBe(expected);
        });

        it.each([['ONEMAN'], ['ARENA'], ['HALL'], ['LIVEHOUSE'], [null], [undefined]])(
            '%s は 10 曲（不明も厳しい方に倒す）',
            (type) => {
                expect(collector.minSongsForType(type)).toBe(10);
            }
        );
    });

    describe('calculateConfidence', () => {
        const parsed = (matchedCount, total) =>
            Array.from({ length: total }, (_, i) => ({
                position: i + 1,
                title: `曲${i}`,
                song_id: i < matchedCount ? i + 1 : null,
            }));

        it('曲マスタ全一致・妥当な曲数・複数投稿で高スコアになること', () => {
            expect(collector.calculateConfidence(parsed(20, 20), 5, 'クリーンなテキスト')).toBeGreaterThanOrEqual(0.9);
        });

        it('曲マスタに全く一致しなければ低スコアになること', () => {
            expect(collector.calculateConfidence(parsed(0, 20), 1, 'テキスト')).toBeLessThan(0.5);
        });

        it('重複投稿数が多いほどスコアが上がること', () => {
            const single = collector.calculateConfidence(parsed(10, 20), 1, 'text');
            const many = collector.calculateConfidence(parsed(10, 20), 5, 'text');
            expect(many).toBeGreaterThan(single);
        });

        it('曲が0件なら0を返すこと', () => {
            expect(collector.calculateConfidence([], 1, '')).toBe(0);
        });

        it('フェスの6曲は曲数妥当性で満点、ワンマンの6曲は減点されること', () => {
            const fes = collector.calculateConfidence(parsed(6, 6), 1, 'text', 'FESTIVAL');
            const oneman = collector.calculateConfidence(parsed(6, 6), 1, 'text', 'ONEMAN');
            expect(fes).toBeGreaterThan(oneman);
        });

        it('0〜1に収まること', () => {
            const score = collector.calculateConfidence(parsed(30, 30), 10, '');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });
    });

    describe('buildParsedSongs', () => {
        it('曲マスタに一致した曲は song_id を持ち、不明曲は null になること', async () => {
            db.query.mockResolvedValueOnce({ rows: SONGS });

            const parsed = await collector.buildParsedSongs(['CORE PRIDE', '未知の曲']);

            expect(parsed).toEqual([
                { position: 1, title: 'CORE PRIDE', song_id: 1, matched_title: 'CORE PRIDE' },
                { position: 2, title: '未知の曲', song_id: null, matched_title: null },
            ]);
        });

        it('曲マスタ取得に失敗しても position/title は保持すること', async () => {
            db.query.mockRejectedValueOnce(new Error('db down'));

            const parsed = await collector.buildParsedSongs(['CORE PRIDE']);

            expect(parsed).toEqual([{ position: 1, title: 'CORE PRIDE', song_id: null, matched_title: null }]);
        });
    });

    describe('collect', () => {
        it('投稿が0件なら何も作成しないこと', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([]);
            db.query.mockResolvedValue({ rows: [] });

            await expect(collector.collect('q1', 1)).resolves.toBe(0);
        });

        it('セトリでない投稿はドラフト化しないこと', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost()]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: false, songs: [] });
            db.query.mockResolvedValue({ rows: [] });

            await expect(collector.collect('q2', 1)).resolves.toBe(0);
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO raw_setlists'),
                expect.anything()
            );
        });

        it('リツイートは処理せずスキップすること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost({ is_retweet: true })]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: TWELVE_SONGS });
            db.query.mockResolvedValue({ rows: [] });

            await expect(collector.collect('rt', 1)).resolves.toBe(0);
            expect(collector.identifySetlist).not.toHaveBeenCalled();
        });

        it('ワンマンで曲数が10未満の投稿は候補にしないこと', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost()]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: ['CORE PRIDE', 'IMPACT'] });
            db.query.mockImplementation((sql) => {
                if (sql.includes('SELECT type FROM lives')) return Promise.resolve({ rows: [{ type: 'ONEMAN' }] });
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('q3', 1)).resolves.toBe(0);
        });

        // フェスは持ち時間が短く、本番実績でも最小6曲
        it('フェスなら6曲でもドラフト化すること', async () => {
            const SIX = ['CORE PRIDE', 'IMPACT', '曲3', '曲4', '曲5', '曲6'];
            collector.getPosts = jest.fn().mockResolvedValue([makePost({ post_id: '61', post_url: 'https://x.com/a/status/61' })]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: SIX });
            db.query.mockImplementation((sql) => {
                if (sql.includes('SELECT type FROM lives')) return Promise.resolve({ rows: [{ type: 'FESTIVAL' }] });
                if (sql.includes('FROM songs')) return Promise.resolve({ rows: SONGS });
                if (sql.includes('SELECT id, duplicate_count')) return Promise.resolve({ rows: [] });
                if (sql.includes('INSERT INTO raw_setlists')) return Promise.resolve({ rows: [{ id: 20 }] });
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('fes', 1)).resolves.toBe(1);
        });

        it('フェスでも5曲未満なら候補にしないこと', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost()]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: ['CORE PRIDE', 'IMPACT', '曲3'] });
            db.query.mockImplementation((sql) => {
                if (sql.includes('SELECT type FROM lives')) return Promise.resolve({ rows: [{ type: 'FESTIVAL' }] });
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('fes-short', 1)).resolves.toBe(0);
        });

        it('公演種別が不明なら厳しい方(10曲)を適用すること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost()]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: Array.from({ length: 6 }, (_, i) => `曲${i}`) });
            db.query.mockImplementation((sql) => {
                if (sql.includes('SELECT type FROM lives')) return Promise.resolve({ rows: [{ type: null }] });
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('unknown-type', 1)).resolves.toBe(0);
        });

        it('新規セトリを source_urls / source_post_ids 付きで登録すること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost({ post_id: '999', post_url: 'https://x.com/i/status/999' })]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: TWELVE_SONGS });

            db.query.mockImplementation((sql) => {
                if (sql.includes('FROM songs')) return Promise.resolve({ rows: SONGS });
                if (sql.includes('SELECT id, duplicate_count')) return Promise.resolve({ rows: [] });
                if (sql.includes('INSERT INTO raw_setlists')) return Promise.resolve({ rows: [{ id: 10 }] });
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('q4', 1)).resolves.toBe(1);

            const insertCall = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO raw_setlists'));
            expect(insertCall[1]).toEqual(
                expect.arrayContaining([1, ['https://x.com/i/status/999'], ['999']])
            );
        });

        it('同一内容の別投稿は duplicate_count を増やし URL を追記すること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost({ post_id: '2', post_url: 'https://x.com/i/status/2' })]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: TWELVE_SONGS });

            db.query.mockImplementation((sql) => {
                if (sql.includes('FROM songs')) return Promise.resolve({ rows: SONGS });
                if (sql.includes('SELECT id, duplicate_count')) {
                    return Promise.resolve({
                        rows: [{ id: 10, duplicate_count: 1, source_urls: ['https://x.com/i/status/1'], source_post_ids: ['1'] }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(collector.collect('q5', 1)).resolves.toBe(0);

            const updateCall = db.query.mock.calls.find(([sql]) => sql.includes('UPDATE raw_setlists'));
            expect(updateCall[1][0]).toBe(2); // duplicate_count
            expect(updateCall[1]).toEqual(expect.arrayContaining(['https://x.com/i/status/2', '2']));
        });

        it('既にカウント済みの投稿IDなら duplicate_count を増やさないこと', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([makePost({ post_id: '1' })]);
            collector.identifySetlist.mockResolvedValue({ is_setlist: true, songs: TWELVE_SONGS });

            db.query.mockImplementation((sql) => {
                if (sql.includes('FROM songs')) return Promise.resolve({ rows: SONGS });
                if (sql.includes('SELECT id, duplicate_count')) {
                    return Promise.resolve({
                        rows: [{ id: 10, duplicate_count: 3, source_urls: [], source_post_ids: ['1'] }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await collector.collect('q6', 1);

            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('UPDATE raw_setlists'),
                expect.anything()
            );
        });

        it('同一ライブ×同一クエリはレート制限でスキップすること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([]);
            db.query.mockResolvedValue({ rows: [] });

            await collector.collect('same-query', 42);
            collector.getPosts.mockClear();
            await collector.collect('same-query', 42);

            expect(collector.getPosts).not.toHaveBeenCalled();
        });

        it('同一ライブでもクエリが違えば実行すること', async () => {
            collector.getPosts = jest.fn().mockResolvedValue([]);
            db.query.mockResolvedValue({ rows: [] });

            await collector.collect('query-a', 43);
            await collector.collect('query-b', 43);

            expect(collector.getPosts).toHaveBeenCalledTimes(2);
        });

        it('レート制限エラーは呼び出し側へ再送出すること', async () => {
            collector.getPosts = jest.fn().mockRejectedValue(new XCollectorAbortError('429'));
            db.query.mockResolvedValue({ rows: [] });

            await expect(collector.collect('q7', 1)).rejects.toThrow(XCollectorAbortError);
        });

        it('通常の取得失敗は 0 件で終了すること', async () => {
            collector.getPosts = jest.fn().mockRejectedValue(new Error('boom'));
            db.query.mockResolvedValue({ rows: [] });

            await expect(collector.collect('q8', 1)).resolves.toBe(0);
        });
    });
});
