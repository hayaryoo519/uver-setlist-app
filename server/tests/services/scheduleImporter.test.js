jest.mock('../../db');
jest.mock('axios');

const axios = require('axios');
const db = require('../../db');
const importer = require('../../services/scheduleImporter');

// 実際の www.uverworld.jp/schedule/list/ の構造をそのまま縮小したもの
const LIST_HTML = `
<ul class="newsList list--schedule">
    <li class="category--18 live03">
        <a href="/schedule/detail/3186">
            <div class="list__date">
                <p class="date date--event">2026.08.15<span class="week">[SAT]</span></p>
                <p class="cate">EVENT</p>
            </div>
            <p class="tit">RISING SUN ROCK FESTIVAL 2026 in EZO</p>
        </a>
    </li>
    <li class="category--17 live02">
        <a href="/schedule/detail/3190">
            <div class="list__date">
                <p class="date date--event">2026.10.03<span class="week">[FRI]</span></p>
                <p class="cate">TOUR</p>
            </div>
            <p class="tit">UVERworld LIVE "危ない" TOUR 2026</p>
        </a>
    </li>
    <li class="category--25 live09">
        <a href="/schedule/detail/3191">
            <div class="list__date">
                <p class="date date--event">2026.09.01<span class="week">[TUE]</span></p>
                <p class="cate">TICKET</p>
            </div>
            <p class="tit">チケット先行受付</p>
        </a>
    </li>
</ul>`;

const DETAIL_HTML = `
<div class="detail">
    <p class="date">2026.08.15（SAT）</p>
    <p class="place">会場</p>
    <p class="value">石狩湾新港樽川ふ頭横野外特設ステージ</p>
</div>`;

describe('scheduleImporter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('parseScheduleList', () => {
        it('ライブ関連の項目を抽出すること', () => {
            const entries = importer.parseScheduleList(LIST_HTML);

            expect(entries).toHaveLength(2);
            expect(entries[0]).toEqual({
                sourceId: '3186',
                date: '2026-08-15',
                category: 'EVENT',
                title: 'RISING SUN ROCK FESTIVAL 2026 in EZO',
                detailUrl: 'https://www.uverworld.jp/schedule/detail/3186',
            });
        });

        // TICKET / RELEASE / TV 等は公演ではないので取り込まない
        it('ライブ以外のカテゴリを除外すること', () => {
            const categories = importer.parseScheduleList(LIST_HTML).map((e) => e.category);

            expect(categories).toEqual(['EVENT', 'TOUR']);
            expect(categories).not.toContain('TICKET');
        });

        it('HTMLエンティティを復元すること', () => {
            const html = LIST_HTML.replace('RISING SUN ROCK FESTIVAL 2026 in EZO', 'A &amp; B FES');
            expect(importer.parseScheduleList(html)[0].title).toBe('A & B FES');
        });

        it('空のHTMLでも落ちないこと', () => {
            expect(importer.parseScheduleList('')).toEqual([]);
            expect(importer.parseScheduleList('<html></html>')).toEqual([]);
        });
    });

    describe('parseVenue', () => {
        it('詳細ページから会場名を取り出すこと', () => {
            expect(importer.parseVenue(DETAIL_HTML)).toBe('石狩湾新港樽川ふ頭横野外特設ステージ');
        });

        it('dt/dd 形式にも対応すること', () => {
            expect(importer.parseVenue('<dl><dt>会場</dt><dd>日本武道館</dd></dl>')).toBe('日本武道館');
        });

        it('「会場：〜」形式にも対応すること', () => {
            expect(importer.parseVenue('<div><p>会場：Zepp New Taipei</p></div>')).toBe('Zepp New Taipei');
        });

        // og:description に「会場：〜 日程：〜」が入っており、本文より先にヒットしていた
        it('head 内の meta タグを会場として拾わないこと', () => {
            const html = `<html><head>
                <meta property="og:description" content="会場：誤った会場 日程：2026/8/8(土) 出演：UVERworld">
                </head><body><dl><dt>会場</dt><dd>正しい会場</dd></dl></body></html>`;

            expect(importer.parseVenue(html)).toBe('正しい会場');
        });

        it('会場名の後ろに続く日程・出演を切り落とすこと', () => {
            expect(importer.parseVenue('<p>会場：Zepp New Taipei 日程：2026/8/8(土) 出演：UVERworld</p>'))
                .toBe('Zepp New Taipei');
        });

        it('日付だけを会場として拾わないこと', () => {
            expect(importer.parseVenue('<p>会場：2026/8/8(土)</p>')).toBeNull();
        });

        // 会場未定の告知もあるため、取得できないこと自体は異常ではない
        it('会場が無ければ null を返すこと', () => {
            expect(importer.parseVenue('<div>会場未定</div>')).toBeNull();
        });
    });

    describe('detectType', () => {
        it('EVENT カテゴリは FESTIVAL とすること', () => {
            expect(importer.detectType('EVENT', '石狩湾新港')).toBe('FESTIVAL');
            expect(importer.detectType('EVENT', '日本武道館')).toBe('FESTIVAL');
        });

        it.each([
            ['日本武道館', 'ARENA'],
            ['さいたまスーパーアリーナ', 'ARENA'],
            ['Zepp Haneda', 'LIVEHOUSE'],
            ['NHKホール', 'HALL'],
            ['どこかの広場', 'ONEMAN'],
        ])('TOUR で会場が %s なら %s', (venue, expected) => {
            expect(importer.detectType('TOUR', venue)).toBe(expected);
        });
    });

    describe('importSchedule', () => {
        beforeEach(() => {
            axios.get.mockImplementation((url) =>
                Promise.resolve({ data: url.includes('/detail/') ? DETAIL_HTML : LIST_HTML })
            );
        });

        it('未登録の公演を lives へ追加すること', async () => {
            db.query.mockImplementation((sql) => {
                if (sql.includes('INSERT INTO lives')) return Promise.resolve({ rows: [{ id: 900 }] });
                return Promise.resolve({ rows: [] }); // 既存なし
            });

            const stats = await importer.importSchedule();

            expect(stats.fetched).toBe(2);
            expect(stats.created).toBe(2);
            expect(stats.skipped).toBe(0);

            const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO lives'));
            expect(insert[1]).toEqual(expect.arrayContaining([
                '2026-08-15',
                '石狩湾新港樽川ふ頭横野外特設ステージ',
                'RISING SUN ROCK FESTIVAL 2026 in EZO',
                'FESTIVAL',
                'uverworld.jp:3186',
            ]));
        });

        it('external_source_id が一致する公演はスキップすること', async () => {
            db.query.mockImplementation((sql) => {
                if (sql.includes('external_source_id = $1')) return Promise.resolve({ rows: [{ id: 1 }] });
                return Promise.resolve({ rows: [] });
            });

            const stats = await importer.importSchedule();

            expect(stats.skipped).toBe(2);
            expect(stats.created).toBe(0);
            expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lives'), expect.anything());
        });

        // 相手サイトへの負荷を抑えるため、既知の公演では詳細ページを取りに行かない
        it('登録済みの公演では詳細ページを取得しないこと', async () => {
            db.query.mockImplementation((sql) =>
                sql.includes('external_source_id = $1')
                    ? Promise.resolve({ rows: [{ id: 1 }] })
                    : Promise.resolve({ rows: [] })
            );

            await importer.importSchedule();

            const detailCalls = axios.get.mock.calls.filter(([url]) => url.includes('/detail/'));
            expect(detailCalls).toHaveLength(0);
            expect(axios.get).toHaveBeenCalledTimes(1); // 一覧のみ
        });

        // HTML構造が変わるとパースが黙って0件になるため、異常として記録する
        it('1件も抽出できなければ warn を記録すること', async () => {
            axios.get.mockResolvedValue({ data: '<html><body>構造が変わった</body></html>' });
            db.query.mockResolvedValue({ rows: [] });

            const stats = await importer.importSchedule();

            expect(stats.fetched).toBe(0);
            const warn = db.query.mock.calls.find(
                ([sql, params]) => sql.includes('collector_logs') && params[0] === 'warn'
            );
            expect(warn).toBeDefined();
            expect(warn[1][1]).toContain('parsed no entries');
        });

        // 手動登録済みの公演と二重にならないこと
        it('同じ日付・会場の公演が既にあればスキップすること', async () => {
            db.query.mockImplementation((sql) => {
                if (sql.includes('external_source_id = $1')) return Promise.resolve({ rows: [] });
                if (sql.includes('normalized_venue')) return Promise.resolve({ rows: [{ id: 5 }] });
                return Promise.resolve({ rows: [] });
            });

            const stats = await importer.importSchedule();

            expect(stats.created).toBe(0);
            expect(stats.skipped).toBe(2);
        });

        it('dryRun では DB に書き込まないこと', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const stats = await importer.importSchedule({ dryRun: true });

            expect(stats.candidates).toBe(2);
            expect(stats.created).toBe(0);
            expect(stats.created_lives).toHaveLength(2);
            expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lives'), expect.anything());
        });

        it('詳細ページの取得に失敗しても公演自体は登録すること', async () => {
            axios.get.mockImplementation((url) =>
                url.includes('/detail/')
                    ? Promise.reject(new Error('timeout'))
                    : Promise.resolve({ data: LIST_HTML })
            );
            db.query.mockImplementation((sql) =>
                sql.includes('INSERT INTO lives')
                    ? Promise.resolve({ rows: [{ id: 901 }] })
                    : Promise.resolve({ rows: [] })
            );

            const stats = await importer.importSchedule();

            expect(stats.created).toBe(2);
            const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO lives'));
            expect(insert[1][1]).toBe(''); // 会場は空
        });

        it('一覧の取得に失敗したら例外を投げること', async () => {
            axios.get.mockRejectedValue(new Error('network down'));
            db.query.mockResolvedValue({ rows: [] });

            await expect(importer.importSchedule()).rejects.toThrow('network down');
        });
    });
});
