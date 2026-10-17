import type { MetadataReviewSummary } from '../types/liveMetadata';

export const METADATA_REVIEW_FILTERS = [
    { id: 'ALL', label: 'すべて', query: 'all' },
    { id: 'UNCONFIRMED', label: '未確認', query: 'unconfirmed' },
    { id: 'CONFLICT', label: '取得元不一致', query: 'conflict' },
    { id: 'UNRESOLVED', label: '開催国未確定の不一致', query: 'unresolved' },
    { id: 'CLASSIFICATION', label: '分類検討', query: 'classification' },
] as const;
export type MetadataReviewFilter = typeof METADATA_REVIEW_FILTERS[number]['id'];
export const REVIEW_FIELD_LABELS = { country: '開催国', members: '生誕祭の対象メンバー', participants: '共演者' };
export function matchesMetadataReview(summary: MetadataReviewSummary | undefined, filter: MetadataReviewFilter) {
    if (filter === 'ALL') return true;
    if (!summary) return false;
    if (filter === 'UNCONFIRMED') return summary.hasUnconfirmed;
    if (filter === 'CONFLICT') return summary.countryConflict !== 'none';
    if (filter === 'UNRESOLVED') return summary.countryConflict === 'unresolved';
    return summary.needsClassificationReview;
}
export function parseMetadataReviewLink(params: URLSearchParams) {
    const value = params.get('metadata');
    const id = value && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
    return {
        initialMetadataId: id && Number.isSafeInteger(id) && id <= 2147483647 ? id : undefined,
        initialReviewFilter: METADATA_REVIEW_FILTERS.find(filter => filter.query === params.get('review'))?.id || 'ALL',
    };
}
