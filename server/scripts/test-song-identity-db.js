#!/usr/bin/env node
// Synthetic fixtures only: never load db.js/.env or connect to an existing cluster.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const request = require('supertest');
const express = require('express');
const { resolveSong } = require('../utils/songIdentity');
if (process.env.APP_ENV === 'production') throw new Error('Local synthetic verification only');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uver-song-fixture-'));
const data = path.join(temp, 'data');
const password = randomBytes(32).toString('hex');
const passwordFile = path.join(temp, 'password');
fs.writeFileSync(passwordFile, password, { mode: 0o600 });
const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: temp, TMP: temp, HOME: temp };
const binary = name => process.env.PG_BIN ? path.join(process.env.PG_BIN, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const run = (name, args) => execFileSync(binary(name), args, { env, encoding: 'utf8', timeout: 45000, stdio: name === 'pg_ctl' ? 'ignore' : 'pipe' });
let started = false;
let pool;
async function freePort() {
    return new Promise((resolve, reject) => {
        const socket = net.createServer();
        socket.once('error', reject);
        socket.listen(0, '127.0.0.1', () => {
            const port = socket.address().port;
            socket.close(err => err ? reject(err) : resolve(port));
        });
    });
}
async function transaction(fn) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}
const pass = text => console.log(`PASS: ${text}`);
async function main() {
    const port = await freePort();
    assert(![5432, 54325, 54332].includes(port));
    run('initdb', ['-D', data, '-U', 'song_fixture', '--auth=scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C', '--no-instructions']);
    started = true;
    run('pg_ctl', ['-D', data, '-l', path.join(temp, 'postgres.log'), '-w', '-t', '25', '-o', `-h 127.0.0.1 -p ${port}${process.platform === 'win32' ? '' : " -c unix_socket_directories=''"}`, 'start']);
    pool = new Pool({ host: '127.0.0.1', port, user: 'song_fixture', password, database: 'postgres', ssl: false, connectionTimeoutMillis: 5000 });
    const actual = await pool.query("SELECT current_setting('data_directory') AS directory");
    assert.equal(path.resolve(actual.rows[0].directory).toLowerCase(), path.resolve(data).toLowerCase());
    const migrations = path.join(__dirname, '../migrations');
    for (const name of fs.readdirSync(migrations).filter(x => /^\d+_.*\.sql$/.test(x)).sort()) {
        await transaction(client => client.query(fs.readFileSync(path.join(migrations, name), 'utf8')));
    }
    pass('all existing migrations apply to a dedicated SCRAM-authenticated loopback cluster');
    // Known pre-existing schema gap: CSV expects lives.status, absent from migrations.
    // Keep this compatibility shim local to this synthetic fixture; report the gap.
    await pool.query('ALTER TABLE lives ADD COLUMN status VARCHAR(50)');
    await pool.query(`INSERT INTO songs (id,title) VALUES
        (381,'ROSIER （LUNA SEA Cover）'), (462,'ROSIER (LUNA SEA cover)'),
        (463,'ROSIER (LUNA SEAカバーw/RYUICHIさん)'), (353,'Secret'), (203,'シークレット');
        INSERT INTO lives (id,date,venue) VALUES (1,'2020-01-01','Fixture'),(2,'2021-01-01','Fixture');
        INSERT INTO setlists (live_id,song_id,position,note) VALUES (1,381,1,'fixture note'),(2,463,1,'guest retained');
        SELECT setval(pg_get_serial_sequence('lives','id'),2);`);
    const before = (await pool.query('SELECT * FROM setlists ORDER BY id')).rows;
    assert.equal((await transaction(c => resolveSong(c, 'ROSIER (LUNA SEA cover)'))).song.id, 462);
    await assert.rejects(transaction(c => resolveSong(c, 'rosier (LUNA SEA COVER)')), e => e.songIdentityStatus === 409);
    assert.equal((await transaction(c => resolveSong(c, 'Secret', true))).song.id, 353);
    assert.deepEqual((await pool.query('SELECT * FROM setlists ORDER BY id')).rows, before);
    pass('legacy exact IDs and references stay unchanged; ambiguous variants fail closed; translation collision stays separate');
    await pool.query('DELETE FROM songs WHERE id = 462'); // fixture only, reference-free by construction
    for (const title of ['rosier (LUNA SEA COVER)', 'ROSIER　（ LUNA  SEA Cover ）']) {
        assert.equal((await transaction(c => resolveSong(c, title))).song.id, 381);
    }
    const guest = await transaction(c => resolveSong(c, 'ROSIER (LUNA SEAカバーw/RYUICHIさん)'));
    assert.equal(guest.song.id, 463);
    for (const title of ['ROSIER', 'ROSIER (Other Artist cover)', 'ROSIER (LUNA SEA cover acoustic)', 'Kimi no Suki na Uta (Acoustic Version)']) {
        const resolved = await transaction(c => resolveSong(c, title));
        assert.equal(resolved.created, true); assert.equal(resolved.song.title, title);
    }
    pass('repeat imports reuse 381; guests, artists, base song and versions are not collapsed');
    const concurrent = await Promise.all(Array.from({ length: 4 }, () => transaction(c => resolveSong(c, 'Concurrent Fixture'))));
    assert.equal(new Set(concurrent.map(x => x.song.id)).size, 1);
    assert.equal(concurrent.filter(x => x.created).length, 1);
    pass('concurrent registrations serialize and create only one row');

    // Routes are mounted directly: index.js, collectors and notification startup never run.
    const dbPath = require.resolve('../db');
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { pool, query: (...args) => pool.query(...args) } };
    const authPath = require.resolve('../middleware/authorization');
    require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
        authorize: (req, res, next) => next(), adminCheck: (req, res, next) => next(), optionalAuth: (req, res, next) => next(),
    } };
    const pushPath = require.resolve('../utils/pushNotification');
    require.cache[pushPath] = { id: pushPath, filename: pushPath, loaded: true, exports: { notifyNewLive: async () => { throw new Error('Notifications forbidden'); } } };
    const linePath = require.resolve('../utils/lineNotification');
    require.cache[linePath] = { id: linePath, filename: linePath, loaded: true, exports: { notifyDraftAdded: async () => { throw new Error('Notifications forbidden'); } } };
    const app = express(); app.use(express.json());
    app.use('/songs', require('../routes/songs'));
    app.use('/lives', require('../routes/lives'));
    app.use('/import', require('../routes/import'));
    app.use('/drafts', require('../routes/drafts'));
    assert.equal((await request(app).post('/songs').send({ title: 'rosier (LUNA SEA COVER)' })).status, 409);
    assert.equal((await request(app).put('/songs/463').send({ title: 'rosier (LUNA SEA COVER)' })).status, 409);
    const csv = 'live_date,venue,song,order_no\n2022-01-01,CSV Fixture,rosier (LUNA SEA COVER),1';
    assert.equal((await request(app).post('/import/csv').attach('file', Buffer.from(csv), 'fixture.csv')).status, 200);
    const imported = await request(app).post('/lives/1/import-setlist').send({ songs: [{ title: 'rosier (LUNA SEA COVER)', order: 1 }] });
    assert.equal(imported.status, 200);
    assert.equal((await pool.query('SELECT song_id FROM setlists WHERE live_id=1')).rows[0].song_id, 381);
    await pool.query("INSERT INTO raw_setlists (id,live_id,raw_text) VALUES (1,1,'synthetic fixture')");
    assert.equal((await request(app).post('/drafts/1/commit').send({ liveId: 1, setlist: [{ title: 'rosier (LUNA SEA COVER)', position: 1 }] })).status, 200);
    assert.equal((await pool.query('SELECT song_id FROM setlists WHERE live_id=1')).rows[0].song_id, 381);
    const renamed = await transaction(c => resolveSong(c, 'Rename Fixture'));
    assert.equal((await request(app).put(`/songs/${renamed.song.id}`).send({ title: 'Renamed Fixture' })).status, 200);
    assert.equal((await pool.query('SELECT normalized_title FROM songs WHERE id=$1', [renamed.song.id])).rows[0].normalized_title, 'renamed fixture');
    assert.equal((await transaction(c => resolveSong(c, 'Rename Fixture'))).created, true);
    const axios = require('axios');
    const originalGet = axios.get;
    axios.get = async () => ({ data: { total: 1, itemsPerPage: 20, setlist: [{
        id: 'song-identity-fixture', eventDate: '01-01-2023', venue: { name: 'Year Fixture' },
        sets: { set: [{ song: [{ name: 'rosier (LUNA SEA COVER)' }] }] },
    }] } });
    try {
        const { createJob, getJob } = require('../services/collectJob');
        const jobId = createJob(2023, 2023);
        await require('../services/collectYears').collectYears(2023, 2023, 'fixture-not-a-key', jobId);
        assert.equal(getJob(jobId).totalCreated, 1);
        assert.equal((await pool.query("SELECT song_id FROM setlists JOIN lives ON lives.id=setlists.live_id WHERE lives.setlistfm_id='song-identity-fixture'")).rows[0].song_id, 381);
    } finally { axios.get = originalGet; }
    pass('real PostgreSQL manual create/edit, rename/re-register, CSV, draft, single and year import use the reviewed identity');
    const old = (await pool.query('SELECT * FROM setlists WHERE live_id=1')).rows;
    await pool.query("INSERT INTO songs (id,title) VALUES (462,'ROSIER (LUNA SEA cover)')");
    assert.equal((await request(app).post('/lives/1/import-setlist').send({ songs: [{ title: 'rosier (LUNA SEA COVER)' }] })).status, 409);
    assert.deepEqual((await pool.query('SELECT * FROM setlists WHERE live_id=1')).rows, old);
    assert.equal((await request(app).get('/songs/462/stats')).status, 200);
    assert.equal((await request(app).get('/songs/463/stats')).status, 200);
    pass('failed replacement rolls back; old numeric URLs and guest stats remain readable');
    // Proposed merge is rehearsed under ROLLBACK only, without an alias model.
    await pool.query(`INSERT INTO users (id,username,email,password) VALUES (1,'Fixture','fixture@example.invalid','not-a-real-hash');
        INSERT INTO predictions (id,user_id,live_id) VALUES (1,1,1);
        INSERT INTO prediction_songs (prediction_id,song_id,position) VALUES (1,462,1);
        INSERT INTO setlists (live_id,song_id,position,note) VALUES (1,462,2,'duplicate fixture reference');`);
    const snapshot = (await pool.query('SELECT * FROM setlists ORDER BY id')).rows;
    const predictionSnapshot = (await pool.query('SELECT * FROM prediction_songs ORDER BY id')).rows;
    const unionCount = new Set(snapshot.filter(row => [381, 462].includes(row.song_id)).map(row => row.live_id)).size;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE setlists SET song_id=381 WHERE song_id=462');
        await client.query('UPDATE prediction_songs SET song_id=381 WHERE song_id=462');
        assert.equal((await client.query('SELECT song_id FROM prediction_songs WHERE prediction_id=1')).rows[0].song_id, 381);
        assert.equal((await client.query('SELECT COUNT(DISTINCT live_id)::int AS n FROM setlists WHERE song_id=381')).rows[0].n, unionCount);
        assert.equal((await client.query('SELECT title FROM songs WHERE id=463')).rows[0].title, 'ROSIER (LUNA SEAカバーw/RYUICHIさん)');
        await client.query('ROLLBACK');
    } finally { client.release(); }
    assert.deepEqual((await pool.query('SELECT * FROM setlists ORDER BY id')).rows, snapshot);
    assert.deepEqual((await pool.query('SELECT * FROM prediction_songs ORDER BY id')).rows, predictionSnapshot);
    pass('reference-update rehearsal rolls back exactly; no merge/alias schema is shipped');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => {
    if (pool) await pool.end();
    if (started) {
        try { run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']); }
        catch { console.error('Fixture cluster stop failed; inspect the dedicated temporary directory'); process.exitCode = 1; return; }
    }
    fs.rmSync(temp, { recursive: true, force: true });
});
