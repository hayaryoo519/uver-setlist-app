import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationSettings from '../NotificationSettings';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        get: vi.fn().mockResolvedValue({ publicKey: 'test-key' }),
        post: vi.fn().mockResolvedValue({}),
    },
}));

const SUBSCRIPTION = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc' };

/**
 * Service Worker と PushManager を差し替える
 * @param {object|null} existing 既にブラウザに残っている購読
 */
function mockPushEnvironment(existing) {
    const getSubscription = vi.fn().mockResolvedValue(existing);

    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe: vi.fn() } }) },
    });
    window.PushManager = function PushManager() {};
    window.Notification = { permission: 'granted', requestPermission: vi.fn() };

    return { getSubscription };
}

describe('NotificationSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        delete window.PushManager;
        delete window.Notification;
    });

    // ブラウザに購読が残っていてもサーバー側とズレることがある。
    // その場合ボタンは「ON」表示になり押すと解除になるため、ユーザーが自力で直せない。
    it('既存の購読があればサーバーへ再登録して状態を揃えること', async () => {
        mockPushEnvironment(SUBSCRIPTION);

        render(<NotificationSettings />);

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/api/push/subscribe', { subscription: SUBSCRIPTION });
        });
    });

    it('購読が無ければ再登録しないこと', async () => {
        mockPushEnvironment(null);

        render(<NotificationSettings />);

        await waitFor(() => {
            expect(apiClient.post).not.toHaveBeenCalled();
        });
    });

    // 同期は補助的な処理なので、失敗しても画面を壊さない
    it('再登録に失敗しても例外を投げないこと', async () => {
        mockPushEnvironment(SUBSCRIPTION);
        apiClient.post.mockRejectedValueOnce(new Error('network error'));

        expect(() => render(<NotificationSettings />)).not.toThrow();

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalled();
        });
    });
});
