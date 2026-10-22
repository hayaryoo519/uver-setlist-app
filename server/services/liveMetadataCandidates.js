const { isDeepStrictEqual } = require('node:util');
const { validateCandidates, mergeCandidateSources, effectiveMetadata } = require('../utils/liveMetadata');

const tagRules = require('../utils/liveTagRules.json');
// フェスは既存の公演種別。候補保存の編集タグには含めない。
const PATTERNS = Object.fromEntries(Object.entries(tagRules.patterns)
    .filter(([tag]) => tag !== 'festival').map(([tag, pattern]) => [tag, new RegExp(pattern)]));

function detectMetadataTags(...values) {
    const texts = values.map(value => (typeof value === 'string' ? value : '').normalize('NFKC').toLowerCase());
    return Object.keys(PATTERNS).filter(tag => texts.some(text => PATTERNS[tag].test(text)));
}

/** 保存に必要なsetlist.fm公演原文のみを抽出。曲一覧・投稿者情報等は保存しない。 */
function buildSetlistCandidates(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        const error = new Error('Invalid setlist source');
        error.statusCode = 400;
        throw error;
    }
    const original = {
        id: raw.id ?? null,
        eventDate: raw.eventDate ?? null,
        tourName: raw.tour?.name ?? null,
        info: raw.info ?? null,
        venueName: raw.venue?.name ?? null,
        countryCode: raw.venue?.city?.country?.code ?? null,
        url: raw.url ?? null,
    };
    for (const value of Object.values(original)) {
        if (value !== null && (typeof value !== 'string' || value.length > 10000)) {
            const error = new Error('Invalid setlist source field');
            error.statusCode = 400;
            throw error;
        }
    }
    return validateCandidates({
        tags: detectMetadataTags(original.tourName, original.info),
        memberIds: [], // メンバーや共演者を日付・自由記述だけで確定しない。
        countryCode: original.countryCode ? original.countryCode.toUpperCase() : null,
        sourceId: original.id ? `setlistfm:${original.id}` : null,
        sourceUrl: original.url,
        ruleVersion: tagRules.ruleVersion,
        original,
    });
}

/** 呼び出し元のトランザクション内で保存。手動設定は一切更新しない。 */
async function saveMetadataCandidates(client, liveId, input, actorId = null) {
    const patch = validateCandidates(input);
    const live = await client.query('SELECT id FROM lives WHERE id = $1 FOR UPDATE', [liveId]);
    if (!live.rows.length) {
        const error = new Error('Live not found');
        error.statusCode = 404;
        throw error;
    }
    const result = await client.query('SELECT * FROM live_metadata WHERE live_id = $1', [liveId]);
    const before = result.rows[0] || { live_id: liveId, candidates: {}, overrides: {}, revision: 0 };
    const candidates = mergeCandidateSources(before.candidates, patch);
    // 同一原文・同一辞書ならrevision/履歴を増やさない。
    if (isDeepStrictEqual(candidates, before.candidates)) return { ...before, changed: false };
    const after = { ...before, candidates, revision: before.revision + 1 };
    effectiveMetadata(after.candidates, after.overrides);
    await client.query(
        `INSERT INTO live_metadata (live_id, candidates, overrides, revision)
         VALUES ($1, $2::jsonb, $3::jsonb, $4)
         ON CONFLICT (live_id) DO UPDATE SET candidates = EXCLUDED.candidates,
         revision = EXCLUDED.revision, updated_at = NOW()`,
        [liveId, JSON.stringify(after.candidates), JSON.stringify(after.overrides), after.revision],
    );
    await client.query(
        `INSERT INTO live_metadata_history (live_id, actor_id, operation, before_state, after_state)
         VALUES ($1, $2, 'candidates', $3::jsonb, $4::jsonb)`,
        [liveId, actorId, JSON.stringify(before), JSON.stringify(after)],
    );
    return { ...after, changed: true };
}

/** 公式から解析済みの名称・出典を候補化。国は会場/タイムゾーンから推測しない。 */
function buildOfficialCandidates(entry, venueName = null) {
    const original = {
        sourceId: entry.sourceId,
        date: entry.date,
        title: entry.title,
        performanceTitle: entry.performanceTitle || null,
        category: entry.category || null,
        detailUrl: entry.detailUrl,
        venueName,
    };
    return validateCandidates({
        tags: detectMetadataTags(entry.title, entry.performanceTitle),
        memberIds: [],
        countryCode: null,
        sourceId: `uverworld.jp:${entry.sourceId}`,
        sourceUrl: entry.detailUrl,
        ruleVersion: tagRules.ruleVersion,
        original,
    });
}

module.exports = { detectMetadataTags, buildSetlistCandidates, buildOfficialCandidates, saveMetadataCandidates };
