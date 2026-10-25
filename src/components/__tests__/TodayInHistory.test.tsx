import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TodayInHistoryContent } from '../Dashboard/TodayInHistory';
import type { TodayInHistoryData, TodayInHistoryLive } from '../../types/api';

const renderContent = (data: TodayInHistoryData) =>
    render(<MemoryRouter><TodayInHistoryContent data={data} /></MemoryRouter>);

const live = (id: number, date: string, yearsAgo: number, extra: Partial<TodayInHistoryLive> = {}): TodayInHistoryLive => ({
    id, date, title: null, tour_name: `TOUR ${id}`, venue: 'Zepp', prefecture: '東京都', type: null,
    song_count: 20, years_ago: yearsAgo, is_milestone: yearsAgo % 5 === 0, ...extra,
});

describe('過去の今日のライブ', () => {
    it('同月同日の過去ライブと記念日を表示する', () => {
        renderContent({
            date: '2026-07-06', matched_date: '2026-07-06', offset_days: 0,
            lives: [live(3, '2016-07-06', 10)],
            anniversaries: [{ type: 'debut', label: 'メジャーデビュー記念日', year: 2005, years: 21 }],
        });

        expect(screen.getByRole('heading', { name: /ON THIS DAY/ })).toHaveTextContent('過去の今日のライブ · 7月6日');
        expect(screen.getByText('メジャーデビュー記念日（2005年から21年）')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'TOUR 3' })).toHaveAttribute('href', '/live/3');
        expect(screen.queryByText(/周年/)).not.toBeInTheDocument();
        expect(screen.getByText('10年前 · 2016.07.06')).toBeInTheDocument();
        expect(screen.getByText('20曲')).toBeInTheDocument();
        expect(screen.queryByText(/今日のライブ記録はありません/)).not.toBeInTheDocument();
        const share = screen.getByRole('link', { name: 'TOUR 3をXでシェア' });
        expect(share.getAttribute('href')).toContain('https://x.com/intent/post?');
        const shareText = new URL(share.getAttribute('href') || '').searchParams.get('text');
        expect(shareText).toContain('今日は2016/07/06の「TOUR 3」から10年！');
        expect(shareText).toContain('#過去の今日のUVERworld');
    });

    it('最初は2件だけ表示し、もっと見るで残りを開く', () => {
        renderContent({
            date: '2026-10-23', matched_date: '2026-10-23', offset_days: 0, anniversaries: [],
            lives: [live(1, '2021-10-23', 5), live(2, '2023-10-23', 3), live(3, '2019-10-23', 7, { song_count: 0 })],
        });

        expect(screen.getAllByRole('link', { name: /^TOUR \d$/ })).toHaveLength(2);
        const more = screen.getByRole('button', { name: 'もっと見る（残り1件）' });
        expect(more).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(more);

        expect(screen.getAllByRole('link', { name: /^TOUR \d$/ })).toHaveLength(3);
        expect(screen.getByText('セトリ未登録')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '閉じる' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('2件以下ならもっと見るを出さない', () => {
        renderContent({
            date: '2026-10-23', matched_date: '2026-10-23', offset_days: 0, anniversaries: [],
            lives: [live(1, '2021-10-23', 5), live(2, '2023-10-23', 3)],
        });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('当日に公演がなければ近い日として表示し、シェア文もその日付にする', () => {
        renderContent({
            date: '2026-01-14', matched_date: '2026-01-16', offset_days: 2, anniversaries: [],
            lives: [live(2, '2018-01-16', 8)],
        });

        expect(screen.getByText('今日のライブ記録はありません。あさって 1月16日の過去のライブ')).toBeInTheDocument();
        // 今日時点ではまだ8年に達していないため「8年前」とは表示しない
        expect(screen.getByText('あさってで8年 · 2018.01.16')).toBeInTheDocument();
        expect(screen.queryByText(/8年前/)).not.toBeInTheDocument();
        const share = screen.getByRole('link', { name: 'TOUR 2をXでシェア' });
        expect(new URL(share.getAttribute('href') || '').searchParams.get('text')).toContain('1月16日は2018/01/16の「TOUR 2」から8年！');
    });

    it('近い日が明日・昨日なら「明日で」「昨日で」と表示する', () => {
        const { unmount } = renderContent({
            date: '2026-10-25', matched_date: '2026-10-26', offset_days: 1, anniversaries: [],
            lives: [live(1, '2021-10-26', 5)],
        });
        expect(screen.getByText('明日で5年 · 2021.10.26')).toBeInTheDocument();
        unmount();

        renderContent({
            date: '2026-10-25', matched_date: '2026-10-24', offset_days: -1, anniversaries: [],
            lives: [live(2, '2019-10-24', 7)],
        });
        expect(screen.getByText('昨日で7年 · 2019.10.24')).toBeInTheDocument();
    });

    it('前後にも公演がない日は案内文を表示する', () => {
        renderContent({ date: '2026-12-21', matched_date: null, offset_days: null, lives: [], anniversaries: [{ type: 'birthday', label: 'TAKUYA∞ 誕生日' }] });

        expect(screen.getByText('TAKUYA∞ 誕生日')).toBeInTheDocument();
        expect(screen.getByText('過去の12月21日前後に開催されたライブの記録はありません。')).toBeInTheDocument();
    });
});
