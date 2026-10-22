import { describe, expect, it } from 'vitest';
import { detectTags, getDisplaySubtitle, matchesLiveTags, withLiveTags } from '../liveText';

describe('detectTags', () => {
  it.each([
    ['UVERworld 男祭り', ['mens']],
    ['女祭り 女性限定LIVE', ['womens']],
    ['TAKUYA∞ 生誕祭', ['birthday']],
    ['誕生祭', ['birthday']],
    ['ＢＩＲＴＨＤＡＹ ＬＩＶＥ', ['birthday']],
    ['Premium X’mas LIVE', ['christmas']],
    ['Xmas', ['christmas']],
    ['Christmas LIVE', ['christmas']],
    ['クリスマスライブ', ['christmas']],
    ['ROCK IN JAPAN FESTIVAL', ['festival']],
    ['COUNTDOWN JAPAN', ['festival']],
    ['イナズマロックフェス', ['festival']],
    ['UVERworld VS. other band', ['vs']],
    ['ACOUSTIC LIVE', []],
    ['20th ANNIVERSARY', ['anniversary']],
    ['結成25周年記念', ['anniversary']],
    ['通常のライブ', []],
    ['Manifest / Festivality / Xmasparty', []],
  ])('%s を判定する', (title, expected) => {
    expect(detectTags(title)).toEqual(expected);
  });

  it('各フィールドを判定し、重複を除いた複数属性を定義順で返す', () => {
    expect(detectTags('男祭り 生誕祭', '男祭り Christmas LIVE', 'ACOUSTIC'))
      .toEqual(['mens', 'birthday', 'christmas']);
  });

  it('空値に対応し、フィールドをまたいで単語を作らない', () => {
    expect(detectTags(null, undefined)).toEqual([]);
    expect(detectTags('birth', 'day')).toEqual([]);
    expect(detectTags('', '', 'TAKUYA∞ 生誕祭')).toEqual(['birthday']);
  });
});

describe('APIの有効タグを保持する', () => {
  it('空タグを名称から再生成しない', () => {
    expect(withLiveTags({ title: '男祭り 生誕祭', tags: [] }).tags).toEqual([]);
  });
  it('保存済み海外タグを保持し、古いAPIだけ名称へフォールバックする', () => {
    expect(withLiveTags({ title: '男祭り', tags: ['overseas'] }).tags).toEqual(['overseas']);
    expect(withLiveTags({ title: '男祭り' }).tags).toEqual(['mens']);
    expect(withLiveTags({ title: '海外公演' }).tags).toEqual([]);
  });
});

describe('matchesLiveTags', () => {
  it('未選択は全件、同じ階層内はOR', () => {
    expect(matchesLiveTags([], [])).toBe(true);
    expect(matchesLiveTags(['mens'], ['mens', 'womens'])).toBe(true);
    expect(matchesLiveTags([], ['mens'])).toBe(false);
  });

  it('異なる階層間はAND', () => {
    expect(matchesLiveTags(['mens', 'birthday'], ['mens', 'womens', 'birthday'])).toBe(true);
    expect(matchesLiveTags(['mens'], ['mens', 'birthday'])).toBe(false);
    expect(matchesLiveTags(['birthday'], ['mens', 'birthday'])).toBe(false);
  });
});

it('既存のサブタイトル判定を維持する', () => {
  expect(getDisplaySubtitle('UVERworld TOUR 2025', 'UVERworld TOUR 2025')).toBeNull();
  expect(getDisplaySubtitle('UVERworld TOUR 2025', 'UVERworld TOUR 2025 男祭り'))
    .toBe('UVERworld TOUR 2025 男祭り');
});
