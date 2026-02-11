const express = require('express');
const router = express.Router();
const pool = require('../db');
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

// 認証ミドルウェア（任意 - ログインユーザーのみ購読可能）
const authMiddleware = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const token = req.headers.token;
    if (!token) {
        // 未ログインでも購読可能にする場合は userId = null
        req.userId = null;
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        req.userId = null;
        next();
    }
};

/**
 * GET /api/push/vapid-public-key
 * VAPID公開鍵を返す（フロントエンドで購読時に使用）
 */
router.get('/vapid-public-key', (req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: key });
});

/**
 * POST /api/push/subscribe
 * プッシュ通知の購読を登録
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        const result = await saveSubscription(req.userId, subscription);
        res.status(201).json({ message: '購読を登録しました', id: result.id });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: '購読の登録に失敗しました' });
    }
});

/**
 * POST /api/push/unsubscribe
 * プッシュ通知の購読を解除
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        await removeSubscription(endpoint);
        res.json({ message: '購読を解除しました' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: '購読の解除に失敗しました' });
    }
});

// Manual trigger for new live notification (Admin only)
router.post('/notify-live', authorize, adminCheck, async (req, res) => {
    try {
        const { liveId } = req.body;
        const result = await db.query("SELECT * FROM lives WHERE id = $1", [liveId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Live not found" });
        }

        const live = result.rows[0];
        const pushResult = await notifyNewLive(live);

        res.json({
            message: "Notifications sent",
            details: pushResult
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
