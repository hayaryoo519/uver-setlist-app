const nodemailer = require('nodemailer');
const shared = require('nodemailer/lib/shared');

describe('メール送信ライブラリの回帰確認', () => {
    it('通常の宛先・本文を送信しないJSONトランスポートで維持する', async () => {
        const transport = nodemailer.createTransport({ jsonTransport: true });
        const result = await transport.sendMail({ from: 'sender@example.invalid', to: 'recipient@example.invalid', subject: '確認', html: '<a href="https://fixture.example.invalid/verify-email?token=fixture-token">確認</a>' });
        expect(result.envelope).toEqual({ from: 'sender@example.invalid', to: ['recipient@example.invalid'] });
        expect(JSON.parse(result.message).html).toContain('verify-email?token=fixture-token');
    });

    it.each(['"user"@example.invalid(x)other.invalid', '"a"@b.invalid(c)d.invalid(e)f.invalid'])('コメントに続くドメイン文字列を曖昧な宛先へ連結しない', async recipient => {
        const transport = nodemailer.createTransport({ jsonTransport: true });
        const result = await transport.sendMail({ from: 'sender@example.invalid', to: recipient, text: 'fixture' });
        expect(result.envelope.to.length).toBeGreaterThan(0);
        expect(result.envelope.to.every(address => !/\s/.test(address))).toBe(true);
    });

    it.each(['second.example.invalid', undefined])('DNSキャッシュから別のTLS接続名を流用しない', async servername => {
        const host = 'shared-smtp.example.invalid';
        shared.dnsCache.set(host, { value: { addresses: ['203.0.113.1'], servername: 'first.example.invalid' }, expires: Date.now() + 60000 });
        try {
            const result = await new Promise((resolve, reject) => shared.resolveHostname({ host, servername }, (err, value) => err ? reject(err) : resolve(value)));
            expect(result.cached).toBe(true);
            expect(result.host).toBe('203.0.113.1');
            expect(result.servername).toBe(servername || host);
        } finally { shared.dnsCache.delete(host); }
    });
});
