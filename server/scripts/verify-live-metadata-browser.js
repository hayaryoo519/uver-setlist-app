// --browser用。対象APIは実ルート/実JWT/所有DB。補助UIのAPIだけ空fixtureで隔離。
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { buildSetlistCandidates, saveMetadataCandidates } = require('../services/liveMetadataCandidates');

async function verifyMetadataBrowser({ root, temp, pool, httpServer, freePort, passed, workerVerification = false }) {
    assert(path.basename(temp).startsWith('uver-metadata-db-'), 'Require a disposable runner directory');
    const directory = (await pool.query("SELECT current_setting('data_directory') AS directory")).rows[0].directory;
    const normalize = value => path.resolve(value).replace(/\\/g, '/').toLowerCase();
    assert.equal(normalize(directory), normalize(path.join(temp, 'data')), 'Refuse an unowned browser DB');
    assert(httpServer?.listening, 'Require the in-process fixture HTTP server');
    const address = httpServer.address();
    assert.equal(address.address, '127.0.0.1', 'Fixture API must be loopback-only');
    const { chromium, devices, expect } = require('@playwright/test');
    const apiUrl = `http://127.0.0.1:${address.port}`;
    const { createServer } = await import('vite');
    const previousApiUrl = process.env.VITE_API_URL;
    const previousDirectory = process.cwd();
    process.env.VITE_API_URL = apiUrl;
    process.chdir(root); // Tailwind等の相対content/config探索も通常のフロント起動と揃える。
    let vite;
    let browser;
    try {
        vite = await createServer({ root, configFile: path.join(root, 'vite.config.js'), envDir: temp,
            plugins: workerVerification ? [require('./verify-live-metadata-worker').fixtureWorkerPlugin()] : [],
            server: { host: '127.0.0.1', port: await freePort(), strictPort: true, hmr: false } });
        await vite.listen();
        const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
        // headless_shell(Windows)はpermission APIとNotification.permissionが一致しないため、Worker試験はフルChromiumを使う。
        browser = await chromium.launch(workerVerification ? { channel: 'chromium' } : {});
        for (const [profile, device] of [['desktop', devices['Desktop Chrome']], ['mobile', devices['Pixel 5']]]) {
            require('../middleware/rateLimiter').loginLimiter.resetKey('127.0.0.1'); // 各独立シナリオで実limiterのbucketだけ初期化。
            const context = await browser.newContext({ ...device, serviceWorkers: workerVerification ? 'allow' : 'block' });
            try {
                const errors = []; const unexpected = []; const apiFailures = [];
                const page = await context.newPage();
                page.on('pageerror', error => errors.push(error.message));
                page.on('response', response => {
                    const url = new URL(response.url());
                    if (url.pathname.startsWith('/api/') && response.status() >= 400 &&
                        !['/api/auth/login', '/api/lives/1/metadata'].includes(url.pathname)) apiFailures.push(`${response.status()} ${url.pathname}`);
                });
                await context.route('**/*', route => {
                    const request = route.request(); const url = new URL(request.url());
                    if (url.origin !== origin) return route.abort();
                    if (!url.pathname.startsWith('/api/')) return route.continue();
                    if (request.method() === 'GET' && ['/api/songs', '/api/users', '/api/corrections', '/api/users/me/attended_lives'].includes(url.pathname)) {
                        return route.fulfill({ contentType: 'application/json', body: '[]' });
                    }
                    const native = url.pathname === '/api/auth/login' || url.pathname === '/api/live-artists' ||
                        /^\/api\/live-artists\/\d+$/.test(url.pathname) || url.pathname === '/api/lives/metadata-review' ||
                        /^\/api\/lives(?:\/\d+(?:\/metadata)?)?$/.test(url.pathname);
                    if (native) return route.continue(); // Viteのproxy先は、このプロセスが所有するExpressだけ。
                    unexpected.push(`${request.method()} ${url.pathname}`);
                    return route.fulfill({ status: 501, contentType: 'application/json', body: '{"message":"Unapproved fixture API"}' });
                });
                const target = '/admin?tab=lives&metadata=1';
                await page.goto(origin + target);
                await expect(page).toHaveURL(origin + '/login');
                const login = async password => {
                    await page.getByLabel('メールアドレス').fill('admin@fixture.invalid');
                    await page.getByLabel('パスワード', { exact: true }).fill(password);
                    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
                };
                await login('incorrect-fixture-password');
                await expect(page.getByText('メールアドレスまたはパスワードが間違っています')).toBeVisible();
                await login('fixture-only-password');
                await expect(page).toHaveURL(origin + target);
                const dialog = page.getByRole('dialog');
                await expect(dialog.getByText('現在の有効情報')).toBeVisible();
                const note = `BROWSER_PRIVATE_${profile}`;
                await dialog.getByLabel('開催国の確認状態').selectOption('confirmed');
                await dialog.getByLabel('開催国コード').fill('KR');
                await dialog.getByLabel('管理用メモ').fill(note);
                await dialog.getByRole('button', { name: '追加情報を保存', exact: true }).click();
                await expect(dialog.getByText('追加情報を保存しました。')).toBeVisible();
                const stored = (await pool.query('SELECT revision, overrides FROM live_metadata WHERE live_id=1')).rows[0];
                assert.equal(stored.overrides.country.code, 'KR');
                assert.equal(stored.overrides.classification.note, note);
                assert.equal((await pool.query('SELECT actor_id FROM live_metadata_history WHERE live_id=1 ORDER BY id DESC LIMIT 1')).rows[0].actor_id, 1);
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    const source = buildSetlistCandidates({ id: `browser-fixture-${profile}`, eventDate: '01-01-2020', tour: { name: 'Fixture changed source' },
                        venue: { name: 'Fixture Venue', city: { country: { code: 'JP' } } }, url: 'https://example.invalid/browser-fixture' });
                    await saveMetadataCandidates(client, 1, source);
                    await client.query('COMMIT');
                } catch (error) { await client.query('ROLLBACK'); throw error; }
                finally { client.release(); }
                assert.deepEqual((await pool.query('SELECT overrides FROM live_metadata WHERE live_id=1')).rows[0].overrides, stored.overrides);
                await page.reload();
                await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
                await expect(dialog.getByLabel('開催国コード')).toHaveValue('KR');

                // 本物の署名済み期限切れJWTを入れ、実authorizeの403から再ログインする。
                const expired = jwt.sign({ user_id: 1, role: 'admin', exp: 1 }, process.env.JWT_SECRET);
                await page.evaluate(token => localStorage.setItem('token', token), expired);
                page.once('dialog', prompt => prompt.accept());
                await dialog.getByRole('button', { name: '最新情報を再読み込み' }).click();
                await expect(page).toHaveURL(/\/login\?returnTo=/);
                assert.equal(new URL(page.url()).searchParams.get('returnTo'), target);
                await login('fixture-only-password');
                await expect(page).toHaveURL(origin + target);
                await expect(dialog.getByLabel('管理用メモ')).toHaveValue(note);
                await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
                await page.goto(origin + '/lives');
                await page.getByPlaceholder('ツアー名・会場・共演者で検索').fill('ＦＡ');
                const card = page.locator('a[href="/live/1"]:visible');
                await expect(card).toContainText('Renamed Artist');
                await expect(card).toContainText('開催国：KR');
                assert(!(await page.locator('body').innerText()).includes(note));
                // 公開APIの実応答でも管理メモを返さない。
                const publicRows = await page.evaluate(async () => (await fetch('/api/lives')).json());
                assert(!JSON.stringify(publicRows).includes(note));
                assert.equal(publicRows.find(row => row.id === 1).metadata.country.code, 'KR');
                await card.click();
                await expect(page).toHaveURL(origin + '/live/1');
                await expect(page.getByRole('heading', { name: 'Birthday VS Fixture', exact: true, level: 1 })).toBeVisible();
                await expect(page.getByText('対バン相手：Renamed Artist', { exact: true })).toBeVisible();
                assert(!(await page.locator('body').innerText()).includes(note));
                if (workerVerification) await require('./verify-live-metadata-worker').verifyWorkerReviewMessages({ page, context, origin, target, note, profile, passed });
                assert.deepEqual(unexpected, []); assert.deepEqual(apiFailures, []); assert.deepEqual(errors, []);
                passed(`Real browser ${profile}: bcrypt/JWT login, SQL save/audit/reload, expired-session return, reimport preservation, public list/detail alias search/privacy`);
            } finally { await context.close(); }
        }
    } finally {
        const cleanup = await Promise.allSettled([browser?.close(), vite?.close()]);
        process.chdir(previousDirectory);
        if (previousApiUrl === undefined) delete process.env.VITE_API_URL;
        else process.env.VITE_API_URL = previousApiUrl;
        const failure = cleanup.find(result => result.status === 'rejected');
        if (failure) throw new Error(`Fixture browser cleanup failed: ${failure.reason.message}`);
    }
}

module.exports = { verifyMetadataBrowser };
