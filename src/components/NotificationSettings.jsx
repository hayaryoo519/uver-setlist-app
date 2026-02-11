import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, BellOff, Loader } from 'lucide-react';

/**
 * 通知設定コンポーネント
 * マイページなどに設置して、ユーザーが通知を有効/無効にできる
 */
export default function NotificationSettings() {
    const [permission, setPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 初期状態を確認
    useEffect(() => {
        checkSubscriptionStatus();
    }, []);

    const checkSubscriptionStatus = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setError('このブラウザでは通知機能を利用できません');
                setLoading(false);
                return;
            }

            setPermission(Notification.permission);

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('Subscription check error:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribe = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // 通知許可をリクエスト
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setError('通知の許可が拒否されました');
                setLoading(false);
                return;
            }

            // VAPID公開鍵を取得
            const keyRes = await fetch('/api/push/vapid-public-key');
            if (!keyRes.ok) {
                throw new Error('プッシュ通知の設定がサーバーで完了していません');
            }
            const { publicKey } = await keyRes.json();

            // Service Workerの準備を待つ
            const registration = await navigator.serviceWorker.ready;

            // プッシュ購読
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // サーバーに購読情報を送信
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.token = token;

            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers,
                body: JSON.stringify({ subscription })
            });

            if (!res.ok) {
                throw new Error('購読の登録に失敗しました');
            }

            setIsSubscribed(true);
        } catch (err) {
            console.error('Subscribe error:', err);
            setError(err.message || '通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // サーバーから削除
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });

                // ブラウザの購読を解除
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
        } catch (err) {
            console.error('Unsubscribe error:', err);
            setError(err.message || '通知の解除に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="notification-icon-btn loading">
                <Loader size={20} className="spin" />
            </div>
        );
    }

    return (
        <div className="notification-settings-compact">
            {error && <div className="notification-tooltip error">{error}</div>}

            <button
                className={`notification-icon-btn ${isSubscribed ? 'subscribed' : ''}`}
                onClick={isSubscribed ? unsubscribe : subscribe}
                title={isSubscribed ? '通知をオフにする' : 'クリックして通知を受け取る'}
                aria-label={isSubscribed ? '通知をオフにする' : '通知をオンにする'}
            >
                {isSubscribed ? (
                    <>
                        <BellRing size={24} className="icon active" />
                        <span className="status-badge">ON</span>
                    </>
                ) : (
                    <BellOff size={24} className="icon inactive" />
                )}
            </button>
        </div>
    );
}

// VAPID公開鍵をUint8Arrayに変換するユーティリティ
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
