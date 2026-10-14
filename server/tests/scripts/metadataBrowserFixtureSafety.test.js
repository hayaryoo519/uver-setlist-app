// DB/ブラウザとも偽物。接続先検証がVite起動や環境変更より前に走ることを確認。
jest.mock('@playwright/test', () => ({ chromium: { launch: jest.fn() }, devices: {}, expect: jest.fn() }));
const path = require('node:path');
const os = require('node:os');
const { verifyMetadataBrowser } = require('../../scripts/verify-live-metadata-browser');
const temp = path.join(os.tmpdir(), 'uver-metadata-db-mock-browser');
const ownedPool = () => ({ query: jest.fn().mockResolvedValue({ rows: [{ directory: path.join(temp, 'data') }] }) });

describe('実APIブラウザfixtureの所有権保護', () => {
    it('所有DBでない場合はブラウザ/APIへ接続する前に拒否する', async () => {
        const previousApi = process.env.VITE_API_URL;
        const previousDirectory = process.cwd();
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ directory: path.join(os.tmpdir(), 'unowned', 'data') }] }) };
        await expect(verifyMetadataBrowser({ temp, pool })).rejects.toThrow('Refuse an unowned browser DB');
        expect(process.env.VITE_API_URL === previousApi).toBe(true);
        expect(process.cwd()).toBe(previousDirectory);
    });
    it('APIの任意URLだけを渡しても、その接続先を利用しない', async () => {
        await expect(verifyMetadataBrowser({ temp, pool: ownedPool(), apiUrl: 'https://outside.example.invalid' })).rejects.toThrow('in-process fixture HTTP server');
    });
    it('HTTPサーバーが外部公開bindなら起動前に拒否する', async () => {
        await expect(verifyMetadataBrowser({ temp, pool: ownedPool(), httpServer: {
            listening: true, address: () => ({ address: '0.0.0.0', port: 65431 }),
        } })).rejects.toThrow('loopback-only');
    });
});
