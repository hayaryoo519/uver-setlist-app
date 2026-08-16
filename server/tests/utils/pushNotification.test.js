jest.mock('../../db');
jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({}),
}));

const originalEnv = { ...process.env };
process.env.VAPID_PUBLIC_KEY = 'test-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

const webpush = require('web-push');
const db = require('../../db');
const { notifyAdmins } = require('../../utils/pushNotification');

const ADMIN_SUBS = [
    { endpoint: 'https://push.example/admin1', p256dh: 'k1', auth: 'a1' },
    { endpoint: 'https://push.example/admin2', p256dh: 'k2', auth: 'a2' },
];

describe('notifyAdmins', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        webpush.sendNotification.mockResolvedValue({});
    });

    afterAll(() => {
        process.env = { ...originalEnv };
    });

    // 収集の運用通知はユーザー向けではないため、管理者に絞れていることが要件
    it('管理者の購読だけを対象にすること', async () => {
        db.query.mockResolvedValue({ rows: ADMIN_SUBS });

        await notifyAdmins({ title: 'T', body: 'B' });

        const [sql] = db.query.mock.calls[0];
        expect(sql).toContain('JOIN users');
        expect(sql).toContain("u.role = 'admin'");
        expect(sql).toContain('deleted_at IS NULL');
    });

    it('購読者全員に送信すること', async () => {
        db.query.mockResolvedValue({ rows: ADMIN_SUBS });

        const stats = await notifyAdmins({ title: 'タイトル', body: '本文', url: '/admin', type: 'test' });

        expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
        expect(stats).toEqual({ sent: 2, failed: 0 });

        const [subscription, payloadJson] = webpush.sendNotification.mock.calls[0];
        expect(subscription).toEqual({ endpoint: ADMIN_SUBS[0].endpoint, keys: { p256dh: 'k1', auth: 'a1' } });
        const payload = JSON.parse(payloadJson);
        expect(payload).toMatchObject({ title: 'タイトル', body: '本文', data: { url: '/admin', type: 'test' } });
    });

    it('管理者の購読が無ければ送信しないこと', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const stats = await notifyAdmins({ title: 'T', body: 'B' });

        expect(webpush.sendNotification).not.toHaveBeenCalled();
        expect(stats).toEqual({ sent: 0, failed: 0 });
    });

    // 期限切れの購読は溜まり続けるので掃除する
    it('410 が返った購読を削除すること', async () => {
        db.query.mockResolvedValue({ rows: [ADMIN_SUBS[0]] });
        const err = new Error('gone');
        err.statusCode = 410;
        webpush.sendNotification.mockRejectedValueOnce(err);

        const stats = await notifyAdmins({ title: 'T', body: 'B' });

        expect(stats).toEqual({ sent: 0, failed: 1 });
        const deleted = db.query.mock.calls.find(([sql]) => sql.includes('DELETE FROM push_subscriptions'));
        expect(deleted).toBeDefined();
    });

    // 通知は補助機能なので、失敗しても呼び出し元の処理を止めない
    it('DBエラーでも例外を投げないこと', async () => {
        db.query.mockRejectedValue(new Error('db down'));

        await expect(notifyAdmins({ title: 'T', body: 'B' })).resolves.toEqual({ sent: 0, failed: 0 });
    });
});
