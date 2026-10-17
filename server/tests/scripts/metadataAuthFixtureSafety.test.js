// Poolは偽物。既存DB/親の秘密鍵を使わず、拒否が変更より前に起きることを確認。
const path = require('node:path');
const os = require('node:os');
const { installRealAuthFixture } = require('../../scripts/verify-live-metadata-auth');

describe('実認証fixtureの接続先保護', () => {
    it('所有ディレクトリを渡さない呼び出しではSQLを実行しない', async () => {
        const pool = { query: jest.fn() }; const app = { use: jest.fn() };
        await expect(installRealAuthFixture(pool, app)).rejects.toThrow('Only the disposable runner');
        expect(pool.query).not.toHaveBeenCalled(); expect(app.use).not.toHaveBeenCalled();
    });
    it('data_directoryが異なる場合は資格情報/ユーザー変更前に拒否する', async () => {
        const previousSecret = process.env.JWT_SECRET;
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ directory: path.join(os.tmpdir(), 'not-the-owned-cluster', 'data') }] }) };
        const app = { use: jest.fn() };
        await expect(installRealAuthFixture(pool, app, path.join(os.tmpdir(), 'uver-metadata-db-synthetic', 'data'))).rejects.toThrow('Refuse an unowned DB');
        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(pool.query).toHaveBeenCalledWith("SELECT current_setting('data_directory') AS directory");
        expect(app.use).not.toHaveBeenCalled();
        expect(process.env.JWT_SECRET === previousSecret).toBe(true); // 秘密鍵自体は失敗ログに出さない。
    });
});
