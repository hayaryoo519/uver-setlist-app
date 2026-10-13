jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../utils/pushNotification', () => ({ saveSubscription: jest.fn().mockResolvedValue({ id: 1 }) }));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const { authorize, adminCheck } = require('../../middleware/authorization');
const { saveSubscription } = require('../../utils/pushNotification');
const app = express();
app.use(express.json());
app.get('/protected', authorize, (req, res) => res.json(req.user));
app.get('/admin', authorize, adminCheck, (req, res) => res.send('admin'));
for (const route of ['users', 'follows', 'lives', 'predictions', 'songs', 'push']) app.use(`/${route}`, require(`../../routes/${route}`));

describe('current account authorization and signed optional identity', () => {
    const originalSecret = process.env.JWT_SECRET;
    const key = 'isolated-current-account-key';
    const marker = 'private-account-error@example.invalid';
    let account, lookupFailure;
    const token = (payload = { user_id: 1, role: 'admin' }, signingKey = key, options = {}) => jwt.sign(payload, signingKey, options);
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = key;
        account = { id: 1, role: 'user', session_version: 0 };
        lookupFailure = false;
        for (const method of ['log', 'warn', 'error']) jest.spyOn(console, method).mockImplementation(() => {});
        db.query.mockImplementation(async (sql, params) => {
            if (sql.startsWith('SELECT id, role, session_version FROM users')) {
                if (lookupFailure) throw new Error(marker);
                expect(sql).toContain('deleted_at IS NULL');
                expect(params).toEqual([1]);
                return { rows: account ? [account] : [] };
            }
            return { rows: [] };
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    });
    it('uses current DB role instead of the stored admin claim', async () => {
        const staleAdmin = token();
        expect((await request(app).get('/protected').set('token', staleAdmin)).body.role).toBe('user');
        expect((await request(app).get('/admin').set('token', staleAdmin)).status).toBe(403);
        account.role = 'admin';
        expect((await request(app).get('/admin').set('token', token({ user_id: 1, role: 'user' }))).status).toBe(200);
    });
    it('rechecks the account on each request and rejects deletion or disappearance', async () => {
        const signed = token();
        expect((await request(app).get('/protected').set('token', signed)).status).toBe(200);
        account = null;
        expect((await request(app).get('/protected').set('token', signed)).status).toBe(403);
        expect((await request(app).get('/admin').set('token', signed)).status).toBe(403);
    });
    it.each([{}, { user_id: '1' }, { user_id: -1 }, { user_id: 1.5 }])('rejects invalid signed identity %j without DB access', async payload => {
        const res = await request(app).get('/protected').set('token', token(payload));
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.length).toBe(0);
    });
    it('does not disclose or authorize on a DB lookup failure', async () => {
        lookupFailure = true;
        const res = await request(app).get('/admin').set('token', token());
        expect(res.status).toBe(503);
        expect(res.text).not.toContain(marker);
        expect(JSON.stringify(console.error.mock.calls)).not.toContain(marker);
    });
    const publicCases = [
        ['/predictions/lives', 0, 200], ['/predictions?live_id=2', 0, 200], ['/predictions/2', 0, 404],
        ['/lives/2', 1, 404], ['/users/2/profile', 1, 404], ['/users/2/predictions', 1, 200], ['/follows/stats/2', 1, 200]
    ];
    it.each(publicCases)('ignores a forged identity at %s', async (path, identityIndex, status) => {
        const res = await request(app).get(path).set('token', token(undefined, 'wrong-key'));
        expect(res.status).toBe(status);
        expect(db.query.mock.calls.length).toBe(1);
        expect(db.query.mock.calls[0][1][identityIndex]).toBeNull();
    });
    it.each(publicCases)('preserves a currently active signed identity at %s', async (path, identityIndex, status) => {
        const res = await request(app).get(path).set('token', token());
        expect(res.status).toBe(status);
        expect(db.query.mock.calls.length).toBe(2);
        expect(db.query.mock.calls[1][1][identityIndex]).toBe(1);
    });
    it.each(['expired', 'deleted'])('rejects private prediction filtering with %s authentication', async mode => {
        if (mode === 'deleted') account = null;
        const signed = mode === 'expired' ? token(undefined, key, { expiresIn: -1 }) : token();
        const res = await request(app).get('/predictions?mine=true').set('token', signed);
        expect(res.status).toBe(401);
        expect(db.query.mock.calls.every(([sql]) => sql.startsWith('SELECT id, role, session_version FROM users'))).toBe(true);
    });

    it.each(['missing', 'forged', 'expired', 'deleted', 'revoked'])('rejects the private prediction alias with %s authentication', async mode => {
        if (mode === 'deleted') account = null;
        if (mode === 'revoked') account.session_version = 1;
        const signed = mode === 'forged' ? token(undefined, 'wrong-key')
            : mode === 'expired' ? token(undefined, key, { expiresIn: -1 }) : token();
        const req = request(app).get('/predictions/me?mine=false');
        const res = await (mode === 'missing' ? req : req.set('token', signed));
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.every(([sql]) => sql.startsWith('SELECT id, role, session_version FROM users'))).toBe(true);
    });

    it('the private prediction alias filters the signed current account', async () => {
        const res = await request(app).get('/predictions/me?mine=false').set('token', token());
        expect(res.status).toBe(200);
        const listing = db.query.mock.calls.find(([sql]) => sql.includes('FROM predictions p'));
        expect(listing[0]).toContain('AND p.user_id = $2');
        expect(listing[1]).toEqual([1, 1]);
    });
    it('does not expose soft-deleted songs to a stale admin JWT', async () => {
        const res = await request(app).get('/songs?include_deleted=true').set('token', token());
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.length).toBe(1);
        account.role = 'admin';
        const allowed = await request(app).get('/songs?include_deleted=true').set('token', token());
        expect(allowed.status).toBe(200);
        expect(db.query.mock.calls[2][0]).not.toContain('deleted_at IS NULL');
    });
    it('does not associate push subscriptions with deleted accounts', async () => {
        account = null;
        const subscription = { endpoint: 'https://push.example.invalid/test', keys: { auth: 'fake', p256dh: 'fake' } };
        const res = await request(app).post('/push/subscribe').set('token', token()).send({ subscription });
        expect(res.status).toBe(201);
        expect(saveSubscription).toHaveBeenCalledWith(null, subscription);
    });
    it('fails push identity lookup without saving an authenticated subscription', async () => {
        lookupFailure = true;
        const res = await request(app).post('/push/subscribe').set('token', token()).send({});
        expect(res.status).toBe(503);
        expect(saveSubscription.mock.calls.length).toBe(0);
    });
});
