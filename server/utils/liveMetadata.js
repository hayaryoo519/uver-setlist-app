const { validateParticipants } = require('./liveArtists');
const TAGS = ['mens', 'womens', 'birthday', 'christmas', 'anniversary', 'vs'];
const MEMBERS = ['takuya', 'katsuya', 'akira', 'nobuto', 'shintaro', 'seika'];
const COUNTRIES = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));

function bad(message) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
}
function object(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) bad(`${field} must be an object`);
}
function keys(value, allowed) {
    for (const key of Object.keys(value)) if (!allowed.includes(key)) bad(`Unknown field: ${key}`);
}
function list(value, allowed, field) {
    if (!Array.isArray(value) || value.length > allowed.length || value.some(v => !allowed.includes(v))) bad(`Invalid ${field}`);
    return [...new Set(value)];
}
function country(value) {
    if (value === null) return null;
    if (typeof value !== 'string' || !COUNTRIES.has(value.toUpperCase())) bad('Invalid countryCode');
    return value.toUpperCase();
}
function text(value, field, max = 2000) {
    if (value === null) return null;
    if (typeof value !== 'string' || value.length > max) bad(`Invalid ${field}`);
    return value;
}
function url(value) {
    if (value === null) return null;
    text(value, 'sourceUrl');
    try {
        if (!['https:', 'http:'].includes(new URL(value).protocol)) bad('Invalid sourceUrl');
    } catch { bad('Invalid sourceUrl'); }
    return value;
}

function validateCandidates(value) {
    object(value, 'candidates');
    keys(value, ['tags', 'countryCode', 'memberIds', 'sourceId', 'sourceUrl', 'ruleVersion', 'original']);
    if (Buffer.byteLength(JSON.stringify(value)) > 65536) bad('Candidates exceed 64KB');
    const result = {};
    if ('tags' in value) result.tags = list(value.tags, TAGS, 'tags');
    if ('countryCode' in value) result.countryCode = country(value.countryCode);
    if ('memberIds' in value) result.memberIds = list(value.memberIds, MEMBERS, 'memberIds');
    if ('sourceId' in value) result.sourceId = text(value.sourceId, 'sourceId', 200);
    if ('sourceUrl' in value) result.sourceUrl = url(value.sourceUrl);
    if ('ruleVersion' in value) {
        if (!Number.isSafeInteger(value.ruleVersion) || value.ruleVersion < 1) bad('Invalid ruleVersion');
        result.ruleVersion = value.ruleVersion;
    }
    if ('original' in value) {
        object(value.original, 'original');
        result.original = value.original;
    }
    return result;
}

// nullは手動設定の解除。確定した「なし」は値を空にしたオブジェクト。
function validateManual(value) {
    object(value, 'manual patch');
    keys(value, ['tagOverrides', 'country', 'members', 'participants', 'classification']);
    const result = {};
    for (const [key, setting] of Object.entries(value)) {
        if (setting === null) { result[key] = null; continue; }
        object(setting, key);
        if (key === 'tagOverrides') {
            keys(setting, ['add', 'remove']);
            const add = list(setting.add || [], TAGS, 'tag additions');
            const remove = list(setting.remove || [], TAGS, 'tag exclusions');
            if (add.some(tag => remove.includes(tag))) bad('Tag cannot be both added and excluded');
            result[key] = { add, remove };
        } else if (key === 'country') {
            keys(setting, ['code']);
            const code = country(setting.code);
            if (!code) bad('Confirmed country requires a code');
            result[key] = { code };
        } else if (key === 'participants') {
            result[key] = validateParticipants(setting);
        } else if (key === 'members') {
            keys(setting, ['ids']);
            result[key] = { ids: list(setting.ids, MEMBERS, 'memberIds') };
        } else {
            keys(setting, ['needsReview', 'note']);
            if (typeof setting.needsReview !== 'boolean') bad('Invalid needsReview');
            result[key] = { needsReview: setting.needsReview, note: text(setting.note ?? null, 'note') };
        }
    }
    return result;
}

function mergeManual(current, patch) {
    const result = { ...current };
    for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete result[key];
        else result[key] = value;
    }
    return result;
}
/** 取得元ごとの候補を保持し、補完可能な項目のみ集約する。 */
function mergeCandidateSources(current = {}, patch = {}) {
    const sources = Object.assign(Object.create(null), current.sources || {});
    if (!current.sources && Object.keys(current).length) {
        sources[current.sourceId || 'legacy'] = { ...current };
    }
    const priority = key => key.startsWith('uverworld.jp:') ? 0 : key.startsWith('setlistfm:') ? 1 : 2;
    const orderedKeys = () => Object.keys(sources).sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
    // nullableなsourceIdではなく、保持されたsnapshotのキーで省略更新先を決める。
    const key = patch.sourceId || orderedKeys()[0] || 'legacy';
    sources[key] = { ...(sources[key] || {}), ...patch };
    if (Object.keys(sources).length > 16 || Buffer.byteLength(JSON.stringify(sources)) > 262144) {
        bad('Too many metadata sources or source data exceeds 256KB');
    }
    const ordered = orderedKeys();
    const primary = sources[ordered[0]] || {};
    const tags = new Set(ordered.flatMap(key => sources[key].tags || []));
    const members = new Set(ordered.flatMap(key => sources[key].memberIds || []));
    return {
        ...primary,
        // タグ省略は旧公演の名称fallbackを維持。明示tags: []だけがそれを抑制する。
        ...(ordered.some(key => Object.prototype.hasOwnProperty.call(sources[key], 'tags'))
            ? { tags: TAGS.filter(tag => tags.has(tag)) } : {}),
        memberIds: MEMBERS.filter(member => members.has(member)),
        // 国不明の公式情報で、他の取得元の国候補を消さない。
        countryCode: ordered.map(key => sources[key].countryCode).find(Boolean) || null,
        conflicts: [...new Set(ordered.map(key => sources[key].countryCode).filter(Boolean))].length > 1
            ? [{ field: 'countryCode', values: [...new Set(ordered.map(key => sources[key].countryCode).filter(Boolean))] }] : [],
        sources: { ...sources },
    };
}

function effectiveMetadata(candidates = {}, overrides = {}) {
    const tags = new Set(candidates.tags || []);
    // 手動確定済みの対象メンバーは、再取得で名称が変わっても生誕祭の根拠になる。
    if (overrides.members?.ids?.length) tags.add('birthday');
    const hasOpponent = overrides.participants?.items?.some(item => item.role === 'co_headliner');
    if (hasOpponent) tags.add('vs');
    for (const tag of overrides.tagOverrides?.add || []) tags.add(tag);
    for (const tag of overrides.tagOverrides?.remove || []) tags.delete(tag);
    const confirmedCountry = overrides.country?.code || null;
    if (confirmedCountry && confirmedCountry !== 'JP') tags.add('overseas');
    if (overrides.members?.ids?.length && !tags.has('birthday')) bad('Birthday members require birthday tag');
    if (hasOpponent && !tags.has('vs')) bad('Confirmed opponents require vs tag');
    return {
        tags: [...TAGS, 'overseas'].filter(tag => tags.has(tag)),
        country: { code: confirmedCountry, status: confirmedCountry ? 'confirmed' : 'unreviewed' },
        members: { ids: overrides.members?.ids || [], status: overrides.members ? 'confirmed' : 'unreviewed' },
        participants: { items: overrides.participants?.items || [], status: overrides.participants ? 'confirmed' : 'unreviewed' },
        classification: overrides.classification || { needsReview: false, note: null },
    };
}

module.exports = { validateCandidates, validateManual, mergeManual, mergeCandidateSources, effectiveMetadata };
