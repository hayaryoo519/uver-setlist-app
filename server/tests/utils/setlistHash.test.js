const { generateHash, normalizeForHash } = require('../../utils/setlistHash');

const SETLIST = ['CORE PRIDE', 'IMPACT', '7th Trigger'].join('\n');

describe('setlistHash', () => {
    describe('generateHash', () => {
        // raw_setlists.raw_text_hash は VARCHAR(32)。
        // これを超えると Postgres が INSERT を拒否する（過去に SHA-256 で発生）
        it('必ず32文字に収まること', () => {
            expect(generateHash(SETLIST)).toHaveLength(32);
            expect(generateHash('')).toHaveLength(32);
            expect(generateHash('あ'.repeat(5000))).toHaveLength(32);
        });

        it('16進文字列であること', () => {
            expect(generateHash(SETLIST)).toMatch(/^[0-9a-f]{32}$/);
        });

        it('同じ内容なら同じハッシュになること', () => {
            expect(generateHash(SETLIST)).toBe(generateHash(SETLIST));
        });

        it('表記揺れを吸収すること', () => {
            expect(generateHash('CORE PRIDE')).toBe(generateHash('core-pride'));
            expect(generateHash('CORE PRIDE')).toBe(generateHash('COREPRIDE'));
        });

        it('内容が違えば別のハッシュになること', () => {
            expect(generateHash('CORE PRIDE')).not.toBe(generateHash('IMPACT'));
        });
    });

    describe('normalizeForHash', () => {
        it('null / undefined を空文字として扱うこと', () => {
            expect(normalizeForHash(null)).toBe('');
            expect(normalizeForHash(undefined)).toBe('');
        });

        it('空白・記号・長音を除去すること', () => {
            expect(normalizeForHash('CORE PRIDE-ー')).toBe('COREPRIDE');
        });
    });

    // OCR 取り込みと X 収集が同じハッシュを出さないと、
    // 同一セトリが別ドラフトとして二重登録される
    describe('OCR取り込みとX収集の実装一致', () => {
        it.each([
            ['routes/drafts.js', '../../routes/drafts.js'],
            ['services/collector.js', '../../services/collector.js'],
        ])('%s が共通実装を参照し、独自のダイジェストを持たないこと', (_name, modulePath) => {
            const source = require('fs').readFileSync(require.resolve(modulePath), 'utf8');

            expect(source).toContain("require('../utils/setlistHash')");
            expect(source).not.toMatch(/createHash\(/);
        });
    });
});
