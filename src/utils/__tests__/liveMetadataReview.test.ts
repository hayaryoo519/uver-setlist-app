import { describe, expect, it } from 'vitest';
import { matchesMetadataReview, parseMetadataReviewLink } from '../liveMetadataReview';
import type { MetadataReviewSummary } from '../../types/liveMetadata';

describe('レビュー導線のURL入力', () => {
    it('通知の単件リンクと一覧フィルターを解釈する', () => {
        expect(parseMetadataReviewLink(new URLSearchParams('metadata=42&review=unconfirmed'))).toEqual({ initialMetadataId: 42, initialReviewFilter: 'UNCONFIRMED' });
        expect(parseMetadataReviewLink(new URLSearchParams('review=classification')).initialReviewFilter).toBe('CLASSIFICATION');
    });
    it.each(['0', '-1', '42oops', '1.5', '01', '2147483648', '999999999999999999999999'])('不正な公演IDを開かない %s', value => {
        expect(parseMetadataReviewLink(new URLSearchParams({ metadata: value })).initialMetadataId).toBeUndefined();
    });
    it('未知のフィルターは全公演へ戻す', () => {
        expect(parseMetadataReviewLink(new URLSearchParams('review=unknown')).initialReviewFilter).toBe('ALL');
    });
    it('未取得のレビューを確認済みと判定しない', () => {
        expect(matchesMetadataReview(undefined, 'UNCONFIRMED')).toBe(false);
        expect(matchesMetadataReview(undefined, 'ALL')).toBe(true);
    });
    it('国の手動確定後も不一致フィルターに残し、未確定とは区別する', () => {
        const summary: MetadataReviewSummary = { liveId: 42, revision: 1, hasUnconfirmed: false, unconfirmedFields: [], countryConflict: 'confirmed', needsClassificationReview: false };
        expect(matchesMetadataReview(summary, 'CONFLICT')).toBe(true);
        expect(matchesMetadataReview(summary, 'UNRESOLVED')).toBe(false);
        expect(matchesMetadataReview(summary, 'UNCONFIRMED')).toBe(false);
    });
});
