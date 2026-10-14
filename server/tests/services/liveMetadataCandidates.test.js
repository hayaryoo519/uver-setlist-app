const { buildSetlistCandidates, buildOfficialCandidates, saveMetadataCandidates } = require('../../services/liveMetadataCandidates');
const { effectiveMetadata, mergeCandidateSources } = require('../../utils/liveMetadata');
const fixture = () => ({ id: 'fixture', eventDate: '21-12-2020',
    tour: { name: '男祭り X’mas' }, info: 'UVERworld VS Fixture Artist',
    venue: { name: 'Fixture Hall', city: { country: { code: 'kr' } } },
    url: 'https://example.test/live', sets: { set: [] }, user: { name: 'private' },
});
let client;
let stored;
beforeEach(() => {
    stored = { live_id: 42, candidates: {}, overrides: {}, revision: 2 };
    client = { query: jest.fn(async sql => {
        if (sql.startsWith('SELECT id FROM lives')) return { rows: [{ id: 42 }] };
        if (sql.startsWith('SELECT * FROM live_metadata')) return { rows: [stored] };
        return { rows: [] };
    }) };
});

describe('共通の取得候補生成・保存', () => {
    it('固定タグ・国・出典を生成し、日付や会場から生誕祭を推測しない', () => {
        const result = buildSetlistCandidates(fixture());
        expect(result).toMatchObject({ tags: ['mens', 'vs', 'christmas'], countryCode: 'KR', sourceId: 'setlistfm:fixture' });
        expect(result.tags).not.toContain('birthday');
        expect(result.original.countryCode).toBe('kr');
        expect(result.original).not.toHaveProperty('sets');
        expect(result.original).not.toHaveProperty('user');
    });

    it('未知の企画を原文に保持し、自由タグを作らない', () => {
        const raw = fixture();
        raw.tour.name = '未知の企画'; raw.info = '';
        const result = buildSetlistCandidates(raw);
        expect(result.tags).toEqual([]);
        expect(result.original.tourName).toBe('未知の企画');
    });

    it('アコースティックを固定タグに生成しない', () => {
        const raw = fixture(); raw.tour.name = 'ACOUSTIC'; raw.info = '';
        expect(buildSetlistCandidates(raw).tags).toEqual([]);
    });

    it('取得情報の型・国コード・URLを検証する', () => {
        for (const raw of [null, { info: {} }, { venue: { city: { country: { code: 'XX' } } } }, { url: 'javascript:bad' }]) {
            expect(() => buildSetlistCandidates(raw)).toThrow();
        }
    });

    it('候補変更時は手動設定を保持し、呼び出し元のトランザクションを終えない', async () => {
        stored.overrides = { country: { code: 'JP' }, tagOverrides: { add: ['birthday'], remove: ['mens'] } };
        const result = await saveMetadataCandidates(client, 42, buildSetlistCandidates(fixture()));
        expect(result.overrides).toEqual(stored.overrides);
        expect(result.revision).toBe(3);
        expect(result.changed).toBe(true);
        expect(effectiveMetadata(result.candidates, result.overrides).tags).not.toContain('mens');
        expect(client.query.mock.calls.some(([sql]) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql))).toBe(false);
    });

    it('同じ候補の再取得はrevisionも履歴も増やさない', async () => {
        stored.candidates = mergeCandidateSources({}, buildSetlistCandidates(fixture()));
        const result = await saveMetadataCandidates(client, 42, buildSetlistCandidates(fixture()));
        expect(result.changed).toBe(false);
        expect(result.revision).toBe(2);
        expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
    });

    it('手動確定した対象メンバーは、取得候補から生誕祭が消えても保持する', async () => {
        stored.overrides = { members: { ids: ['takuya'] } };
        const result = await saveMetadataCandidates(client, 42, buildSetlistCandidates(fixture()));
        expect(result.candidates.tags).not.toContain('birthday');
        expect(effectiveMetadata(result.candidates, result.overrides).tags).toContain('birthday');
        expect(result.overrides).toEqual(stored.overrides);
    });

    it('公式の名称・出典から候補を生成し、国を会場名や時刻から推測しない', () => {
        const result = buildOfficialCandidates({ sourceId: 'news:1', title: 'UVERworld vs Fixture Artist',
            date: '2020-12-21', category: 'NEWS', detailUrl: 'https://www.uverworld.jp/news/detail/1',
        }, '韓国・Fixture Hall');
        expect(result).toMatchObject({ sourceId: 'uverworld.jp:news:1', tags: ['vs'], countryCode: null });
        expect(result.original.venueName).toBe('韓国・Fixture Hall');
        expect(result.tags).not.toContain('birthday');
    });

    it('公式とsetlist.fmの原文を別々に保持し、公式の国不明で他の国候補を消さない', async () => {
        stored.candidates = mergeCandidateSources({}, buildSetlistCandidates(fixture()));
        const official = buildOfficialCandidates({ sourceId: '1', title: '生誕祭', date: '2020-12-21',
            detailUrl: 'https://www.uverworld.jp/schedule/detail/1' });
        const result = await saveMetadataCandidates(client, 42, official);
        expect(Object.keys(result.candidates.sources)).toEqual(expect.arrayContaining(['uverworld.jp:1', 'setlistfm:fixture']));
        expect(result.candidates.sourceId).toBe('uverworld.jp:1');
        expect(result.candidates.countryCode).toBe('KR');
        expect(result.candidates.tags).toEqual(['mens', 'birthday', 'christmas', 'vs']);
        expect(result.candidates.sources['setlistfm:fixture'].original.info).toBe('UVERworld VS Fixture Artist');
    });

    it('国候補の不一致を保持し、公式を候補の優先値にするが確定しない', () => {
        const first = mergeCandidateSources({}, { sourceId: 'setlistfm:1', countryCode: 'JP', tags: [] });
        const merged = mergeCandidateSources(first, { sourceId: 'uverworld.jp:1', countryCode: 'KR', tags: [] });
        expect(merged.countryCode).toBe('KR');
        expect(merged.conflicts).toEqual([{ field: 'countryCode', values: ['KR', 'JP'] }]);
        expect(effectiveMetadata(merged, {}).country.status).toBe('unreviewed');
    });

    it('公式再取得は公式候補だけ置換し、別取得元のタグと手動除外を保持する', async () => {
        stored.candidates = mergeCandidateSources(
            mergeCandidateSources({}, { sourceId: 'setlistfm:1', tags: ['mens'], countryCode: 'KR' }),
            { sourceId: 'uverworld.jp:1', tags: ['birthday'], countryCode: null },
        );
        stored.overrides = { tagOverrides: { remove: ['mens'], add: [] } };
        const result = await saveMetadataCandidates(client, 42, { sourceId: 'uverworld.jp:1', tags: ['vs'] });
        expect(result.candidates.tags).toEqual(['mens', 'vs']);
        expect(effectiveMetadata(result.candidates, result.overrides).tags).toEqual(['vs']);
    });

    it('従来の単一候補を失わず、取得元別保存に移行する', () => {
        const legacy = { sourceId: 'setlistfm:old', tags: ['christmas'], original: { info: 'Xmas' } };
        const merged = mergeCandidateSources(legacy, { sourceId: 'uverworld.jp:1', tags: ['vs'] });
        expect(merged.sources['setlistfm:old']).toEqual(legacy);
        expect(merged.tags).toEqual(['christmas', 'vs']);
    });

    it('特殊な出典IDでもプロトタイプを書き換えない', () => {
        const merged = mergeCandidateSources({}, { sourceId: '__proto__', tags: ['vs'] });
        expect(Object.prototype.hasOwnProperty.call(merged.sources, '__proto__')).toBe(true);
        expect(Object.getPrototypeOf(merged.sources)).toBe(Object.prototype);
    });

    it('再取得で手動確定の共演者・役割を変更しない', async () => {
        stored.overrides = { participants: { items: [{ artistId: 10, role: 'guest' }] } };
        const result = await saveMetadataCandidates(client, 42, buildSetlistCandidates(fixture()));
        expect(result.overrides).toEqual(stored.overrides);
        expect(effectiveMetadata(result.candidates, result.overrides).participants.status).toBe('confirmed');
        expect(client.query.mock.calls.some(([sql]) => sql.includes('live_collaborators'))).toBe(false);
    });

    it('存在しない公演には候補を保存しない', async () => {
        client.query.mockResolvedValue({ rows: [] });
        await expect(saveMetadataCandidates(client, 42, {})).rejects.toMatchObject({ statusCode: 404 });
        expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
    });
});
