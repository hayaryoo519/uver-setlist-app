const { effectiveMetadata } = require('../utils/liveMetadata');
const { detectMetadataTags } = require('./liveMetadataCandidates');

// 公開表示と管理レビューで旧公演の判定を統一する。明示的な空タグは尊重する。
function effectiveLiveMetadata(live, candidates = {}, overrides = {}) {
    const input = Object.prototype.hasOwnProperty.call(candidates, 'tags')
        ? candidates : { tags: detectMetadataTags(live.title, live.tour_name, live.special_note) };
    return effectiveMetadata(input, overrides);
}
module.exports = { effectiveLiveMetadata };
