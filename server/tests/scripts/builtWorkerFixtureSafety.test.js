jest.mock('@playwright/test', () => ({ chromium: {}, devices: {}, expect: jest.fn() }));
const path = require('node:path');
const os = require('node:os');
const { verifyBuiltWorker } = require('../../scripts/verify-built-metadata-worker');
const temp = path.join(os.tmpdir(), 'uver-metadata-db-built-mock');
describe('本番生成物fixtureの起動前保護', () => {
    it('所有DBでない場合はbuildや環境変更前に拒否する', async () => {
        const before = process.env.NODE_ENV; const cwd = process.cwd();
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ directory: path.join(os.tmpdir(), 'unowned', 'data') }] }) };
        await expect(verifyBuiltWorker({ temp, pool })).rejects.toThrow();
        expect(process.env.NODE_ENV === before).toBe(true); expect(process.cwd()).toBe(cwd);
    });
    it('所有Expressと異なるHTTPサーバーでは配信/buildしない', async () => {
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ directory: path.join(temp, 'data') }] }) };
        await expect(verifyBuiltWorker({ temp, pool, app: () => {}, httpServer: { listening: true, listeners: () => [] } })).rejects.toThrow('in-process fixture Express server');
    });
});
