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
            url: `/lives/${live.id}`,
            type: 'new_live'
        }
    };

    return await sendNotificationToAll(payload);
}

module.exports = {
    saveSubscription,
    removeSubscription,
    sendNotificationToAll,
    notifyNewLive,
    getVapidPublicKey: () => VAPID_PUBLIC_KEY
};
