const webpush = require('web-push');
const db = require('../db');

// VAPID設定
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@uver-setlist-archive.org';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('Web Push: VAPID keys configured');
} else {
    console.warn('Web Push: VAPID keys not configured. Push notifications will not work.');
}

/**
 * 購読を保存
 */
async function saveSubscription(userId, subscription) {
    const { endpoint, keys } = subscription;
    const result = await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) 
         DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
         RETURNING id`,
        [userId, endpoint, keys.p256dh, keys.auth]
    );
    return result.rows[0];
}

/**
 * 購読を削除
 */
async function removeSubscription(endpoint) {
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

/**
 * 全購読者に通知を送信
 */
async function sendNotificationToAll(payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('Web Push: Cannot send - VAPID keys not configured');
        return { sent: 0, failed: 0 };
    }

    const result = await db.query('SELECT * FROM push_subscriptions');
    const subscriptions = result.rows;

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
            }
        };

        try {
            await webpush.sendNotification(
                pushSubscription,
                JSON.stringify(payload)
            );
            sent++;
        } catch (error) {
            console.error(`Push failed for ${sub.endpoint}:`, error.statusCode);
            // 410 Gone or 404 = 購読が無効
            if (error.statusCode === 410 || error.statusCode === 404) {
                await removeSubscription(sub.endpoint);
                console.log(`Removed invalid subscription: ${sub.endpoint}`);
            }
            failed++;
        }
    }

    console.log(`Push notifications: ${sent} sent, ${failed} failed`);
    return { sent, failed };
}

/**
 * 新ライブ追加通知を送信
 */
async function notifyNewLive(live) {
    // 日付をYYYY/MM/DD形式に整形
    let dateStr = live.date;
    try {
        const d = new Date(live.date);
        if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short'
            });
        }
    } catch (e) {
        console.error('Date parsing error:', e);
    }

    const payload = {
        title: '🎸 新しいライブ情報！',
        body: `${live.title || live.tour_name || 'ライブ'} (${dateStr})`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
            url: `/live/${live.id}`,
            type: 'new_live'
        }
    };

    return await sendNotificationToAll(payload);
}

/**
 * 購読リストへ Web Push を送る（無効な購読は削除する）
 */
async function sendToSubscriptions(subscriptions, payload) {
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload)
            );
            sent++;
        } catch (error) {
            console.error(`Push failed for ${sub.endpoint}:`, error.statusCode);
            if (error.statusCode === 410 || error.statusCode === 404) {
                await removeSubscription(sub.endpoint);
            }
            failed++;
        }
    }
    return { sent, failed };
}

/**
 * 管理者にだけ Web Push を送る。
 *
 * 収集の運用通知はユーザー向けではないため、購読を管理者ユーザーに絞る。
 * 通知は補助的な機能なので、失敗しても呼び出し元の処理は止めない。
 *
 * @param {{title: string, body: string, url?: string, type?: string}} params
 */
async function notifyAdmins({ title, body, url = '/admin', type = 'admin_alert' }) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[Push] VAPID キーが未設定のため管理者通知をスキップします');
        return { sent: 0, failed: 0 };
    }

    try {
        const result = await db.query(`
            SELECT ps.endpoint, ps.p256dh, ps.auth
            FROM push_subscriptions ps
            JOIN users u ON u.id = ps.user_id
            WHERE u.role = 'admin' AND u.deleted_at IS NULL
        `);

        if (result.rows.length === 0) {
            console.log('[Push] 管理者の購読がないため通知をスキップします');
            return { sent: 0, failed: 0 };
        }

        const stats = await sendToSubscriptions(result.rows, {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: { url, type },
        });
        console.log(`[Push] 管理者通知: ${stats.sent} 件送信 / ${stats.failed} 件失敗`);
        return stats;
    } catch (err) {
        console.error('[Push] 管理者通知に失敗しました:', err.message);
        return { sent: 0, failed: 0 };
    }
}

module.exports = {
    saveSubscription,
    removeSubscription,
    sendNotificationToAll,
    notifyNewLive,
    notifyAdmins,
    getVapidPublicKey: () => VAPID_PUBLIC_KEY
};
