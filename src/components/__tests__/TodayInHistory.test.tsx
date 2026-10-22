import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TodayInHistoryContent } from '../Dashboard/TodayInHistory';
import type { TodayInHistoryData } from '../../types/api';

const renderContent = (data: TodayInHistoryData) =>
    render(<MemoryRouter><TodayInHistoryContent data={data} /></MemoryRouter>);

describe('今日のUVER史', () => {
    it('同月同日の過去ライブと記念日を表示する', () => {
        renderContent({
            date: '2026-07-06',
            lives: [{ id: 3, date: '2016-07-06', title: null, tour_name: 'TOUR 2016', venue: 'Zepp', prefecture: '東京都', type: null, song_count: 20, years_ago: 10 }],
            anniversaries: [{ type: 'debut', label: 'メジャーデビュー記念日', year: 2005, years: 21 }],
        });

        expect(screen.getByText('7月6日')).toBeInTheDocument();
        expect(screen.getByText('メジャーデビュー記念日（2005年から21年）')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'TOUR 2016' })).toHaveAttribute('href', '/live/3');
        expect(screen.getByText('10年前 · 2016.07.06')).toBeInTheDocument();
        expect(screen.getByText('20曲')).toBeInTheDocument();
        const share = screen.getByRole('link', { name: 'TOUR 2016をXでシェア' });
        expect(share.getAttribute('href')).toContain('https://x.com/intent/post?');
        expect(decodeURIComponent(share.getAttribute('href') || '')).toContain('から10年');
    });

    it('該当ライブがない日は案内文を表示する', () => {
        renderContent({ date: '2026-12-21', lives: [], anniversaries: [{ type: 'birthday', label: 'TAKUYA∞ 誕生日' }] });

        expect(screen.getByText('TAKUYA∞ 誕生日')).toBeInTheDocument();
        expect(screen.getByText('過去の12月21日に開催されたライブの記録はありません。')).toBeInTheDocument();
    });
});
