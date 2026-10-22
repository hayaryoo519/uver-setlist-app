/** 国コードは保存値のまま、公開画面の表示だけ日本語にする。 */
export function countryName(code: string): string {
    try { return new Intl.DisplayNames(['ja'], { type: 'region' }).of(code) || code; }
    catch { return code; }
}
