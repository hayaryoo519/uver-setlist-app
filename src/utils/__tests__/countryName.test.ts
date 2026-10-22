import { describe, expect, it } from 'vitest';
import { countryName } from '../countryName';

describe('国名の公開表示', () => {
    it.each([['JP', '日本'], ['KR', '韓国'], ['US', 'アメリカ合衆国']])('%sを日本語で表示する', (code, label) => {
        expect(countryName(code)).toBe(label);
    });

    it('形式が不正なコードでも画面を落とさず元の文字列を返す', () => {
        expect(countryName('not-a-country')).toBe('not-a-country');
        expect(countryName('')).toBe('');
    });
});
