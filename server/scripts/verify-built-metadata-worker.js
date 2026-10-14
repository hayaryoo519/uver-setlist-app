// 所有DB/Expressとtemp内の本番生成物だけを使う。実配信/過去の本番bundleは使わない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium, devices, expect } = require('@playwright/test');
const { instrumentWorkerSource } = require('./verify-live-metadata-worker');

async function verifyBuiltWorker({ root, temp, pool, app, httpServer, passed }) {
    assert(path.basename(temp).startsWith('uver-metadata-db-'));
    const normalize = value => path.resolve(value).replace(/\\/g, '/').toLowerCase();
    assert.equal(normalize((await pool.query("SELECT current_setting('data_directory') AS directory")).rows[0].directory), normalize(path.join(temp, 'data')));
    assert(httpServer?.listening && httpServer.listeners('request').includes(app), 'Require in-process fixture Express server');
    const address = httpServer.address(); assert.equal(address.address, '127.0.0.1', 'Fixture server must be loopback-only');
    const origin = `http://127.0.0.1:${address.port}`;
    const cwd = process.cwd(); const previousApi = process.env.VITE_API_URL; const previousMode = process.env.NODE_ENV;
    process.chdir(root); process.env.VITE_API_URL = origin; process.env.NODE_ENV = 'production';
    let browser;
    try {
        const { build } = await import('vite');
        const directories = {};
        for (const version of ['1', '2']) {
            const publicDir = path.join(temp, 'build-public-' + version);
            fs.mkdirSync(publicDir);
            for (const asset of ['icons', 'offline.html', 'vite.svg']) {
                const source = path.join(root, 'public', asset);
                if (fs.existsSync(source)) fs.cpSync(source, path.join(publicDir, asset), { recursive: true });
            }
            fs.writeFileSync(path.join(publicDir, 'sw-push.js'), instrumentWorkerSource(fs.readFileSync(path.join(root, 'public/sw-push.js'), 'utf8'), version));
            const outDir = path.join(temp, 'production-build-' + version); directories[version] = outDir;
            await build({ root, configFile: path.join(root, 'vite.config.js'), envDir: temp, publicDir, logLevel: 'warn',
                plugins: [{ name: 'fixture-build-marker', transform(code, id) {
                    if (normalize(id.split('?')[0]) === normalize(path.join(root, 'src/main.jsx'))) {
                        return code + `\ndocument.documentElement.dataset.fixtureBuild = ${JSON.stringify(version)};`;
                    }
                } }], build: { outDir, emptyOutDir: true } });
            assert(fs.readFileSync(path.join(outDir, 'sw.js'), 'utf8').includes('skipWaiting'));
        }
        passed('Two isolated production Vite/Workbox builds with distinct JS markers and legacy/current notification protocol');
        let currentVersion = '1';
        const staticHandlers = Object.fromEntries(Object.entries(directories).map(([version, directory]) => [version, express.static(directory)]));
        app.use((req, res, next) => {
            if (req.path.startsWith('/api/')) return next();
            if (['/sw.js', '/sw-push.js', '/index.html', '/registerSW.js'].includes(req.path)) res.setHeader('Cache-Control', 'no-cache');
            staticHandlers[currentVersion](req, res, () => {
                if (req.method === 'GET' && req.accepts('html')) res.sendFile(path.join(directories[currentVersion], 'index.html'));
                else next();
            });
        });
        // SW経由のfetchはcontext.routeを迂回し得る。既知の外部font等もDNS解決させない。
        browser = await chromium.launch({ channel: 'chromium', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
        for (const [profile, device] of [['desktop', devices['Desktop Chrome']], ['mobile', devices['Pixel 5']]]) {
            currentVersion = '1'; require('../middleware/rateLimiter').loginLimiter.resetKey('127.0.0.1');
            const context = await browser.newContext({ ...device, serviceWorkers: 'allow' });
            try {
                await context.grantPermissions(['notifications'], { origin });
                const page = await context.newPage(); const errors = []; const unexpected = [];
                page.on('pageerror', error => errors.push(error.message));
                await context.route('**/*', route => {
                    const url = new URL(route.request().url());
                    if (url.origin !== origin) return route.abort();
                    if (route.request().method() === 'GET' && ['/api/songs', '/api/users', '/api/corrections', '/api/users/me/attended_lives'].includes(url.pathname)) {
                        return route.fulfill({ contentType: 'application/json', body: '[]' });
                    }
                    if (url.pathname.startsWith('/api/') && !(/^\/api\/lives(?:\/\d+(?:\/metadata)?)?$/.test(url.pathname) ||
                        ['/api/auth/login', '/api/lives/metadata-review', '/api/live-artists'].includes(url.pathname))) {
                        unexpected.push(url.pathname); return route.fulfill({ status: 501, body: '{}' });
                    }
                    return route.continue();
                });
                const target = '/admin?tab=lives&metadata=1';
                await page.goto(origin + target);
                await page.getByLabel('メールアドレス').fill('admin@fixture.invalid');
                await page.getByLabel('パスワード', { exact: true }).fill('fixture-only-password');
                await page.getByRole('button', { name: 'ログイン', exact: true }).click();
                await expect(page).toHaveURL(origin + target);
                const dialog = page.getByRole('dialog');
                await expect(dialog.getByText('現在の有効情報')).toBeVisible();
                await page.evaluate(() => navigator.serviceWorker.ready);
                await page.reload(); // 旧生成Workerに制御された旧bundleを起動。
                await expect(dialog.getByText('現在の有効情報')).toBeVisible();
                assert.equal(await page.evaluate(() => document.documentElement.dataset.fixtureBuild), '1');
                const note = `BUILT_PRIVATE_${profile}`;
                await dialog.getByLabel('管理用メモ').fill(note);
                await dialog.getByRole('button', { name: '追加情報を保存', exact: true }).click();
                await expect(dialog.getByText('追加情報を保存しました。')).toBeVisible();
                await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
                const command = async () => page.evaluate(async url => {
                    const registration = await navigator.serviceWorker.getRegistration('/');
                    return new Promise((resolve, reject) => {
                        const channel = new MessageChannel();
                        const timer = setTimeout(() => reject(new Error('Built worker command timeout')), 10000);
                        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
                        registration.active.postMessage({ type: 'fixture-notification-command', url, action: 'open' }, [channel.port2]);
                    });
                }, origin + target);
                const legacy = await command(); assert.equal(legacy.version, '1'); assert.equal(legacy.fixtureError, undefined);
                await expect(dialog).toHaveCount(0);
                await page.reload(); await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
                const unsaved = `BUILT_UNSAVED_${profile}`;
                await dialog.getByLabel('管理用メモ').fill(unsaved);
                currentVersion = '2';
                await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/')).update());
                await expect.poll(async () => (await command()).version, { timeout: 20000 }).toBe('2');
                // 新Workerが自動切替しても旧JSを強制reloadしない。
                assert.equal(await page.evaluate(() => document.documentElement.dataset.fixtureBuild), '1');
                await expect(dialog.getByLabel('管理用メモ')).toHaveValue(unsaved);
                assert.equal((await pool.query('SELECT overrides FROM live_metadata WHERE live_id=1')).rows[0].overrides.classification.note, note);
                page.once('dialog', prompt => prompt.accept());
                await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
                const modern = await command(); assert.equal(modern.version, '2'); assert.equal(modern.fixtureError, undefined);
                await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
                await page.reload(); await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
                assert.equal(await page.evaluate(() => document.documentElement.dataset.fixtureBuild), '2');
                const privateCachePaths = await page.evaluate(async () => {
                    const found = [];
                    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
                        const pathname = new URL(request.url).pathname;
                        if (/^\/api\/(auth|users|corrections|live-artists)/.test(pathname) || pathname.endsWith('/metadata') || pathname.endsWith('/metadata-review')) found.push(pathname);
                    }
                    return found;
                });
                assert.deepEqual(privateCachePaths, []); assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
                passed(`Built Workbox ${profile}: old/new JS, automatic worker switch without draft loss, explicit reload, no private API cache`);
            } finally { await context.close(); }
        }
    } finally {
        try { if (browser) await browser.close(); }
        finally {
            process.chdir(cwd);
            if (previousApi === undefined) delete process.env.VITE_API_URL; else process.env.VITE_API_URL = previousApi;
            if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
        }
    }
}

module.exports = { verifyBuiltWorker };
