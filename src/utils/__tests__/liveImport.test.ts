import { describe, expect, it } from 'vitest';
import { buildLiveMetadataCandidates, createSetlistLivePayload, prepareSetlistImport } from '../liveImport';

const fixture = (overrides = {}) => ({
    id: 'fixture', eventDate: '21-12-2020', tour: { name: 'Fixture Tour' },
    venue: { name: 'Fixture Hall', city: { country: { code: 'KR' } } },
    info: 'Fixture description', url: 'https://example.test/live', ...overrides,
});

describe('取得原文と属性候補', () => {
    it('原文を独立したスナップショットとして保持し、入力を変更しない', () => {
        const raw = fixture();
        const prepared = prepareSetlistImport(raw);
        expect(prepared.original).toEqual(raw);
        expect(prepared.original).not.toBe(raw);
        raw.tour.name = 'Changed';
        expect(prepared.original.tour.name).toBe('Fixture Tour');
        expect(prepared.metadataCandidates).toMatchObject({
            sourceId: 'fixture', sourceUrl: 'https://example.test/live',
            countryCode: 'KR', status: 'unreviewed', ruleVersion: 1,
        });
    });

    it('誕生日と同日でも生誕祭や対象メンバーを生成しない', () => {
        const prepared = prepareSetlistImport(fixture());
        expect(prepared.specialNote).toBe('Fixture description');
        expect(prepared.metadataCandidates.tags).not.toContain('birthday');
        expect(prepared.suggestedType).toBe('HALL');
    });

    it('年末の幕張でもCOUNTDOWN JAPANを捏造しない', () => {
        const prepared = prepareSetlistImport(fixture({
            eventDate: '29-12-2020', tour: undefined, info: undefined,
            venue: { name: 'Makuhari Messe' },
        }));
        expect(prepared.tour.name).toBe('');
        expect(prepared.specialNote).toBeNull();
        expect(prepared.metadataCandidates.tags).toEqual([]);
        expect(prepared.suggestedType).not.toBe('FESTIVAL');
    });

    it('取得した名称に明示されたフェスは種別候補に反映する', () => {
        const prepared = prepareSetlistImport(fixture({ tour: { name: 'ROCK IN JAPAN FESTIVAL' } }));
        expect(prepared.suggestedType).toBe('FESTIVAL');
        expect(prepared.original.tour.name).toBe('ROCK IN JAPAN FESTIVAL');
    });

    it('名称と説明から候補を生成し、対象や対バン相手は勝手に確定しない', () => {
        const prepared = prepareSetlistImport(fixture({
            tour: { name: 'UVERworld 男祭り' }, info: 'TAKUYA∞ 生誕祭 / UVERworld vs Fixture Artist',
        }));
        expect(prepared.metadataCandidates.tags).toEqual(['mens', 'vs', 'birthday']);
        expect(prepared.original.info).toBe(prepared.specialNote);
        expect(prepared.metadataCandidates).not.toHaveProperty('confirmedArtists');
    });

    it('追加要求に取得原文を含めるが曲・投稿者情報は含めない', () => {
        const raw = fixture({ tour: undefined, sets: { set: [] }, user: { name: 'private' } });
        const payload = createSetlistLivePayload(prepareSetlistImport(raw));
        expect(payload.metadata_source).toMatchObject({ type: 'setlistfm', original: {
            id: 'fixture', tour: { name: null }, info: 'Fixture description',
            venue: { city: { country: { code: 'KR' } } },
        } });
        expect(payload.tour_name).toBe('Fixture description');
        expect(payload.metadata_source.original).not.toHaveProperty('sets');
        expect(payload.metadata_source.original).not.toHaveProperty('user');
    });

    it('未知の企画の説明を落とさず、空値は未確認のまま扱う', () => {
        const prepared = prepareSetlistImport(fixture({ tour: undefined, info: '未知の特別企画' }));
        expect(prepared.tour.name).toBe('未知の特別企画');
        expect(prepared.specialNote).toBe('未知の特別企画');
        expect(prepared.metadataCandidates.tags).toEqual([]);
        expect(buildLiveMetadataCandidates({})).toMatchObject({
            tags: [], countryCode: null, sourceId: null, sourceUrl: null, status: 'unreviewed',
        });
    });
});
