const { effectiveLiveMetadata } = require('./liveMetadataProjection');

/** 要確認の理由だけを返す。原文・国候補値・管理メモ・履歴は一覧へ送らない。 */
function metadataReviewSummary(live, candidates = {}, overrides = {}, revision = 0) {
    const effective = effectiveLiveMetadata(live, candidates, overrides);
    const unconfirmedFields = [];
    if (effective.country.status === 'unreviewed') unconfirmedFields.push('country');
    if (effective.tags.includes('birthday') && effective.members.status === 'unreviewed') unconfirmedFields.push('members');
    if (effective.tags.includes('vs') && effective.participants.status === 'unreviewed') unconfirmedFields.push('participants');
    const conflict = (candidates.conflicts || []).some(item => item.field === 'countryCode' && new Set(item.values || []).size > 1);
    return {
        liveId: Number(live.id), revision,
        unconfirmedFields, hasUnconfirmed: unconfirmedFields.length > 0,
        countryConflict: !conflict ? 'none' : effective.country.status === 'confirmed' ? 'confirmed' : 'unresolved',
        needsClassificationReview: effective.classification.needsReview,
    };
}
module.exports = { metadataReviewSummary };
