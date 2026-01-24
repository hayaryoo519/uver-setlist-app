const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');

// すべてのエンドポイントで管理者認証が必要
router.use(authorize);
router.use(adminCheck);

// 最新10件のログ取得（毎日チェック用）
router.get('/recent', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id,
                timestamp,
                event_type,
                message,
                user_email,
                ip_address
            FROM security_logs
            ORDER BY timestamp DESC
            LIMIT 10
        `);

        res.json({ logs: result.rows });
    } catch (err) {
        console.error('Error fetching recent logs:', err);
        res.status(500).json({ message: 'ログの取得に失敗しました' });
    }
});

// 週間分析データ取得
router.get('/analysis', async (req, res) => {
    try {
        // 過去7日間の統計
        const stats = await db.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT ip_address) as unique_ips
            FROM security_logs
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY event_type
            ORDER BY count DESC
        `);

        // 今日のログイン失敗数
        const todayFailures = await db.query(`
            SELECT COUNT(*) as count
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND DATE(timestamp) = CURRENT_DATE
        `);

        // 疑わしいIPアドレス（過去24時間で5回以上失敗）
        const suspiciousIPs = await db.query(`
            SELECT 
                ip_address,
                COUNT(*) as failed_attempts,
                array_agg(DISTINCT user_email) as targeted_emails,
                MIN(timestamp) as first_attempt,
                MAX(timestamp) as last_attempt
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY ip_address
            HAVING COUNT(*) >= 5
            ORDER BY failed_attempts DESC
        `);

        // 最も攻撃されているメールアドレス
        const targetedEmails = await db.query(`
            SELECT 
                user_email,
                COUNT(*) as attack_count
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '7 days'
                AND user_email IS NOT NULL
            GROUP BY user_email
            ORDER BY attack_count DESC
            LIMIT 5
        `);

        // 総ログ数
        const totalLogs = await db.query(`
            SELECT COUNT(*) as count FROM security_logs
        `);

        res.json({
            stats: stats.rows,
            todayFailures: parseInt(todayFailures.rows[0].count),
            suspiciousIPs: suspiciousIPs.rows,
            targetedEmails: targetedEmails.rows,
            totalLogs: parseInt(totalLogs.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching analysis data:', err);
        res.status(500).json({ message: '分析データの取得に失敗しました' });
    }
});

// 古いログの削除（30日以上前）
router.delete('/cleanup', async (req, res) => {
    try {
        const result = await db.query(`
            DELETE FROM security_logs
            WHERE timestamp < NOW() - INTERVAL '30 days'
            RETURNING id
        `);

        console.log(`Deleted ${result.rowCount} old security logs`);

        res.json({
            message: `${result.rowCount}件のログを削除しました`,
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Error cleaning up logs:', err);
        res.status(500).json({ message: 'ログの削除に失敗しました' });
    }
});

module.exports = router;
