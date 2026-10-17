jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../utils/pushNotification', () => ({ notifyNewLive: jest.fn() }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { if (!req.header('token')) return res.sendStatus(403); req.user = { role: req.header('token') }; next(); },
    adminCheck: (req, res, next) => req.user.role === 'admin' ? next() : res.sendStatus(403),
}));
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const { metadataReviewSummary } = require('../../services/liveMetadataReview');
const app = express(); app.use('/api/lives', require('../../routes/lives'));
const live = { id: 42, title: null, tour_name: 'Fixture Tour', special_note: null };
const conflicts = [{ field: 'countryCode', values: ['JP', 'KR'] }];
beforeEach(() => { jest.clearAllMocks(); db.query.mockResolvedValue({ rows: [] }); });

describe('追加情報レビューの判定', () => {
    it('通常公演に生誕祭/共演者確認を要求せず、国は候補だけでは確定しない', () => {
        expect(metadataReviewSummary(live, { countryCode: 'JP' }).unconfirmedFields).toEqual(['country']);
    });
    it('旧公演の名称フォールバックと明示的な空タグを区別する', () => {
        const birthday = { ...live, tour_name: 'Birthday Live VS Fixture Artist' };
        expect(metadataReviewSummary(birthday).unconfirmedFields).toEqual(['country', 'members', 'participants']);
        expect(metadataReviewSummary(birthday, { tags: [] }).unconfirmedFields).toEqual(['country']);
    });
    it('対象/共演者なしと確認済みは未確認に含めない', () => {
        const result = metadataReviewSummary(live, { tags: ['birthday', 'vs'] }, {
            country: { code: 'JP' }, members: { ids: [] }, participants: { items: [] },
        }, 3);
        expect(result).toEqual({ liveId: 42, revision: 3, unconfirmedFields: [], hasUnconfirmed: false, countryConflict: 'none', needsClassificationReview: false });
    });
    it('手動除外した生誕祭の対象を未確認キューへ入れない', () => {
        expect(metadataReviewSummary(live, { tags: ['birthday'] }, { country: { code: 'JP' }, tagOverrides: { remove: ['birthday'] } }).unconfirmedFields).toEqual([]);
    });
    it('国の確定後も取得元不一致を残し、未確定の不一致と区別する', () => {
        expect(metadataReviewSummary(live, { conflicts }).countryConflict).toBe('unresolved');
        expect(metadataReviewSummary(live, { conflicts }, { country: { code: 'KR' } }).countryConflict).toBe('confirmed');
    });
    it('分類検討は独立した理由で、管理メモを返さない', () => {
        const result = metadataReviewSummary(live, { original: { info: 'PRIVATE ORIGINAL' } }, {
            country: { code: 'JP' }, classification: { needsReview: true, note: 'PRIVATE NOTE' },
        });
        expect(result.needsClassificationReview).toBe(true);
        expect(result.hasUnconfirmed).toBe(false);
        expect(JSON.stringify(result)).not.toMatch(/PRIVATE|overrides|original|note/);
    });
    it('新候補で対バンが判明したら共演者の未確認を表示する', () => {
        expect(metadataReviewSummary(live, { tags: ['vs'] }, { country: { code: 'JP' } }).unconfirmedFields).toEqual(['participants']);
    });
});
describe('GET /api/lives/metadata-review', () => {
    it.each(['', 'user'])('管理者以外には公開しない (%s)', async token => {
        expect((await request(app).get('/api/lives/metadata-review').set('token', token)).status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });
    it('ID詳細ルートより前で処理し、全公演を1クエリで判定する', async () => {
        db.query.mockResolvedValue({ rows: [{ ...live, revision: 2, has_candidate_tags: true, candidate_tags: ['vs'], conflicts,
            overrides: { classification: { needsReview: true, note: 'PRIVATE NOTE' } }, original: 'PRIVATE ORIGINAL' }] });
        const res = await request(app).get('/api/lives/metadata-review').set('token', 'admin');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ liveId: 42, revision: 2, hasUnconfirmed: true, unconfirmedFields: ['country', 'participants'], countryConflict: 'unresolved', needsClassificationReview: true }]);
        expect(db.query).toHaveBeenCalledTimes(1);
        expect(db.query.mock.calls[0][0]).toContain("#- '{classification,note}'");
        expect(res.text).not.toMatch(/PRIVATE|sources|overrides|note|original/);
    });
    it('公演なしは空配列を返す', async () => {
        expect((await request(app).get('/api/lives/metadata-review').set('token', 'admin')).body).toEqual([]);
    });
    it('取得失敗は件数0の成功に偽装せず、内部情報も返さない', async () => {
        db.query.mockRejectedValue(new Error('PRIVATE DB ERROR'));
        const res = await request(app).get('/api/lives/metadata-review').set('token', 'admin');
        expect(res.status).toBe(500);
        expect(res.text).not.toContain('PRIVATE');
    });
});
