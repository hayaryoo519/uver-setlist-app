const { createRequire } = require('module');
const fromGlob = createRequire(require.resolve('glob/package.json'));

describe.each([
    ['1.x', require('brace-expansion')],
    ['2.x', fromGlob('brace-expansion')],
])('brace-expansion %sの安全性と互換性', (_version, expand) => {
    it.each([
        ['server/{routes,services}/*.js', ['server/routes/*.js', 'server/services/*.js']],
        ['file{1..3}.js', ['file1.js', 'file2.js', 'file3.js']],
        ['x{a,{b,c}}y', ['xay', 'xby', 'xcy']],
        ['file\\{a,b\\}.js', ['file{a,b}.js']],
    ])('通常パターン %s の展開を維持する', (pattern, expected) => {
        expect(expand(pattern)).toEqual(expected);
    });

    it('深い単一グループでもスタックを使い切らない', () => {
        const result = expand('{'.repeat(4000) + 'a,b' + '}'.repeat(4000));
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(2);
    });

    it('深い選択グループでもスタックを使い切らない', () => {
        const result = expand('{a,'.repeat(4000) + 'z' + '}'.repeat(4000));
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(4001);
    });

    it('長い閉じ括弧の再解析を制限する', () => {
        const result = expand('{a}' + '}'.repeat(16000) + ',z}');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(2);
    });
});

it('nodemonが使用するminimatchの通常ファイル判定を維持する', () => {
    const minimatch = require('minimatch');
    expect(minimatch('server/routes/auth.js', 'server/{routes,services}/*.js')).toBe(true);
    expect(minimatch('server/tests/auth.js', 'server/{routes,services}/*.js')).toBe(false);
});
