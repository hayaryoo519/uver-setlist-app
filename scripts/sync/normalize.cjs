const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 辞書の読み込み
const venuesDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'dictionaries/venues.json'), 'utf8'));

/**
 * 文字列の基本正規化
 * - NFKC (全角 -> 半角)
 * - 小文字化
 * - 連続空白の集約
 */
function basicNormalize(text) {
    if (!text) return '';
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\s　]+/g, ' ')
        .trim();
}

/**
 * 会場名の正規化
 */
function normalizeVenue(venue) {
    const basic = basicNormalize(venue);
    // 辞書マッチ（完全一致または基本正規化後のマッチ）
    if (venuesDict[venue]) return venuesDict[venue];
    if (venuesDict[basic]) return venuesDict[basic];
    
    // 特定のキーワード置換（例: 括弧内の都道府県削除など）
    return basic.replace(/\(.*\)$/, '').trim();
}

/**
 * タイトルの正規化
 */
function normalizeTitle(title) {
    return basicNormalize(title)
        .replace(/～/g, '-')
        .replace(/[（]/g, '(')
        .replace(/[）]/g, ')')
        .replace(/\(\d+\)$/, '') // 末尾の出現回数 (n) を削除
        .trim();
}

/**
 * ツアー名の正規化
 */
function normalizeTourName(tourName) {
    return normalizeTitle(tourName); // タイトルと同じルールを適用
}

/**
 * インテリジェント分解用の辞書
 */
const DICTIONARIES = {
    titleKeywords: ['day live', 'night live', '昼公演', '夜公演', '追加公演', 'final', 'ファイナル'],
    specialNoteKeywords: ['男祭り', '女祭り', 'xmas', 'クリスマス', '生誕祭', 'premium live', 'プレミアムライブ', 'vs']
};

/**
 * サブタイトルと特記事項の抽出
 */
function decomposeTitle(rawTitle) {
    const basic = basicNormalize(rawTitle);
    let tourName = rawTitle;
    let title = null;
    let specialNotes = [];

    // 1. サブタイトルの抽出 (辞書に完全一致する部分を探す)
    DICTIONARIES.titleKeywords.forEach(keyword => {
        const regex = new RegExp(`[\\s\\(（]${keyword}[\\s\\)）]?$`, 'i');
        if (regex.test(basic)) {
            title = keyword;
            tourName = tourName.replace(new RegExp(`[\\s\\(（]?${keyword}[\\s\\)）]?$`, 'i'), '').trim();
        }
    });

    // 2. 特記事項の抽出
    DICTIONARIES.specialNoteKeywords.forEach(keyword => {
        if (basic.includes(keyword)) {
            specialNotes.push(keyword);
        }
    });

    return {
        tourName,
        title,
        specialNote: specialNotes.join(', ') || null
    };
}

/**
 * 外部ソースID（Hash）の生成
 * sha256(date + normalized_tour_name + normalized_venue + normalized_title)
 */
function generateExternalSourceId(date, tourName, venue, title = '') {
    const normTour = normalizeTourName(tourName);
    const normVenue = normalizeVenue(venue);
    const normTitle = normalizeTitle(title);
    const input = `${date}|${normTour}|${normVenue}|${normTitle}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = {
    normalizeVenue,
    normalizeTitle,
    normalizeTourName,
    decomposeTitle,
    generateExternalSourceId,
    VERSION: '2.0.0'
};
