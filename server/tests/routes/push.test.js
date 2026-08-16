process.env.JWT_SECRET = 'test-secret';

jest.mock('../../db');
jest.mock('../../utils/pushNotification', () => ({
    saveSubscription: jest.fn().mockResolvedValue({ id: 1 }),
    removeSubscription: jest.fn().mockResolvedValue(undefined),
    getVapidPublicKey: () => 'test-key',
    notifyNewLive: jest.fn().mockResolvedValue({ sent: 0, failed: 0 }),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { saveSubscription } = require('../../utils/pushNotification');
const pushRouter = require('../../routes/push');

const app = express();
app.use(express.json());
app.use('/api/push', pushRouter);

const SUBSCRIPTION = {
    endpoint: 'https://push.example/abc',
    keys: { p256dh: 'key', auth: 'auth' },
};

function subscribe(token) {
    const req = request(app).post('/api/push/subscribe').send({ subscription: SUBSCRIPTION });
    return token ? req.set('token', token) : req;
}

describe('POST /api/push/subscribe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // JWT は { user_id, role } で発行される。
    // 以前は decoded.id を読んでおり user_id が常に NULL で保存され、
    // 管理者宛て通知が誰にも届かなかった。
    it('ログイン中なら購読を user_id に紐付けること', async () => {
        const token = jwt.sign({ user_id: 27, role: 'admin' }, process.env.JWT_SECRET);

        const res = await subscribe(token);

        expect(res.statusCode).toBe(201);
        expect(saveSubscription).toHaveBeenCalledWith(27, SUBSCRIPTION);
    });

    it('未ログインでも購読できるが user_id は null になること', async () => {
        const res = await subscribe(null);

        expect(res.statusCode).toBe(201);
        expect(saveSubscription).toHaveBeenCalledWith(null, SUBSCRIPTION);
    });

    it('不正なトークンでも購読自体は通し、user_id は null にすること', async () => {
        const res = await subscribe('invalid.token.value');

        expect(res.statusCode).toBe(201);
        expect(saveSubscription).toHaveBeenCalledWith(null, SUBSCRIPTION);
    });

    it('user_id を持たないトークンなら null にすること', async () => {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);

        await subscribe(token);

        expect(saveSubscription).toHaveBeenCalledWith(null, SUBSCRIPTION);
    });

    it('購読オブジェクトが不正なら400を返すこと', async () => {
        const res = await request(app).post('/api/push/subscribe').send({ subscription: { endpoint: 'x' } });

        expect(res.statusCode).toBe(400);
        expect(saveSubscription).not.toHaveBeenCalled();
    });
});
