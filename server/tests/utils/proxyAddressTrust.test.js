const proxyaddr = require('proxy-addr');
const express = require('express');
const request = require('supertest');

describe('プロキシの信頼範囲', () => {
    it.each(['::ffff:10.0.0.0/8', '::/1'])('%s は範囲外のIPv4とIPv4-mappedアドレスを信頼しない', subnet => {
        const trust = proxyaddr.compile(subnet);
        expect(trust('198.51.100.7')).toBe(false);
        expect(trust('::ffff:198.51.100.7')).toBe(false);
        const req = { socket: { remoteAddress: '198.51.100.7' }, headers: { 'x-forwarded-for': '203.0.113.42' } };
        expect(proxyaddr(req, trust)).toBe('198.51.100.7');
    });

    it.each(['10.0.0.0/8', '::ffff:10.0.0.0/104'])('%s の正しい信頼範囲を維持する', subnet => {
        const trust = proxyaddr.compile(subnet);
        expect(trust('10.0.0.2')).toBe(true);
        expect(trust('::ffff:10.0.0.2')).toBe(true);
        expect(trust('198.51.100.7')).toBe(false);
        expect(trust('::ffff:198.51.100.7')).toBe(false);
    });

    it('複数サブネットでも範囲外のIPv4を信頼しない', () => {
        const trust = proxyaddr.compile(['::ffff:10.0.0.0/8', '203.0.113.0/24']);
        expect(trust('198.51.100.7')).toBe(false);
        expect(trust('::ffff:198.51.100.7')).toBe(false);
        expect(trust('203.0.113.42')).toBe(true);
    });

    it('指定範囲内のネイティブIPv6を維持する', () => {
        expect(proxyaddr.compile('::/1')('2001:db8::1')).toBe(true);
        expect(proxyaddr.compile('::ffff:10.0.0.0/104')('2001:db8::1')).toBe(false);
    });

    it('アプリの1段プロキシ設定は直近の転送元を使う', async () => {
        const app = express();
        app.set('trust proxy', 1);
        app.get('/', (req, res) => res.json({ ip: req.ip, ips: req.ips }));
        const res = await request(app).get('/').set('X-Forwarded-For', '198.51.100.7, 203.0.113.42');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ ip: '203.0.113.42', ips: ['203.0.113.42'] });
    });

    it('転送ヘッダーの先頭を書き換えても同じ判定IPの認証回数制限を回避できない', async () => {
        const { loginLimiter } = require('../../middleware/rateLimiter');
        const app = express();
        app.set('trust proxy', 1);
        app.get('/', loginLimiter, (_req, res) => res.send('ok'));
        for (let i = 1; i <= 5; i++) {
            const res = await request(app).get('/').set('X-Forwarded-For', `198.51.100.${i}, 203.0.113.42`);
            expect(res.statusCode).toBe(200);
        }
        const limited = await request(app).get('/').set('X-Forwarded-For', '198.51.100.99, 203.0.113.42');
        expect(limited.statusCode).toBe(429);
        const other = await request(app).get('/').set('X-Forwarded-For', '198.51.100.99, 203.0.113.43');
        expect(other.statusCode).toBe(200);
    });
});
