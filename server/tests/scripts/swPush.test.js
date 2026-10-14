// 実Push配信/ブラウザ権限を使わず、配布するSWソースのイベント処理を検証する。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const origin = 'https://archive.example.invalid';
function worker() {
    const handlers = {};
    const clients = { matchAll: jest.fn().mockResolvedValue([]), openWindow: jest.fn().mockResolvedValue({}) };
    const self = { location: { origin }, registration: { showNotification: jest.fn().mockResolvedValue(undefined) },
        addEventListener: (name, callback) => { handlers[name] = callback; } };
    const logger = { error: jest.fn() };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../../public/sw-push.js'), 'utf8'), { self, clients, URL, console: logger });
    async function click(url, action = '') {
        const pending = [];
        const notification = { data: { url }, close: jest.fn() };
        handlers.notificationclick({ action, notification, waitUntil: promise => pending.push(promise) });
        await Promise.all(pending);
        expect(notification.close).toHaveBeenCalledTimes(1);
    }
    return { handlers, clients, self, logger, click };
}
describe('配布Service WorkerのPush/通知URL処理', () => {
    it('追加情報通知のURL/タグをnotification.dataへ保持する', async () => {
        const { handlers, self } = worker();
        const pending = [];
        const data = { title: 'Fixture', body: 'Fixture body', data: { type: 'metadata_review', url: '/admin?tab=lives&metadata=42' } };
        handlers.push({ data: { json: () => data }, waitUntil: promise => pending.push(promise) });
        await Promise.all(pending);
        expect(self.registration.showNotification).toHaveBeenCalledWith('Fixture', expect.objectContaining({ data: data.data, tag: 'metadata_review' }));
    });
    it('閉じるアクションではフォーカスも新規タブも開かない', async () => {
        const { clients, click } = worker();
        await click('/admin?tab=lives&metadata=42', 'close');
        expect(clients.matchAll).not.toHaveBeenCalled(); expect(clients.openWindow).not.toHaveBeenCalled();
    });
    it('単件URLと完全一致するタブだけをフォーカスする', async () => {
        const { clients, click } = worker(); const focus = jest.fn().mockResolvedValue({}); const postMessage = jest.fn();
        clients.matchAll.mockResolvedValue([{ url: origin + '/admin?tab=lives&metadata=42', focus, postMessage }]);
        await click('/admin?tab=lives&metadata=42', 'open');
        expect(focus).toHaveBeenCalledTimes(1); expect(clients.openWindow).not.toHaveBeenCalled();
        expect(postMessage).toHaveBeenCalledWith({ type: 'metadata-review-notification', url: origin + '/admin?tab=lives&metadata=42' });
    });
    it('IDの前方一致で別公演へ誘導せず、既存の未保存タブもnavigateしない', async () => {
        const { clients, click } = worker(); const focus = jest.fn(); const navigate = jest.fn();
        clients.matchAll.mockResolvedValue([{ url: origin + '/admin?tab=lives&metadata=42', focus, navigate }]);
        await click('/admin?tab=lives&metadata=4');
        expect(focus).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
        expect(clients.openWindow).toHaveBeenCalledWith(origin + '/admin?tab=lives&metadata=4');
    });
    it('未確認キューの通知も管理画面へ開く', async () => {
        const { clients, click } = worker();
        await click('/admin?tab=lives&review=unconfirmed');
        expect(clients.openWindow).toHaveBeenCalledWith(origin + '/admin?tab=lives&review=unconfirmed');
    });
    it.each([undefined, 42, 'https://', 'javascript:alert(1)', 'https://outside.example.invalid/admin', '//outside.example.invalid/admin'])('不正/外部URL %j は同一originのホームへ戻す', async value => {
        const { clients, click } = worker(); await click(value);
        expect(clients.openWindow).toHaveBeenCalledWith(origin + '/');
    });
    it('不正なPush JSONは通知せず処理内で失敗を記録する', () => {
        const { handlers, self, logger } = worker();
        handlers.push({ data: { json: () => { throw new Error('Fixture malformed JSON'); } }, waitUntil: jest.fn() });
        expect(self.registration.showNotification).not.toHaveBeenCalled(); expect(logger.error).toHaveBeenCalled();
    });
});
