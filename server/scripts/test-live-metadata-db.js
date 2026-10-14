#!/usr/bin/env node
// 合成fixture専用。アプリのdb.js/.env、既存DB、バックアップを使用しない。
// initdb/pg_ctl/psqlがPATHに必要。PG_BINでローカルのPostgreSQL binを明示可能。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const express = require('express');
const { effectiveLiveMetadata } = require('../services/liveMetadataProjection');
const { buildSetlistCandidates, saveMetadataCandidates } = require('../services/liveMetadataCandidates');

if (process.env.APP_ENV === 'production') {
    console.error('Fixture DB verification is local-only; do not run on Production.');
    process.exit(1);
}
const builtWorkerVerification = process.argv.includes('--built-worker');
const workerVerification = process.argv.includes('--worker');
const browserVerification = workerVerification || process.argv.includes('--browser');
const realAuth = browserVerification || builtWorkerVerification || process.argv.includes('--real-auth');
const fullSchema = realAuth || process.argv.includes('--full-schema');
const root = path.resolve(__dirname, '../..');
const binary = name => process.env.PG_BIN ? path.join(process.env.PG_BIN, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uver-metadata-db-'));
const data = path.join(temp, 'data');
const toolEnv = {
    PATH: process.env.PATH,
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    TEMP: temp, TMP: temp, HOME: temp, PGCLIENTENCODING: 'UTF8',
};
const run = (name, args, extra = {}) => execFileSync(binary(name), args, { env: { ...toolEnv, ...extra }, encoding: 'utf8', timeout: 45000, stdio: name === 'pg_ctl' ? 'ignore' : 'pipe' });
let startAttempted = false;
let pool;
let httpServer;
let connection;
const checkpoints = [];
const passed = name => { checkpoints.push(name); console.log(`PASS: ${name}`); };

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer(); server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}
function publicView(live, row) {
    const effective = effectiveLiveMetadata(live, row.candidates, row.overrides);
    return { tags: effective.tags, country: effective.country, members: effective.members,
        participants: { status: effective.participants.status, items: effective.participants.items.map(({ artistId, role }) => ({ artistId, role })) } };
}
function anonymize() {
    return run('psql', ['-X', '--set=ON_ERROR_STOP=1', '--single-transaction', '-d', 'postgres', '-f', path.join(root, 'scripts/sync/anonymize.sql')], {
        PGHOST: '127.0.0.1', PGPORT: String(connection.port), PGUSER: 'metadata_fixture',
    });
}
async function main() {
    const port = await freePort();
    assert(![5432, 54325, 54332].includes(port), 'Use an unused disposable port, not any application DB port');
    console.log(`Disposable fixture cluster: ${data}`);
    run('initdb', ['-D', data, '-U', 'metadata_fixture', '--auth=trust', '--encoding=UTF8', '--locale=C', '--no-instructions']);
    startAttempted = true;
    run('pg_ctl', ['-D', data, '-l', path.join(temp, 'postgres.log'), '-w', '-t', '25', '-o', `-h 127.0.0.1 -p ${port}`, 'start']);
    connection = { host: '127.0.0.1', port, user: 'metadata_fixture', database: 'postgres', password: 'fixture-only', ssl: false, options: '-c search_path=public', connectionTimeoutMillis: 5000 };
    pool = new Pool(connection);
    const setting = await pool.query("SELECT current_setting('data_directory') AS directory, version() AS version");
    const normalizePath = value => path.resolve(value).replace(/\\/g, '/').toLowerCase();
    assert.equal(normalizePath(setting.rows[0].directory), normalizePath(data), 'Refuse any DB not owned by this test');
    console.log(setting.rows[0].version.split(',')[0]);

    if (fullSchema) {
        // migrate.jsは.envを読むため呼ばない。SQL一式をテスト所有のPoolだけで適用する。
        const migrationDir = path.join(root, 'server/migrations');
        const files = fs.readdirSync(migrationDir).filter(name => /^\d+_.*\.sql$/.test(name) && Number(name.split('_')[0]) < 30)
            .sort((a, b) => Number(a.split('_')[0]) - Number(b.split('_')[0]));
        const migrationClient = await pool.connect();
        try {
            for (const filename of files) {
                await migrationClient.query('BEGIN');
                try {
                    await migrationClient.query(fs.readFileSync(path.join(migrationDir, filename), 'utf8'));
                    await migrationClient.query('COMMIT');
                } catch (error) {
                    await migrationClient.query('ROLLBACK'); throw new Error(`${filename}: ${error.message}`);
                }
            }
        } finally { migrationClient.release(); }
        passed(`Complete checked-in legacy schema: ${files.length} migrations (000–029)`);
        await pool.query(`
            INSERT INTO users (id, email, username, password, verification_token, reset_password_token, reset_password_expires)
                VALUES (1, 'fixture@example.invalid', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 123);
            INSERT INTO lives (id, date, venue, tour_name, import_metadata)
                SELECT id, '2020-01-01'::date, 'Fixture Venue', CASE WHEN id=4 THEN 'Confirmed None' ELSE 'Birthday VS Fixture' END,
                    '{"private":"PRIVATE_SENTINEL"}'::jsonb FROM generate_series(1,4) AS id;
            INSERT INTO security_logs(event_type, message) VALUES ('fixture', 'PRIVATE_SENTINEL');
            INSERT INTO push_subscriptions(endpoint, p256dh, auth) VALUES ('PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL');
            INSERT INTO collector_logs(message) VALUES ('PRIVATE_SENTINEL');
            INSERT INTO corrections(correction_type, description, suggested_data, admin_note)
                VALUES ('fixture', 'PRIVATE_SENTINEL', '{"private":"PRIVATE_SENTINEL"}', 'PRIVATE_SENTINEL');
            INSERT INTO user_spotify_tokens(user_id, access_token, refresh_token_encrypted, expires_at)
                VALUES (1, 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', NOW());
            INSERT INTO user_google_tokens(user_id, access_token, refresh_token_encrypted, expires_at)
                VALUES (1, 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', NOW());
            INSERT INTO playlist_history(user_id, live_id, playlist_id) VALUES (1, 1, 'PRIVATE_SENTINEL');
            INSERT INTO raw_setlists(live_id, raw_text, parsed_json) VALUES (1, 'PRIVATE_SENTINEL', '{"private":"PRIVATE_SENTINEL"}');
            INSERT INTO social_posts(post_type, body, status, idempotency_key, error_message)
                VALUES ('fixture', 'PRIVATE_SENTINEL', 'approved', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL');
        `);
    } else {
    // メタデータに必要な最小の依存schema。既存環境をコピーせず全行を合成する。
    await pool.query(`
        CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT, username TEXT, password TEXT,
            verification_token TEXT, reset_password_token TEXT, reset_password_expires TIMESTAMPTZ);
        CREATE TABLE lives (id SERIAL PRIMARY KEY, title TEXT, tour_name TEXT, special_note TEXT);
        CREATE TABLE security_logs (id SERIAL PRIMARY KEY, detail TEXT);
        CREATE TABLE push_subscriptions (id SERIAL PRIMARY KEY, endpoint TEXT);
        CREATE TABLE collector_logs (id SERIAL PRIMARY KEY, detail TEXT);
        CREATE TABLE corrections (id SERIAL PRIMARY KEY, description TEXT, suggested_data JSONB, admin_note TEXT);
        INSERT INTO users VALUES (1, 'fixture@example.invalid', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', 'PRIVATE_SENTINEL', NOW());
        INSERT INTO lives (id, tour_name) VALUES (1, 'Birthday VS Fixture'), (2, 'Birthday VS Fixture'), (3, 'Birthday VS Fixture'), (4, 'Confirmed None');
        INSERT INTO security_logs(detail) VALUES ('PRIVATE_SENTINEL');
        INSERT INTO push_subscriptions(endpoint) VALUES ('PRIVATE_SENTINEL');
        INSERT INTO collector_logs(detail) VALUES ('PRIVATE_SENTINEL');
        INSERT INTO corrections(description, suggested_data, admin_note) VALUES ('PRIVATE_SENTINEL', '{"private":"PRIVATE_SENTINEL"}', 'PRIVATE_SENTINEL');
    `);
    }
    anonymize(); // 030/031がないバックアップをSQLが扱えることも実DBで確認。
    if (fullSchema) {
        for (const table of ['user_spotify_tokens', 'user_google_tokens', 'playlist_history', 'raw_setlists', 'social_posts']) {
            assert.equal((await pool.query(`SELECT * FROM ${table}`)).rowCount, 0, `${table} must not be copied into verification DBs`);
        }
        assert((await pool.query('SELECT import_metadata FROM lives')).rows.every(row => row.import_metadata === null));
        passed('OAuth credentials, private drafts/import metadata, playlist history and approved publication queue removed');
    }
    passed('Legacy schema without metadata: anonymization succeeds');
    for (let repeat = 0; repeat < 2; repeat++) {
        for (const filename of ['030_live_metadata.sql', '031_live_artists.sql']) {
            await pool.query(fs.readFileSync(path.join(root, 'server/migrations', filename), 'utf8'));
        }
    }
    passed('030/031 migrations apply and can be reapplied to the fixture');
    await pool.query("INSERT INTO live_artists(id, name, normalized_name, aliases, normalized_aliases) VALUES (10, 'Fixture Artist', 'fixture artist', ARRAY['ＦＡ'], ARRAY['fa'])");
    await pool.query("INSERT INTO live_collaborators VALUES (1, 10, 'co_headliner'), (1, 10, 'guest')");
    const overrides = {
        tagOverrides: { add: ['mens', 'PRIVATE_SENTINEL'], remove: ['christmas'], note: 'PRIVATE_SENTINEL' },
        country: { code: 'KR', note: 'PRIVATE_SENTINEL' }, members: { ids: ['takuya'], note: 'PRIVATE_SENTINEL' },
        participants: { items: [{ artistId: 10, role: 'guest', sourceNote: 'PRIVATE_SENTINEL' }, { artistId: 10, role: 'co_headliner', sourceNote: 'PRIVATE_SENTINEL' }], note: 'PRIVATE_SENTINEL' },
        classification: { needsReview: true, note: 'PRIVATE_SENTINEL' }, futurePrivateField: 'PRIVATE_SENTINEL',
    };
    await pool.query('INSERT INTO live_metadata(live_id, candidates, overrides, revision) VALUES (1, $1, $2, 3), (2, $3, $4, 0), (3, $5, $4, 0)', [
        JSON.stringify({ tags: ['birthday', 'vs', 'PRIVATE_SENTINEL'], original: { info: 'PRIVATE_SENTINEL' }, sources: { private: { original: 'PRIVATE_SENTINEL' } }, countryCode: 'KR', sourceUrl: 'PRIVATE_SENTINEL', conflicts: [{ field: 'countryCode', values: ['JP', 'KR'] }] }),
        JSON.stringify(overrides), JSON.stringify({ tags: [], original: { info: 'PRIVATE_SENTINEL' } }), '{}', JSON.stringify({ original: { info: 'PRIVATE_SENTINEL' } }),
    ]);
    await pool.query(`INSERT INTO live_metadata(live_id, candidates, overrides) VALUES (4, '{"tags":["birthday","vs"]}', '{"country":{"code":"JP"},"members":{"ids":[]},"participants":{"items":[]}}')`);
    const artistsBefore = (await pool.query('SELECT * FROM live_artists ORDER BY id')).rows;
    await pool.query("INSERT INTO live_metadata_history(live_id, actor_id, operation, before_state, after_state) VALUES (1, 1, 'manual', '{\"note\":\"PRIVATE_SENTINEL\"}', '{\"note\":\"PRIVATE_SENTINEL\"}')");
    await pool.query("INSERT INTO live_artist_history(artist_id, actor_id, after_state) VALUES (10, 1, '{\"note\":\"PRIVATE_SENTINEL\"}')");
    const liveRows = (await pool.query('SELECT * FROM lives ORDER BY id')).rows;
    const before = (await pool.query('SELECT * FROM live_metadata ORDER BY live_id')).rows;
    const publicBefore = before.map((row, index) => publicView(liveRows[index], row));
    anonymize();
    const after = (await pool.query('SELECT * FROM live_metadata ORDER BY live_id')).rows;
    assert.deepEqual(after.map((row, index) => publicView(liveRows[index], row)), publicBefore);
    assert.deepEqual(after[1].candidates, { tags: [] });
    assert.deepEqual(after[2].candidates, {});
    assert.equal(after[0].revision, 3);
    assert.deepEqual(after[3].overrides.members, { ids: [] });
    assert.deepEqual(after[3].overrides.participants, { items: [] });
    assert.deepEqual((await pool.query('SELECT * FROM live_artists ORDER BY id')).rows, artistsBefore);
    assert.equal((await pool.query('SELECT * FROM live_collaborators')).rowCount, 2);
    const allSanitized = {};
    for (const table of ['users', 'corrections', 'security_logs', 'push_subscriptions', 'collector_logs', 'live_metadata', 'live_metadata_history', 'live_artist_history']) {
        allSanitized[table] = (await pool.query(`SELECT * FROM ${table}`)).rows;
    }
    assert(!JSON.stringify(allSanitized).includes('PRIVATE_SENTINEL'));
    assert.equal(allSanitized.live_metadata_history.length, 0);
    assert.equal(allSanitized.live_artist_history.length, 0);
    passed('Sanitization removes originals/notes/unknown keys/histories and preserves public state and links');

    // SQL失敗時に、先行したユーザー匿名化等も単一トランザクションで巻き戻す。
    await pool.query("UPDATE users SET username = 'PRIVATE_ROLLBACK'; CREATE FUNCTION reject_sanitize() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER reject_sanitize BEFORE UPDATE ON live_metadata FOR EACH ROW EXECUTE FUNCTION reject_sanitize()");
    if (fullSchema) await pool.query(`
        INSERT INTO user_spotify_tokens(user_id, access_token, refresh_token_encrypted, expires_at)
            VALUES (1, 'PRIVATE_ROLLBACK', 'PRIVATE_ROLLBACK', NOW());
        INSERT INTO social_posts(post_type, body, status, idempotency_key)
            VALUES ('fixture', 'PRIVATE_ROLLBACK', 'approved', 'PRIVATE_ROLLBACK');
    `);
    assert.throws(anonymize);
    assert.equal((await pool.query('SELECT username FROM users WHERE id=1')).rows[0].username, 'PRIVATE_ROLLBACK');
    if (fullSchema) {
        assert.equal((await pool.query('SELECT * FROM user_spotify_tokens')).rowCount, 1);
        assert.equal((await pool.query('SELECT * FROM social_posts')).rowCount, 1);
    }
    await pool.query('DROP TRIGGER reject_sanitize ON live_metadata; DROP FUNCTION reject_sanitize()');
    anonymize();
    passed('psql SQL error is nonzero and rolls back the complete anonymization transaction');

    // db.js/.envを読み込まず、ルートをテスト所有Poolだけへ接続する。
    // --real-authでは認可も実コード、それ以外ではfixture認可を使う。
    const dbPath = require.resolve('../db');
    const authPath = require.resolve('../middleware/authorization');
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: (...args) => pool.query(...args), pool } };
    const app = express(); app.use(express.json());
    let verifyAuth;
    if (realAuth) {
        verifyAuth = await require('./verify-live-metadata-auth').installRealAuthFixture(pool, app, data);
    } else {
        require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
            authorize: (req, res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); }, adminCheck: (req, res, next) => next(),
        } };
    }
    app.use('/api/lives/:id/metadata', require('../routes/liveMetadata'));
    app.use('/api/lives/metadata-review', require('../routes/liveMetadataReview'));
    app.use('/api/live-artists', require('../routes/liveArtists'));
    if (browserVerification || builtWorkerVerification) {
        // 一覧/詳細は実ルート。起動時の外部Push設定も送信も読み込ませない。
        const pushPath = require.resolve('../utils/pushNotification');
        require.cache[pushPath] = { id: pushPath, filename: pushPath, loaded: true, exports: {
            notifyNewLive: async () => { throw new Error('Push is prohibited in disposable browser verification'); },
        } };
        app.use('/api/lives', require('../routes/lives'));
    }
    httpServer = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    const url = `http://127.0.0.1:${httpServer.address().port}`;
    const adminToken = verifyAuth ? await verifyAuth(url, passed) : null;
    const headers = adminToken ? { token: adminToken } : {};
    const get = target => fetch(url + target, { headers });
    const patch = (target, body) => fetch(url + target, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const current = await (await get('/api/lives/1/metadata')).json();
    assert.equal(current.revision, 3);
    const results = await Promise.all(['JP', 'US'].map(code => patch('/api/lives/1/metadata', { revision: current.revision, patch: { country: { code } } })));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const actorSearch = await get('/api/live-artists?search=' + encodeURIComponent('ＦＡ'));
    assert.equal(actorSearch.status, 200); assert.equal((await actorSearch.json())[0].id, 10);
    const rename = await patch('/api/live-artists/10', { name: 'Renamed Artist', aliases: ['ＦＡ'], revision: 0 });
    assert.equal(rename.status, 200);
    const queue = await get('/api/lives/metadata-review');
    assert.equal(queue.status, 200); assert.equal((await queue.json()).length, 4);
    if (realAuth) {
        assert.equal((await pool.query('SELECT actor_id FROM live_metadata_history WHERE live_id=1 ORDER BY id DESC LIMIT 1')).rows[0].actor_id, 1);
        assert.equal((await pool.query('SELECT actor_id FROM live_artist_history WHERE artist_id=10 ORDER BY id DESC LIMIT 1')).rows[0].actor_id, 1);
    }
    passed('Real API SQL: metadata lock/revision conflict, Unicode alias search, dictionary update, review summary');

    const manualBefore = (await pool.query('SELECT overrides FROM live_metadata WHERE live_id=1')).rows[0].overrides;
    const client = await pool.connect();
    try {
        const input = buildSetlistCandidates({ id: 'fixture-id', eventDate: '01-01-2020', tour: { name: 'Fixture Tour' }, venue: { name: 'Fixture Venue', city: { country: { code: 'JP' } } }, url: 'https://example.invalid/fixture' });
        await client.query('BEGIN'); await saveMetadataCandidates(client, 1, input); await client.query('COMMIT');
        await client.query('BEGIN'); const repeated = await saveMetadataCandidates(client, 1, input); await client.query('COMMIT');
        assert.equal(repeated.changed, false);
        assert.deepEqual(repeated.overrides, manualBefore);
    } finally { client.release(); }
    assert.equal((await pool.query('SELECT * FROM live_collaborators')).rowCount, 2);
    passed('Actual reimport keeps manual confirmations/roles and identical candidates do not bump revision');
    for (const [sql, code] of [
        ["INSERT INTO live_collaborators VALUES (1,999,'guest')", '23503'],
        ["INSERT INTO live_collaborators VALUES (1,10,'co_headliner')", '23505'],
        ["INSERT INTO live_collaborators VALUES (1,10,'festival_act')", '23514'],
        ["DELETE FROM live_artists WHERE id=10", ['23503', '23001']],
    ]) await assert.rejects(pool.query(sql), error => (Array.isArray(code) ? code : [code]).includes(error.code));
    passed('Collaborator FK, duplicate-role, role CHECK and referenced-artist deletion constraints');
    if (browserVerification) await require('./verify-live-metadata-browser').verifyMetadataBrowser({ root, temp, pool, httpServer, freePort, passed, workerVerification });
    if (builtWorkerVerification) await require('./verify-built-metadata-worker').verifyBuiltWorker({ root, temp, pool, app, httpServer, passed });
    console.log(`All ${checkpoints.length} disposable PostgreSQL checkpoints passed. No application database used.`);
}
async function cleanup() {
    if (httpServer) { httpServer.closeAllConnections(); await new Promise(resolve => httpServer.close(resolve)); }
    if (pool) await pool.end();
    if (startAttempted) {
        let running = false;
        try { run('pg_ctl', ['-D', data, 'status']); running = true; }
        catch (error) { if (error.status !== 3) throw error; }
        if (running) run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
    }
    fs.rmSync(temp, { recursive: true, force: true });
}
main().catch(error => {
    console.error(`Fixture DB verification failed: ${error.message}`); process.exitCode = 1;
}).finally(() => cleanup().catch(error => {
    console.error(`Fixture cleanup failed: ${error.message}. Disposable files remain at ${temp}`); process.exitCode = 1;
}));
