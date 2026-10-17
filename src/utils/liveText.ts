/**
 * ライブ情報のテキスト処理に関するユーティリティ
 */
import tagRules from '../../server/utils/liveTagRules.json';

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

/** 属性の階層。DBのライブ種別とは独立した、テキストから確定できる属性のみ扱う。 */
export const LIVE_TAG_GROUPS = [
  { id: 'event', label: 'イベント属性', tags: [
    { id: 'mens', label: '男祭り' },
    { id: 'womens', label: '女祭り' },
  ] },
  { id: 'format', label: 'ライブ形式', tags: [
    { id: 'vs', label: '対バン' },
  ] },
  { id: 'occasion', label: '記念日・季節', tags: [
    { id: 'birthday', label: '生誕祭' },
    { id: 'christmas', label: 'クリスマス' },
    { id: 'anniversary', label: '周年記念' },
  ] },
  { id: 'region', label: '開催地域', tags: [
    { id: 'overseas', label: '海外公演' },
  ] },
] as const;

type LiveTagDefinition = typeof LIVE_TAG_GROUPS[number]['tags'][number];
export type LiveTag = LiveTagDefinition['id'];
export const LIVE_TAGS = LIVE_TAG_GROUPS.flatMap<LiveTagDefinition>(group => group.tags);

type DetectedLiveTag = keyof typeof tagRules.patterns;
const TAG_PATTERNS = Object.fromEntries(
  Object.entries(tagRules.patterns).map(([id, pattern]) => [id, new RegExp(pattern)]),
) as Record<DetectedLiveTag, RegExp>;

/**
 * タイトル・ツアー名・特記事項から属性を自動判定する。
 * NFKCと大小文字を吸収するが単語境界は残し、別フィールドを連結して誤検出しない。
 * 日付だけで生誕祭等を推測しない。該当タグは定義順に一度だけ返す。
 */
export const detectTags = (
  title: string | null | undefined = '',
  tourName: string | null | undefined = '',
  specialNote: string | null | undefined = '',
): DetectedLiveTag[] => {
  const texts = [title, tourName, specialNote].map(text => (text || '').normalize('NFKC').toLowerCase());
  return (Object.keys(TAG_PATTERNS) as DetectedLiveTag[])
    .filter(tag => texts.some(text => TAG_PATTERNS[tag].test(text)));
};

/** 取得したライブに生成済みタグを付与する。元データは変更しない。 */
export const withLiveTags = <T extends {
  title?: string | null;
  tour_name?: string | { name?: string } | null;
  special_note?: string | null;
  type?: string;
  tags?: readonly string[];
}>(live: T): T & { tags: LiveTag[] } => {
  const tourName = typeof live.tour_name === 'object' ? live.tour_name?.name : live.tour_name;
  // APIの明示的な空配列も尊重する。手動除外をテキスト判定で復活させない。
  const source = Array.isArray(live.tags) ? live.tags : detectTags(live.title, tourName, live.special_note);
  const tags = LIVE_TAGS.filter(tag => source.includes(tag.id)).map(tag => tag.id);
  return { ...live, tags };
};

/** 同じ階層内はOR、異なる階層間はANDで絞り込む。 */
export const matchesLiveTags = (detected: readonly LiveTag[], selected: readonly LiveTag[]): boolean =>
  LIVE_TAG_GROUPS.every(group => {
    const choices = group.tags.filter(tag => selected.includes(tag.id));
    return choices.length === 0 || choices.some(tag => detected.includes(tag.id));
  });

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
