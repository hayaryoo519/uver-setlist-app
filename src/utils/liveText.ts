/**
 * ライブ情報のテキスト処理に関するユーティリティ
 */

/**
 * ライブテキストの正規化
 * - 小文字化
 * - Unicode正規化 (NFKC: 全角英数を半角に、等)
 * - 記号・引用符・空白・波ダッシュ等の除去
 */
export const normalizeLiveText = (str: string | null | undefined = ''): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[〜～~－─—―\-\s　“”""''’‘()（）「」『』【】［］｛｝]/g, '');
};

// 重複判定で無視して良い言葉
const IGNORE_WORDS = [
  'uverworld',
  'presents',
  'tour',
  'live',
];

// 差分にあっても「意味がある」とみなす言葉
const MEANINGFUL_WORDS = [
  'final',
  'day',
  'night',
  '生誕祭',
  '男祭り',
  '女祭り',
  'birthday',
  '誕',
  '祭',
];

/**
 * ツアー名とタイトルを比較し、表示すべきサブタイトルを決定する
 * 重複している場合は null を返す
 */
export const getDisplaySubtitle = (tourName: string | null | undefined = '', title: string | null | undefined = ''): string | null => {
  if (!title) return null;

  const normTour = normalizeLiveText(tourName);
  const normTitle = normalizeLiveText(title);

  // 1. 完全一致なら非表示
  if (normTour === normTitle) return null;

  // 2. どちらかがどちらかを含んでいるかチェック (誤爆防止のため5文字以上の条件を追加)
  const isSubset =
    normTour.length >= 5 &&
    normTitle.length >= 5 &&
    (normTitle.includes(normTour) || normTour.includes(normTitle));

  if (isSubset) {
    // 差分を抽出
    const diff = normTitle.includes(normTour)
      ? normTitle.replace(normTour, '')
      : normTour.replace(normTitle, '');

    // 意味のある差分が含まれているかチェック
    // (正規化後の比較にすることで「Final」と「final」の違いなども吸収)
    const hasMeaningfulDiff = MEANINGFUL_WORDS.some(word => 
      normalizeLiveText(diff).includes(normalizeLiveText(word))
    );
    
    if (hasMeaningfulDiff) return title;

    // 無視して良い言葉と西暦を除去
    let cleanDiff = diff;
    IGNORE_WORDS.forEach(word => {
      cleanDiff = cleanDiff.replace(new RegExp(word, 'g'), '');
    });
    cleanDiff = cleanDiff.replace(/[0-9]{4}/g, '');

    // 差分が空（または無視して良い言葉のみ）なら重複とみなす
    if (cleanDiff.length === 0) return null;
  }

  return title;
};
