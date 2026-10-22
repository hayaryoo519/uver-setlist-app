jest.mock('../../db', () => ({ query: jest.fn(), pool: { connect: jest.fn() } }));
jest.mock('../../utils/songTranslations', () => ({ normalizeVenueName: name => name }));
jest.mock('../../utils/pushNotification', () => ({ notifyNewLive: jest.fn().mockResolvedValue({}) }));
const request = require('supertest');
const express = require('express');
const db = require('../../db');
const { attachPublicLiveMetadata } = require('../../services/publicLiveMetadata');
const app = express();
app.use('/api/lives', require('../../routes/lives'));
const lives = [
    { id: 1, tour_name: 'Fixture 男祭り 生誕祭', title: null, date: '2020-12-21', venue: 'Fixture Hall', special_note: null },
    { id: 2, tour_name: 'Fixture Tour', title: null, date: '2020-08-01', venue: 'Fixture Hall', special_note: null },
    { id: 3, tour_name: 'Fixture Xmas', title: null, date: '2020-12-25', venue: 'Fixture Hall', special_note: null },
];
let metadata;
beforeEach(() => {
    jest.clearAllMocks();
    metadata = [
        { live_id: 1, candidates: { tags: ['mens', 'birthday'], countryCode: 'KR', original: { info: 'private original' },
            sources: { 'setlistfm:1': { original: { info: 'private source' } } }, conflicts: [{ field: 'countryCode', values: ['KR', 'JP'] }] },
            overrides: { tagOverrides: { add: ['vs'], remove: ['mens'] }, country: { code: 'JP' }, members: { ids: ['takuya'] },
                classification: { needsReview: true, note: 'private management memo' } } },
        { live_id: 2, candidates: { tags: [], countryCode: 'KR', memberIds: ['takuya'] }, overrides: {} },
    ];
    db.query.mockImplementation(async (sql, params) => {
        if (sql.includes('FROM live_metadata')) return { rows: metadata };
        if (sql.includes('FROM live_artists')) return { rows: [{ id: 10, name: 'Fixture Artist', aliases: ['FA'] }] };
        if (sql.includes('WITH filtered_lives')) return { rows: lives };
        if (sql.includes('FROM lives l WHERE id')) return { rows: lives.filter(live => live.id === Number(params[0])) };
        if (sql.includes('FROM setlists sl')) return { rows: [] };
        return { rows: [] };
    });
});

describe('公開ライブAPIの有効情報', () => {
    it('匿名でも手動追加/除外・確認済み国/メンバーを参照できる', async () => {
        const res = await request(app).get('/api/lives');
        expect(res.status).toBe(200);
        expect(res.body[0].tags).toEqual(['birthday', 'vs']);
        expect(res.body[0].metadata).toEqual({ country: { code: 'JP', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' }, participants: { items: [], status: 'unreviewed' } });
    });

    it('候補・原文・管理メモ・設定履歴を公開しない', async () => {
        const res = await request(app).get('/api/lives');
        const serialized = JSON.stringify(res.body);
        for (const field of ['candidates', 'overrides', 'sources', 'conflicts', 'classification', 'revision']) expect(res.body[0]).not.toHaveProperty(field);
        for (const text of ['private original', 'private source', 'private management memo']) expect(serialized).not.toContain(text);
        expect(res.body[0].metadata).not.toHaveProperty('classification');
    });

    it('未確認の国/メンバー候補は公開せず、海外属性を生成しない', async () => {
        const res = await request(app).get('/api/lives');
        expect(res.body[1].tags).toEqual([]);
        expect(res.body[1].metadata.country).toEqual({ code: null, status: 'unreviewed' });
        expect(res.body[1].metadata.members).toEqual({ ids: [], status: 'unreviewed' });
    });

    it('確認済みの海外開催国から海外属性を導出する', async () => {
        metadata[1].overrides.country = { code: 'KR' };
        const res = await request(app).get('/api/lives');
        expect(res.body[1].tags).toEqual(['overseas']);
        expect(res.body[1].metadata.country.code).toBe('KR');
    });

    it('未保存の旧公演はサーバーで名称から判定し、保存済み空タグは再判定しない', async () => {
        metadata[0] = { live_id: 1, candidates: { tags: [] }, overrides: {} };
        const res = await request(app).get('/api/lives');
        expect(res.body[0].tags).toEqual([]);
        expect(res.body[2].tags).toEqual(['christmas']);
        expect(res.body[2].metadata.country.status).toBe('unreviewed');
    });

    it('一覧と詳細で同じ有効情報を返す', async () => {
        const list = await request(app).get('/api/lives');
        const detail = await request(app).get('/api/lives/1');
        expect(detail.status).toBe(200);
        expect(detail.body.tags).toEqual(list.body[0].tags);
        expect(detail.body.metadata).toEqual(list.body[0].metadata);
        expect(JSON.stringify(detail.body)).not.toContain('private');
        expect(detail.body.setlist).toEqual([]);
    });

    it('一覧の属性は公演ごとの個別クエリでなく一括取得する', async () => {
        await request(app).get('/api/lives?include_setlists=true');
        const calls = db.query.mock.calls.filter(([sql]) => sql.includes('FROM live_metadata'));
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toEqual([[1, 2, 3]]);
        expect(db.query.mock.calls[0][0]).toContain('JSON_AGG');
    });

    it('確認済み共演者の正式名・別名・役割を返し、辞書は一括取得する', async () => {
        metadata[0].overrides.participants = { items: [{ artistId: 10, role: 'co_headliner' }, { artistId: 10, role: 'guest' }] };
        const res = await request(app).get('/api/lives');
        expect(res.body[0].metadata.participants).toEqual({ status: 'confirmed', items: [
            { artistId: 10, role: 'co_headliner', name: 'Fixture Artist', aliases: ['FA'] },
            { artistId: 10, role: 'guest', name: 'Fixture Artist', aliases: ['FA'] },
        ] });
        const calls = db.query.mock.calls.filter(([sql]) => sql.includes('FROM live_artists'));
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toEqual([[10]]);
    });

    it('確認済み共演者なしと未確認を公開APIでも区別する', async () => {
        metadata[0].overrides.participants = { items: [] };
        const res = await request(app).get('/api/lives');
        expect(res.body[0].metadata.participants).toEqual({ status: 'confirmed', items: [] });
        expect(res.body[1].metadata.participants).toEqual({ status: 'unreviewed', items: [] });
        expect(db.query.mock.calls.some(([sql]) => sql.includes('FROM live_artists'))).toBe(false);
    });

    it('公演なしでは属性クエリを実行しない', async () => {
        expect(await attachPublicLiveMetadata([])).toEqual([]);
        expect(db.query).not.toHaveBeenCalled();
        expect((await request(app).get('/api/lives/999')).status).toBe(404);
    });
});
