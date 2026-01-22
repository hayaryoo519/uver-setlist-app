const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

// Correction types
const VALID_CORRECTION_TYPES = ['setlist', 'venue', 'date', 'title', 'missing_live', 'other'];

// Rate limit constants
const RATE_LIMIT_SAME_LIVE_HOURS = 24;
const RATE_LIMIT_DAILY_MAX = 5;
const MIN_DESCRIPTION_LENGTH = 20;

/**
 * POST /api/corrections
 * Create a new correction request
 * Requires authentication
 */
router.post('/', authorize, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { live_id, live_date, live_venue, live_title, correction_type, description, suggested_data } = req.body;

        // Validate required fields
        if (!correction_type || !description) {
            return res.status(400).json({
                message: '修正対象と詳細説明は必須です'
            });
        }

        // Validate correction_type
        if (!VALID_CORRECTION_TYPES.includes(correction_type)) {
            return res.status(400).json({
                message: `無効な修正対象です。有効な値: ${VALID_CORRECTION_TYPES.join(', ')}`
            });
        }

        // Validate description length
        if (description.length < MIN_DESCRIPTION_LENGTH) {
            return res.status(400).json({
                message: `詳細説明は${MIN_DESCRIPTION_LENGTH}文字以上で入力してください`
            });
        }

        // Rate limit check: Same live within 24 hours
        if (live_id) {
            const sameLiveCheck = await db.query(`
                SELECT COUNT(*) FROM corrections 
                WHERE user_id = $1 
                AND live_id = $2 
                AND created_at > NOW() - INTERVAL '${RATE_LIMIT_SAME_LIVE_HOURS} hours'
            `, [userId, live_id]);

            if (parseInt(sameLiveCheck.rows[0].count) > 0) {
                return res.status(429).json({
                    message: `このライブへの修正依頼は${RATE_LIMIT_SAME_LIVE_HOURS}時間以内に既に送信されています`
                });
            }
        }

        // Rate limit check: Daily limit (5 per day)
        const dailyCheck = await db.query(`
            SELECT COUNT(*) FROM corrections 
            WHERE user_id = $1 
            AND created_at > NOW() - INTERVAL '24 hours'
        `, [userId]);

        if (parseInt(dailyCheck.rows[0].count) >= RATE_LIMIT_DAILY_MAX) {
            return res.status(429).json({
                message: `1日あたりの修正依頼上限（${RATE_LIMIT_DAILY_MAX}件）に達しました。24時間後に再度お試しください`
            });
        }

        // Insert correction
        const result = await db.query(`
            INSERT INTO corrections (user_id, live_id, live_date, live_venue, live_title, correction_type, description, suggested_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [userId, live_id || null, live_date || null, live_venue || null, live_title || null, correction_type, description, suggested_data || null]);

        console.log(`[CORRECTIONS] New correction #${result.rows[0].id} by user ${userId}`);

        res.status(201).json({
            success: true,
            correction_id: result.rows[0].id,
            message: '修正依頼を送信しました。ご協力ありがとうございます！'
        });

    } catch (err) {
        console.error('[CORRECTIONS] Error creating correction:', err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

/**
 * GET /api/corrections
 * Get all correction requests (admin only)
 * Query params: status, live_id, user_id, page, limit
 */
router.get('/', authorize, adminCheck, async (req, res) => {
    try {
        const { status, live_id, user_id, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.*,
                u.username as submitter_name,
                u.email as submitter_email,
                l.tour_name as live_tour_name,
                l.venue as live_venue_db,
                l.date as live_date_db,
                r.username as reviewer_name
            FROM corrections c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN lives l ON c.live_id = l.id
            LEFT JOIN users r ON c.reviewed_by = r.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (live_id) {
            query += ` AND c.live_id = $${paramIndex}`;
            params.push(live_id);
            paramIndex++;
        }

        if (user_id) {
            query += ` AND c.user_id = $${paramIndex}`;
            params.push(user_id);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) FROM corrections c WHERE 1=1`;
        const countParams = [];
        let countParamIndex = 1;

        if (status) {
            countQuery += ` AND c.status = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }
        if (live_id) {
            countQuery += ` AND c.live_id = $${countParamIndex}`;
            countParams.push(live_id);
            countParamIndex++;
        }
        if (user_id) {
            countQuery += ` AND c.user_id = $${countParamIndex}`;
            countParams.push(user_id);
            countParamIndex++;
        }

        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            corrections: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (err) {
        console.error('[CORRECTIONS] Error fetching corrections:', err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

/**
 * GET /api/corrections/stats
 * Get correction statistics (admin only)
 */
router.get('/stats', authorize, adminCheck, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                status, 
                COUNT(*) as count 
            FROM corrections 
            GROUP BY status
        `);

        const totalResult = await db.query(`SELECT COUNT(*) FROM corrections`);

        res.json({
            byStatus: stats.rows.reduce((acc, row) => {
                acc[row.status] = parseInt(row.count);
                return acc;
            }, {}),
            total: parseInt(totalResult.rows[0].count)
        });

    } catch (err) {
        console.error('[CORRECTIONS] Error fetching stats:', err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

/**
 * PATCH /api/corrections/:id
 * Update correction status (admin only)
 */
router.patch('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_note } = req.body;
        const reviewerId = req.user.user_id;

        // Validate status
        const validStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `無効なステータスです。有効な値: ${validStatuses.join(', ')}`
            });
        }

        // Check if correction exists
        const existing = await db.query('SELECT * FROM corrections WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: '修正依頼が見つかりません' });
        }

        // Update correction
        const result = await db.query(`
            UPDATE corrections 
            SET 
                status = COALESCE($1, status),
                admin_note = COALESCE($2, admin_note),
                reviewed_at = NOW(),
                reviewed_by = $3
            WHERE id = $4
            RETURNING *
        `, [status || null, admin_note || null, reviewerId, id]);

        console.log(`[CORRECTIONS] Correction #${id} updated by admin ${reviewerId}: status=${status}`);

        res.json({
            success: true,
            correction: result.rows[0],
            message: 'ステータスを更新しました'
        });

    } catch (err) {
        console.error('[CORRECTIONS] Error updating correction:', err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

/**
 * DELETE /api/corrections/:id
 * Delete a correction (admin only)
 */
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM corrections WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '修正依頼が見つかりません' });
        }

        console.log(`[CORRECTIONS] Correction #${id} deleted by admin ${req.user.user_id}`);

        res.json({ success: true, message: '修正依頼を削除しました' });

    } catch (err) {
        console.error('[CORRECTIONS] Error deleting correction:', err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;
