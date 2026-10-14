// カスタムService Worker拡張（vite-plugin-pwa の injectManifest と併用しない場合）
// このファイルは public/ に配置され、Workbox生成の sw.js とは別に push イベントを処理

// Push通知の受信
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body || '',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-192x192.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: [
                { action: 'open', title: '詳細を見る' },
                { action: 'close', title: '閉じる' }
            ],
            tag: data.data?.type || 'general',
            renotify: true
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'UVERworld Setlist Archive', options)
        );
    } catch (err) {
        console.error('Push event error:', err);
    }
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    // 通知データから外部origin/実行スキームへ誘導しない。
    let url = self.location.origin + '/';
    const target = event.notification.data?.url;
    if (typeof target === 'string') {
        try {
            const parsed = new URL(target, self.location.origin);
            if (parsed.origin === self.location.origin && ['http:', 'https:'].includes(parsed.protocol)) url = parsed.href;
        } catch { /* 不正なURLはホームへ戻す。 */ }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // 既に開いているタブがあればフォーカス
                for (const client of windowClients) {
                    // metadata=4がmetadata=42に一致する等の誤誘導を防ぐ。
                    // 別URLのタブはnavigateせず、未保存の編集を維持する。
                    if (client.url === url && 'focus' in client) {
                        // 同じURLでも、閉じたレビューを明示的に再開できるよう通知する。
                        if ('postMessage' in client) client.postMessage({ type: 'metadata-review-notification', url });
                        return client.focus();
                    }
                }
                // なければ新しいタブを開く
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
