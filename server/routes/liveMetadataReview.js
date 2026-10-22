const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const { metadataReviewSummary } = require('../services/liveMetadataReview');

router.get('/', authorize, adminCheck, async (req, res) => {
    try {
        // 大きな原文/取得元スナップショットや管理メモはDBからも取り出さない。
        const result = await db.query(`
            SELECT l.id, l.title, l.tour_name, l.special_note,
                   COALESCE(m.revision, 0) AS revision,
                   m.candidates ? 'tags' AS has_candidate_tags,
                   m.candidates->'tags' AS candidate_tags,
                   COALESCE(m.candidates->'conflicts', '[]'::jsonb) AS conflicts,
                   COALESCE(m.overrides, '{}'::jsonb) #- '{classification,note}' AS overrides
            FROM lives l LEFT JOIN live_metadata m ON m.live_id = l.id
            ORDER BY l.id
        `);
        res.json(result.rows.map(row => metadataReviewSummary(row, {
            ...(row.has_candidate_tags ? { tags: row.candidate_tags } : {}), conflicts: row.conflicts,
        }, row.overrides, row.revision)));
    } catch {
        res.status(500).json({ message: 'Failed to load metadata review summary' });
    }
});
module.exports = router;
