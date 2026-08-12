const crypto = require('crypto');

/**
 * セトリ重複検知用のハッシュ生成ユーティリティ。
 *
 * OCR 取り込み (routes/drafts.js) と X 収集 (services/collector.js) の双方が
 * raw_setlists.raw_text_hash を使って重複を判定するため、
 * 正規化とダイジェストの実装をここに一本化する。
 * 片方だけ変更すると、同じセトリが別ドラフトとして二重登録される。
 */

/**
 * ハッシュ用にテキストを正規化する（大文字化、空白・記号・長音すべて除去）
 * 例: "CORE PRIDE" / "CORE-PRIDE" / "COREPRIDE" → すべて同一ハッシュになる
 */
function normalizeForHash(text) {
    if (!text) return '';
    return text.toUpperCase()
        .replace(/[\s\W_]/g, '')
        .replace(/[！"＃＄％＆'（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～]/g, '')
        .replace(/[ー−―－]/g, '');
}

/**
 * 正規化テキストから 32 文字のハッシュを生成する
 *
 * ダイジェストは MD5。raw_setlists.raw_text_hash が VARCHAR(32) であり、
 * SHA-256 (64文字) を入れると Postgres が
 * "value too long for type character varying(32)" で INSERT を拒否するため。
 * ここでのハッシュは内容の同一性を判定するためのキーであり、
 * 改ざん検知などのセキュリティ用途では使用していない。
 */
function generateHash(text) {
    return crypto.createHash('md5').update(normalizeForHash(text)).digest('hex');
}

module.exports = { normalizeForHash, generateHash };
