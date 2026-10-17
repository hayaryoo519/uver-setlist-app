import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LiveList from '../LiveList';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: null }) }));
vi.mock('../../hooks/useAttendance', () => ({ useAttendance: () => ({
    addLive: vi.fn(), removeLive: vi.fn(), isAttended: () => false,
}) }));
vi.mock('../../components/SEO', () => ({ default: () => null }));
vi.mock('../../hooks/queries/useSongs', () => ({ useSongs: () => ({ data: [] }) }));
vi.mock('../../hooks/queries/useLives', () => ({ useLives: () => ({ isLoading: false, data: [
    { id: 1, date: '2020-12-21', tour_name: 'Tour A', title: '男祭り 生誕祭', type: 'ONEMAN', venue: 'Tokyo', tags: ['mens', 'birthday'], metadata: { country: { code: 'JP', status: 'confirmed' }, members: { ids: ['shintaro'], status: 'confirmed' }, participants: { status: 'confirmed', items: [{ artistId: 10, name: 'Fixture Artist', aliases: ['FA'], role: 'co_headliner' }, { artistId: 11, name: 'Other Artist', aliases: ['OA'], role: 'guest' }] } } },
    { id: 2, date: '2020-12-25', tour_name: 'Tour B', title: '女祭り Xmas', type: 'EVENT', venue: 'Tokyo', tags: ['womens', 'christmas'] },
    { id: 3, date: '2020-08-01', tour_name: 'Solid named event', title: null, type: 'FESTIVAL', venue: 'Tokyo', tags: [] },
    { id: 4, date: '2020-09-01', tour_name: 'Overseas Show', title: null, type: 'ONEMAN', venue: 'Seoul', tags: ['birthday', 'overseas'], metadata: { country: { code: 'KR', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' }, participants: { status: 'confirmed', items: [{ artistId: 10, name: 'Fixture Artist', aliases: ['FA'], role: 'guest' }] } } },
] }) }));

const setup = (filters = {}, openAdvanced = true) => {
    const result = render(
        <MemoryRouter initialEntries={[{ pathname: '/lives', state: { filters } }]}>
            <LiveList />
        </MemoryRouter>,
    );
    if (openAdvanced) fireEvent.click(screen.getByRole('button', { name: /詳細フィルター/ }));
    return result;
};

// CSSによる表示制御はjsdomで適用されないため、カードはPC/モバイル両方存在する。
const hasLive = (id: number) => !!document.querySelector(`a[href="/live/${id}"]`);

describe('LiveList 属性フィルター', () => {
    it('初期表示は詳細条件を隠し、開閉ボタンで必要なときだけ表示する', () => {
        setup({}, false);
        const toggle = screen.getByRole('button', { name: '詳細フィルター' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByLabelText('開催国')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '男祭り' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'FES' })).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByLabelText('開催国')).toBeInTheDocument();
        expect(screen.queryByText(/同じ分類内/)).not.toBeInTheDocument();
        expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(screen.queryByLabelText('開催国')).not.toBeInTheDocument();
    });

    it('復元された詳細条件は閉じていても件数・チップ・結果に反映され、そのまま解除できる', () => {
        setup({ tags: ['birthday'], countryCode: 'KR' }, false);
        const toggle = screen.getByRole('button', { name: '詳細フィルター 2件適用中' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: '開催国フィルターを解除' }));
        expect(screen.getByRole('button', { name: '詳細フィルター 1件適用中' })).toBeInTheDocument();
        expect(hasLive(1)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '生誕祭フィルターを解除' }));
        expect(screen.getByRole('button', { name: '詳細フィルター' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('詳細条件を折りたたんでも選択を保持し、開き直すと編集できる', () => {
        setup();
        fireEvent.change(screen.getByLabelText('開催国'), { target: { value: 'KR' } });
        fireEvent.click(screen.getByRole('button', { name: /詳細フィルター/ }));
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        expect(screen.queryByLabelText('開催国')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /詳細フィルター/ }));
        expect(screen.getByLabelText('開催国')).toHaveValue('KR');
    });
    it('属性選択で年別表示から検索結果に切り替え、階層内OR・階層間ANDで絞る', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '男祭り' }));
        expect(screen.getByRole('heading', { name: '検索結果 (1)' })).toBeInTheDocument();
        expect(hasLive(1)).toBe(true);
        expect(hasLive(2)).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: '女祭り' }));
        expect(screen.getByRole('heading', { name: '検索結果 (2)' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '生誕祭' }));
        expect(screen.getByRole('heading', { name: '検索結果 (1)' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '生誕祭フィルターを解除' }));
        expect(screen.getByRole('heading', { name: '検索結果 (2)' })).toBeInTheDocument();
    });

    it('フェスは属性タグでなく既存種別で検索する', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'FES' }));
        expect(hasLive(3)).toBe(true);
        expect(hasLive(1)).toBe(false);
    });

    it('既存種別と組み合わせ、ゼロ件から全解除できる', () => {
        setup({ types: ['EVENT'] });
        fireEvent.click(screen.getByRole('button', { name: '男祭り' }));
        expect(screen.getByText('条件に一致するライブが見つかりません')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'フィルターをクリア' }));
        expect(hasLive(1)).toBe(true);
        expect(hasLive(2)).toBe(true);
        expect(screen.queryByRole('button', { name: '男祭りフィルターを解除' })).not.toBeInTheDocument();
    });

    it('海外タグと確認済み開催国・対象メンバーで絞り込める', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '海外公演' }));
        expect(hasLive(4)).toBe(true);
        expect(hasLive(1)).toBe(false);
        fireEvent.change(screen.getByLabelText('開催国'), { target: { value: 'KR' } });
        fireEvent.change(screen.getByLabelText('生誕祭の対象メンバー'), { target: { value: 'takuya' } });
        expect(screen.getByRole('heading', { name: '検索結果 (1)' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '開催国フィルターを解除' }));
        expect(screen.getByLabelText('開催国')).toHaveValue('');
    });

    it('開催国未確認を国内・海外と区別し、対象メンバー未確認も除外する', () => {
        setup();
        fireEvent.change(screen.getByLabelText('開催国'), { target: { value: 'unconfirmed' } });
        expect(hasLive(1)).toBe(false);
        expect(hasLive(4)).toBe(false);
        expect(hasLive(2)).toBe(true);
        expect(hasLive(3)).toBe(true);
        fireEvent.change(screen.getByLabelText('生誕祭の対象メンバー'), { target: { value: 'takuya' } });
        expect(screen.getByText('条件に一致するライブが見つかりません')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'フィルターをクリア' }));
        expect(screen.getByLabelText('開催国')).toHaveValue('');
        expect(screen.getByLabelText('生誕祭の対象メンバー')).toHaveValue('');
    });

    it('モバイルの開催国選択もデスクトップと共有する', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '絞り込みフィルター' }));
        fireEvent.change(screen.getAllByLabelText('開催国')[1], { target: { value: 'KR' } });
        expect(screen.getAllByLabelText('開催国')[0]).toHaveValue('KR');
        expect(hasLive(4)).toBe(true);
        expect(hasLive(1)).toBe(false);
    });

    it('アーティストと役割は同じ共演情報に一致する公演だけを返す', () => {
        setup();
        fireEvent.change(screen.getByLabelText('共演アーティスト'), { target: { value: '10' } });
        expect(hasLive(1)).toBe(true);
        expect(hasLive(4)).toBe(true);
        fireEvent.change(screen.getByLabelText('共演の役割'), { target: { value: 'guest' } });
        expect(hasLive(1)).toBe(false); // 別アーティストのゲスト出演を混同しない。
        expect(hasLive(4)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '共演役割フィルターを解除' }));
        expect(screen.getByLabelText('共演の役割')).toHaveValue('');
        expect(hasLive(1)).toBe(true);
    });

    it('別名・全角表記の文字検索でも同じ共演アーティストを探せる', () => {
        setup();
        fireEvent.change(screen.getByPlaceholderText('ツアー名・会場・共演者で検索'), { target: { value: 'ＦＡ' } });
        expect(hasLive(1)).toBe(true);
        expect(hasLive(4)).toBe(true);
        expect(hasLive(2)).toBe(false);
        expect(hasLive(3)).toBe(false);
    });

    it.each(['  ＦＩＸＴＵＲＥ   ＡＲＴＩＳＴ  ', '\tFA  '])('辞書と同じ前後/連続空白の正規化で共演者を検索する (%s)', text => {
        setup({ text });
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(true);
        expect(hasLive(2)).toBe(false); expect(hasLive(3)).toBe(false);
    });

    it('空白だけの検索で共演者ありの公演だけを返さない', () => {
        setup({ text: '   ' });
        for (const id of [1, 2, 3, 4]) expect(hasLive(id)).toBe(true);
    });

    it('名前の句読点は消さず別名FAとF.A.を同一視しない', () => {
        setup({ text: 'F.A.' });
        for (const id of [1, 2, 3, 4]) expect(hasLive(id)).toBe(false);
    });

    it('モバイルパネルでも属性を選択できる', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '絞り込みフィルター' }));
        const buttons = screen.getAllByRole('button', { name: 'クリスマス' });
        fireEvent.click(buttons[1]);
        expect(hasLive(2)).toBe(true);
        expect(hasLive(1)).toBe(false);
        expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    });
});
