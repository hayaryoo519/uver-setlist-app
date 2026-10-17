// test-live-metadata-db.jsだけから使う。既存DB/.env/SMTP/外部サービスへ接続しない。
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('node:path');

async function installRealAuthFixture(pool, app, expectedDataDirectory) {
    assert.equal(typeof expectedDataDirectory, 'string', 'Only the disposable runner may install this fixture');
    assert(path.basename(path.dirname(expectedDataDirectory)).startsWith('uver-metadata-db-'), 'Require a runner-owned cluster directory');
    const actual = (await pool.query("SELECT current_setting('data_directory') AS directory")).rows[0].directory;
    const normalize = value => path.resolve(value).replace(/\\/g, '/').toLowerCase();
    assert.equal(normalize(actual), normalize(expectedDataDirectory), 'Refuse an unowned DB before creating authentication fixtures');
    const secret = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = secret; // 親のキーを使わず、このプロセスだけの鍵で実際に署名/検証。
    const dotenvPath = require.resolve('dotenv');
    require.cache[dotenvPath] = { id: dotenvPath, filename: dotenvPath, loaded: true, exports: { config: () => ({ parsed: {} }) } };
    const emailPath = require.resolve('../utils/email');
    const noEmail = async () => { throw new Error('Email is prohibited in disposable auth verification'); };
    require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendVerificationEmail: noEmail, sendPasswordResetEmail: noEmail } };
    const password = 'fixture-only-password';
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET email='admin@fixture.invalid', password=$1, role='admin', is_verified=true WHERE id=1", [hash]);
    await pool.query("INSERT INTO users(id,email,username,password,role,is_verified) VALUES (2,'user@fixture.invalid','Fixture User',$1,'user',true)", [hash]);
    // db.jsは呼び出し側がテスト所有Poolに置換済み。認可/limiter/ログインは実コード。
    app.use('/api/auth', require('../routes/auth'));

    return async function verify(url, passed) {
        const login = (email, suppliedPassword = password) => fetch(url + '/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: suppliedPassword }),
        });
        const wrong = await login('admin@fixture.invalid', 'incorrect-fixture-password');
        assert.equal(wrong.status, 401);
        assert.equal((await wrong.json()).token, undefined);
        const adminResponse = await login('admin@fixture.invalid');
        assert.equal(adminResponse.status, 200);
        const admin = await adminResponse.json();
        assert.equal(jwt.verify(admin.token, secret).role, 'admin');
        assert.equal(admin.user.id, 1);
        const userResponse = await login('user@fixture.invalid');
        assert.equal(userResponse.status, 200);
        const user = await userResponse.json();
        assert.equal(jwt.verify(user.token, secret).role, 'user');
        const security = await pool.query("SELECT event_type FROM security_logs WHERE event_type IN ('login_failed','login_success') ORDER BY id");
        assert.deepEqual(security.rows.map(row => row.event_type), ['login_failed', 'login_success', 'login_success']);
        passed('Real bcrypt login/JWT issuance/security audit: wrong password rejected, admin/user issued genuine signed tokens');

        const snapshot = async () => {
            const result = {};
            for (const table of ['live_metadata', 'live_metadata_history', 'live_artists', 'live_artist_history', 'live_collaborators']) {
                result[table] = (await pool.query(`SELECT * FROM ${table} ORDER BY to_jsonb(${table})`)).rows;
            }
            return result;
        };
        const before = await snapshot();
        const pieces = user.token.split('.');
        const forgedPayload = Buffer.from(JSON.stringify({ ...jwt.decode(user.token), role: 'admin' })).toString('base64url');
        const forged = `${pieces[0]}.${forgedPayload}.${pieces[2]}`;
        const expired = jwt.sign({ user_id: 1, role: 'admin', exp: 1 }, secret);
        const invalidSignature = jwt.sign({ user_id: 1, role: 'admin' }, crypto.randomBytes(32).toString('hex'));
        const protectedEndpoints = [
                ['/api/lives/1/metadata', 'GET'],
                ['/api/lives/metadata-review', 'GET'],
                ['/api/live-artists', 'GET'],
                ['/api/lives/1/metadata', 'PATCH', { revision: 3, patch: { country: { code: 'US' } } }],
                ['/api/live-artists', 'POST', { name: 'Prohibited Fixture Artist', aliases: [] }],
                ['/api/live-artists/10', 'PATCH', { name: 'Prohibited Fixture Rename', aliases: [], revision: 0 }],
        ];
        for (const token of [null, user.token, forged, expired, invalidSignature]) {
            for (const [target, method, body] of protectedEndpoints) {
                const response = await fetch(url + target, { method, headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
                assert.equal(response.status, 403, `${method} ${target} must reject unauthorized access`);
                const payload = await response.json();
                assert.deepEqual(Object.keys(payload), ['message'], 'Private metadata must not be returned with a denial');
                if (token === user.token) assert(!payload.message.startsWith('認証されていません'), 'Permission denial must not masquerade as session expiry');
                else assert(payload.message.startsWith('認証されていません'), 'Invalid session must remain identifiable to the frontend');
            }
        }
        assert.deepEqual(await snapshot(), before, 'Denied requests must not mutate metadata/dictionary/relations/history');
        passed('Actual authorization: missing/user/forged/expired/wrong-signature tokens denied on six endpoints without disclosure or DB mutation');

        const denyCurrentAccount = async sessionExpired => {
            for (const [target, method, body] of protectedEndpoints) {
                const denied = await fetch(url + target, { method, headers: { token: admin.token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
                assert.equal(denied.status, 403);
                const payload = await denied.json(); assert.deepEqual(Object.keys(payload), ['message']);
                assert.equal(payload.message.startsWith('認証されていません'), sessionExpired);
            }
            assert.deepEqual(await snapshot(), before, 'Current account denial must not mutate metadata');
        };
        await pool.query("UPDATE users SET role='user' WHERE id=1");
        await denyCurrentAccount(false); // 署名済みJWTの古いadmin claimを信用しない。
        await pool.query("UPDATE users SET role='admin', session_version=session_version+1 WHERE id=1");
        await denyCurrentAccount(true);
        await pool.query('UPDATE users SET session_version=session_version-1, deleted_at=NOW() WHERE id=1');
        await denyCurrentAccount(true);
        await pool.query('UPDATE users SET deleted_at=NULL WHERE id=1');
        passed('Current account authorization: role downgrade, revoked session and deleted user denied on six endpoints');

        const refreshedResponse = await login('admin@fixture.invalid');
        assert.equal(refreshedResponse.status, 200);
        const refreshed = await refreshedResponse.json();
        assert.equal(jwt.verify(refreshed.token, secret).user_id, 1);
        const response = await fetch(url + '/api/lives/1/metadata', { headers: { token: refreshed.token } });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).live_id, 1);
        passed('Login after expired token restores actual administrator metadata access');
        const finalAllowed = await login('admin@fixture.invalid');
        assert.equal(finalAllowed.status, 200);
        const auditBeforeLimit = (await pool.query('SELECT COUNT(*)::int AS count FROM security_logs')).rows[0].count;
        const limited = await login('admin@fixture.invalid');
        assert.equal(limited.status, 429);
        assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM security_logs')).rows[0].count, auditBeforeLimit);
        passed('Actual login limiter rejects the sixth attempt before login DB effects');
        return refreshed.token;
    };
}

module.exports = { installRealAuthFixture };
