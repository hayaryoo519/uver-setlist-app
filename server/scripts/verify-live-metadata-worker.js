// 専用Viteでだけ配信する制御wrapper。Push配送/OSクリックを偽装して完了扱いしない。
const assert = require('node:assert/strict');
const WORKER_PATH = '/__fixture-notification-worker.js';
const WORKER_SOURCE = `
const handlers = {};
const nativeAdd = self.addEventListener.bind(self);
self.addEventListener = (type, handler, options) => {
    if (type === 'push' || type === 'notificationclick') handlers[type] = handler;
    nativeAdd(type, handler, options);
};
importScripts('/sw-push.js');
self.addEventListener = nativeAdd;
const version = new URL(self.location.href).searchParams.get('version') || '2';
// 旧protocolを合成: 同じURLのタブをfocusするがページへ再開messageを送らない。
if (version === '1') handlers.notificationclick = event => {
    event.notification.close();
    if (event.action === 'close') return;
    const url = new URL(event.notification.data.url, self.location.origin).href;
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
        const client = windows.find(item => item.url === url);
        return client ? client.focus() : clients.openWindow(url);
    }));
};
nativeAdd('message', event => {
    if (event.data?.type === 'fixture-activate') { event.waitUntil(self.skipWaiting()); return; }
    if (event.data?.type !== 'fixture-notification-command' || !event.ports[0]) return;
    event.waitUntil((async () => {
    const port = event.ports[0];
    try {
        const pending = [];
        handlers.push({ data: { json: () => ({ title: 'Fixture review notification', body: 'Synthetic local fixture',
            data: { type: 'fixture-review', url: event.data.url } }) }, waitUntil: promise => pending.push(promise) });
        await Promise.all(pending);
        const notifications = await self.registration.getNotifications({ tag: 'fixture-review' });
        if (notifications.length !== 1) throw new Error('Fixture notification was not stored');
        const notification = notifications[0];
        const snapshot = { title: notification.title, url: notification.data.url };
        const clicks = [];
        handlers.notificationclick({ notification, action: event.data.action || 'open', waitUntil: promise => clicks.push(promise) });
        const results = await Promise.allSettled(clicks);
        const failure = results.find(result => result.status === 'rejected');
        port.postMessage({ snapshot, version, clickError: failure ? failure.reason.name : null,
            remaining: (await self.registration.getNotifications({ tag: 'fixture-review' })).length });
    } catch (error) { port.postMessage({ fixtureError: error.message, workerPermission: Notification.permission, workerOrigin: self.location.origin }); }
    })());
});
`;

function fixtureWorkerPlugin() {
    return { name: 'disposable-notification-worker', configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url.split('?')[0] !== WORKER_PATH) return next();
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-store');
            res.end(WORKER_SOURCE);
        });
    } };
}

async function verifyWorkerReviewMessages({ page, context, origin, target, note, profile, passed }) {
    const { expect } = require('@playwright/test');
    await context.grantPermissions(['notifications'], { origin });
    await page.goto(origin + target);
    assert.equal(await page.evaluate(() => Notification.permission), 'granted', 'Native page notification permission');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
    await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
    await page.evaluate(async path => {
        const previous = await navigator.serviceWorker.getRegistrations();
        if (previous.length) throw new Error('Unexpected worker in disposable context');
        const registration = await navigator.serviceWorker.register(path, { scope: '/admin' });
        if (registration.active) return;
        await new Promise((resolve, reject) => {
            const worker = registration.installing || registration.waiting;
            if (!worker) return reject(new Error('Fixture worker missing'));
            const timer = setTimeout(() => reject(new Error('Fixture worker activation timeout')), 10000);
            const changed = () => {
                if (worker.state === 'activated') { clearTimeout(timer); resolve(); }
                if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Fixture worker redundant')); }
            };
            worker.addEventListener('statechange', changed); changed();
        });
    }, WORKER_PATH);
    const command = async (action = 'open') => {
        const result = await page.evaluate(async ({ path, url, action }) => {
            const registration = await navigator.serviceWorker.getRegistration('/admin');
            if (!registration?.active || new URL(registration.active.scriptURL).pathname !== path ||
                new URL(registration.active.scriptURL).origin !== location.origin) throw new Error('Unowned fixture worker');
            return new Promise((resolve, reject) => {
                const channel = new MessageChannel();
                const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Fixture command timeout')); }, 10000);
                channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
                registration.active.postMessage({ type: 'fixture-notification-command', url, action }, [channel.port2]);
            });
        }, { path: WORKER_PATH, url: origin + target, action });
        if (result.fixtureError) throw new Error(`${result.fixtureError} (worker permission=${result.workerPermission}, origin=${result.workerOrigin})`);
        assert.equal(result.snapshot.title, 'Fixture review notification');
        assert.equal(result.snapshot.url, origin + target);
        assert.equal(result.remaining, 0);
        // 合成clickはユーザー操作権限を与えない。focusの許可/拒否を実OSクリックの成功と扱わない。
        assert([null, 'InvalidAccessError'].includes(result.clickError), `Unexpected native click error: ${result.clickError}`);
        return result.version;
    };
    await command('close');
    await expect(dialog).toHaveCount(0);
    await command();
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
    const unsaved = `UNSAVED_WORKER_${profile}`;
    await dialog.getByLabel('管理用メモ').fill(unsaved);
    await command();
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(unsaved);
    page.once('dialog', prompt => prompt.accept());
    await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
    await page.getByRole('button', { name: '一覧とレビュー情報を更新' }).click();
    await expect(dialog).toHaveCount(0);
    passed(`Native worker ${profile}: notification permission/storage/close and real WindowClient message reopens review without losing edits`);

    // controlled clientを残して実waiting状態を作る。強制reloadによる入力喪失を避ける。
    await page.reload();
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
    const install = async version => {
        await page.evaluate(async ({ path, version }) => {
            await navigator.serviceWorker.register(path + '?version=' + version, { scope: '/admin', updateViaCache: 'none' });
        }, { path: WORKER_PATH, version });
        await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/admin'))?.waiting?.scriptURL || ''), { timeout: 10000 })
            .toBe(origin + WORKER_PATH + '?version=' + version);
    };
    const activate = async version => {
        await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/admin')).waiting.postMessage({ type: 'fixture-activate' }));
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || ''), { timeout: 10000 })
            .toBe(origin + WORKER_PATH + '?version=' + version);
    };
    await install('1'); await activate('1');
    await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
    assert.equal(await command(), '1');
    await expect(dialog).toHaveCount(0); // 旧protocolのfocusだけでは閉じたレビューは再開しない。
    await page.reload();
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
    const upgradeNote = `UPGRADE_UNSAVED_${profile}`;
    await dialog.getByLabel('管理用メモ').fill(upgradeNote);
    await install('2');
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller.scriptURL), origin + WORKER_PATH + '?version=1');
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(upgradeNote);
    await activate('2');
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(upgradeNote);
    assert.equal(await command(), '2');
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(upgradeNote);
    page.once('dialog', prompt => prompt.accept());
    await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
    await expect(dialog).toHaveCount(0);
    assert.equal(await command(), '2');
    await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/admin')).unregister());
    passed(`Worker upgrade ${profile}: legacy protocol, native waiting/controller switch, unchanged unsaved draft, new review reopen`);
}

function instrumentWorkerSource(source, version) {
    return WORKER_SOURCE.replace("importScripts('/sw-push.js');", () => source)
        .replace("const version = new URL(self.location.href).searchParams.get('version') || '2';", `const version = ${JSON.stringify(version)};`);
}

module.exports = { fixtureWorkerPlugin, verifyWorkerReviewMessages, instrumentWorkerSource };
