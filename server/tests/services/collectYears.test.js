jest.mock('axios');
jest.mock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
jest.mock('../../utils/songTranslations', () => ({
    normalizeVenueName: jest.fn(name => name),
    normalizeSongTitle: jest.fn(title => title),
}));

const axios = require('axios');
const db = require('../../db');
const { createJob, getJob } = require('../../services/collectJob');
const { collectYears } = require('../../services/collectYears');

// 外部通信・実DBを使わず、年代一括収集の現在の登録/再取得動作を固定する。
const fixture = (overrides = {}) => ({
    id: 'fixture-live', eventDate: '21-12-2020',
    venue: { name: 'Fixture Hall', city: { country: { code: 'KR', name: 'South Korea' } } },
    tour: { name: 'Fixture Tour' }, info: 'UVERworld vs Fixture Artist',
    sets: { set: [] }, ...overrides,
});

let client;
let jobId;

beforeEach(() => {
    jest.clearAllMocks();
    jobId = createJob(2020, 2020);
    client = { query: jest.fn(), release: jest.fn() };
    client.query.mockImplementation(async sql => {
        if (sql.includes('INSERT INTO lives')) return { rows: [{ id: 42 }] };
        if (sql.startsWith('SELECT id FROM lives')) return { rows: [{ id: 42 }] };
        if (sql.includes('SELECT id FROM songs')) return { rows: [{ id: 10 }] };
        return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);
    db.query.mockResolvedValue({ rows: [] });
});

async function run(setlist) {
    axios.get.mockResolvedValue({ data: { total: 1, itemsPerPage: 20, setlist: [setlist] } });
    await collectYears(2020, 2020, 'fixture-api-key', jobId);
}

function liveInsert() {
    return client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO lives'));
}

describe('collectYears 登録後の動作（現状の回帰テスト）', () => {
    it('誕生日と同日でも生誕祭情報は生成せず、未登録セトリとして追加する', async () => {
        await run(fixture());
        const [sql, params] = liveInsert();
        expect(params).toEqual(['2020-12-21', 'Fixture Hall', 'Fixture Tour', 'HALL', 'fixture-live', 'UNKNOWN_SETLIST']);
        expect(sql).not.toContain('special_note');
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(getJob(jobId)).toMatchObject({ status: 'done', totalCreated: 1, totalSkipped: 0 });
    });

    it.each([
        { tour: { name: 'Fixture ＦＥＳＴＩＶＡＬ' }, info: null },
        { tour: undefined, info: 'ROCK IN JAPAN' },
    ])('取得元が明示するフェスを単件取り込みと同じ既存種別へ保存する %j', async source => {
        await run(fixture(source));
        expect(liveInsert()[1][3]).toBe('FESTIVAL');
        const call = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO live_metadata ('));
        expect(JSON.parse(call[1][1]).tags).not.toContain('festival');
    });

    it('会場名や年末の日付だけからフェスを捏造しない', async () => {
        await run(fixture({ eventDate: '29-12-2020', venue: { name: 'Makuhari Messe Festival Hall' }, tour: undefined, info: null }));
        expect(liveInsert()[1][3]).toBe('ARENA');
        expect(liveInsert()[1][2]).toBe('');
    });

    it('国・共演説明・原文を候補として同じトランザクションに保存する', async () => {
        await run(fixture());
        const call = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO live_metadata ('));
        const candidates = JSON.parse(call[1][1]);
        expect(candidates).toMatchObject({ tags: ['vs'], countryCode: 'KR', sourceId: 'setlistfm:fixture-live' });
        expect(candidates.original.info).toBe('UVERworld vs Fixture Artist');
        expect(candidates.tags).not.toContain('birthday');
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO live_metadata_history'), expect.any(Array));
    });

    it('ツアー名がない場合はinfoを名称に使い、セトリも同じトランザクションで追加する', async () => {
        await run(fixture({ tour: undefined, sets: { set: [{ song: [{ name: 'Fixture Song' }] }] } }));
        expect(liveInsert()[1]).toEqual([
            '2020-12-21', 'Fixture Hall', 'UVERworld vs Fixture Artist', 'HALL', 'fixture-live', 'NORMAL',
        ]);
        expect(client.query).toHaveBeenCalledWith(
            'INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)', [42, 10, 1],
        );
        expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('既存のsetlist.fm IDは候補のみ再取得し、名称・セトリ・手動設定を更新しない', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.startsWith('SELECT id FROM lives')) return { rows: [{ id: 42 }] };
            if (sql.startsWith('SELECT * FROM live_metadata')) return { rows: [{
                live_id: 42, candidates: {}, overrides: { country: { code: 'JP' } }, revision: 2,
            }] };
            return { rows: [] };
        });
        await run(fixture({ sets: { set: [{ song: [{ name: 'Changed Song' }] }] } }));
        expect(liveInsert()[0]).toContain('DO NOTHING');
        expect(client.query.mock.calls.some(([sql]) => /UPDATE lives|INSERT INTO setlists/.test(sql))).toBe(false);
        expect(getJob(jobId)).toMatchObject({ status: 'done', totalCreated: 0, totalSkipped: 1 });
        const call = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO live_metadata ('));
        expect(JSON.parse(call[1][2])).toEqual({ country: { code: 'JP' } });
        expect(call[0]).not.toContain('overrides = EXCLUDED.overrides');
    });

    it('登録失敗時はロールバックし、レビュー可能な公演が作成されたと数えない', async () => {
        client.query.mockImplementation(async sql => {
            if (sql.includes('INSERT INTO lives')) throw new Error('fixture insert failed');
            return { rows: [] };
        });
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await run(fixture());
            expect(client.query).toHaveBeenCalledWith('ROLLBACK');
            expect(client.query).not.toHaveBeenCalledWith('COMMIT');
            expect(client.release).toHaveBeenCalledTimes(1);
            expect(getJob(jobId)).toMatchObject({ status: 'done', totalCreated: 0, totalFailed: 1 });
        } finally {
            log.mockRestore();
        }
    });
});
