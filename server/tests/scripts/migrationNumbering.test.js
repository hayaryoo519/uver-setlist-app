const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../../migrations');
describe('追加情報migrationの番号保護', () => {
    it('未配備の追加情報SQLはdevの認証030〜032と重ならない033/034に置く', () => {
        const files = fs.readdirSync(directory);
        expect(files).toEqual(expect.arrayContaining(['033_live_metadata.sql', '034_live_artists.sql']));
        expect(files).not.toContain('030_live_metadata.sql');
        expect(files).not.toContain('031_live_artists.sql');
    });
    it('チェックイン済みSQLの連番prefixを重複させない', () => {
        const numbers = fs.readdirSync(directory).filter(name => /^\d+_.*\.sql$/.test(name)).map(name => Number(name.split('_')[0]));
        expect(new Set(numbers).size).toBe(numbers.length);
    });
});
