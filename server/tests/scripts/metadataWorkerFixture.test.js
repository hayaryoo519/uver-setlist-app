const { fixtureWorkerPlugin, instrumentWorkerSource } = require('../../scripts/verify-live-metadata-worker');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function worker(version) {
    const res = { setHeader: jest.fn(), end: jest.fn() };
    middleware()({ url: '/__fixture-notification-worker.js' }, res, jest.fn());
    const listeners = {}; const notifications = [];
    const origin = 'https://worker.fixture.invalid';
    const url = origin + '/admin?tab=lives&metadata=1';
    const client = { url, focus: jest.fn().mockResolvedValue({}), postMessage: jest.fn() };
    const self = { location: { origin, href: origin + '/__fixture-notification-worker.js?version=' + version },
        addEventListener: (type, listener) => { listeners[type] = listener; }, skipWaiting: jest.fn().mockResolvedValue(undefined),
        registration: { showNotification: jest.fn(async (title, options) => {
            const notification = { title, data: options.data, closed: false, close() { this.closed = true; } };
            notifications.push(notification);
        }), getNotifications: jest.fn(async () => notifications.filter(item => !item.closed)) },
    };
    const context = vm.createContext({ self, URL, Notification: { permission: 'granted' }, console,
        clients: { matchAll: jest.fn().mockResolvedValue([client]), openWindow: jest.fn() },
        importScripts: script => {
            if (script !== '/sw-push.js') throw new Error('Unapproved script');
            vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../../public/sw-push.js'), 'utf8'), context);
        },
    });
    vm.runInContext(res.end.mock.calls[0][0], context);
    async function command(type) {
        const pending = []; const port = { postMessage: jest.fn() };
        listeners.message({ data: { type, url }, ports: [port], waitUntil: promise => pending.push(promise) });
        await Promise.all(pending);
        return port.postMessage.mock.calls[0]?.[0];
    }
    return { self, client, command };
}

function middleware() {
    const use = jest.fn(); fixtureWorkerPlugin().configureServer({ middlewares: { use } });
    return use.mock.calls[0][0];
}
describe('隔離Viteの通知Worker配信', () => {
    it('本番fixtureでは元ソースを埋め込み、自己importせず版を固定する', () => {
        const source = instrumentWorkerSource('// ORIGINAL_$&_FIXTURE', '1');
        expect(source).toContain('// ORIGINAL_$&_FIXTURE');
        expect(source).not.toContain("importScripts('/sw-push.js')");
        expect(source).toContain('const version = "1";');
    });
    it.each(['1', '2'])('合成旧/新protocol %s の再開メッセージ差を維持する', async version => {
        const fixture = worker(version);
        const result = await fixture.command('fixture-notification-command');
        expect(result.fixtureError).toBeUndefined(); expect(result.version).toBe(version); expect(result.remaining).toBe(0);
        expect(fixture.client.focus).toHaveBeenCalledTimes(1);
        expect(fixture.client.postMessage).toHaveBeenCalledTimes(version === '1' ? 0 : 1);
    });
    it('専用activationコマンドだけでskipWaitingし、通知は作らない', async () => {
        const fixture = worker('2');
        await fixture.command('fixture-activate');
        expect(fixture.self.skipWaiting).toHaveBeenCalledTimes(1);
        expect(fixture.self.registration.showNotification).not.toHaveBeenCalled();
    });
    it('通常のSW/アプリURLにはwrapperを配信しない', () => {
        const handler = middleware(); const next = jest.fn(); const res = { setHeader: jest.fn(), end: jest.fn() };
        handler({ url: '/sw-push.js' }, res, next);
        expect(next).toHaveBeenCalledTimes(1); expect(res.end).not.toHaveBeenCalled();
    });
    it('専用URLだけにno-storeで配信し、実SWをimportしてmessageの寿命を保持する', () => {
        const handler = middleware(); const next = jest.fn(); const res = { setHeader: jest.fn(), end: jest.fn() };
        handler({ url: '/__fixture-notification-worker.js?fixture=1' }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript');
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
        const source = res.end.mock.calls[0][0];
        expect(source).toContain("importScripts('/sw-push.js')");
        expect(source).toContain('event.waitUntil');
        expect(source).toContain('self.registration.getNotifications');
    });
});
