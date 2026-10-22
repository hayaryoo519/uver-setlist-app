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
    { id: 1, date: '2020-12-21', tour_name: 'Tour A', title: '男祭り 生誕祭', type: 'ONEMAN', venue: 'Tokyo', tags: ['mens', 'birthday', 'vs'], metadata: { country: { code: 'JP', status: 'confirmed' }, members: { ids: ['shintaro'], status: 'confirmed' }, participants: { status: 'confirmed', items: [{ artistId: 10, name: 'Fixture Artist', aliases: ['FA'], role: 'co_headliner' }, { artistId: 11, name: 'Other Artist', aliases: ['OA'], role: 'guest' }] } } },
    { id: 2, date: '2020-12-25', tour_name: 'Tour B', title: '女祭り Xmas', type: 'EVENT', venue: 'Tokyo', tags: ['womens', 'christmas', 'vs'] },
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
        expect(screen.queryByRole('button', { name: '日本' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '男祭り' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'FES' })).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', { name: '日本' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByLabelText('開催国')).not.toBeInTheDocument();
        expect(screen.queryByText(/同じ分類内/)).not.toBeInTheDocument();
        for (const name of ['公演の特徴', '共演', '開催地']) expect(screen.getByRole('group', { name })).toBeInTheDocument();
        expect(document.querySelectorAll('.semantic-filters > fieldset')).toHaveLength(3);
        expect(screen.queryByRole('button', { name: '海外公演' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('生誕祭の対象メンバー')).not.toBeInTheDocument();
        expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(screen.queryByRole('button', { name: '日本' })).not.toBeInTheDocument();
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
        fireEvent.click(screen.getByRole('button', { name: '海外' }));
        fireEvent.click(screen.getByRole('button', { name: /詳細フィルター/ }));
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        expect(screen.queryByRole('button', { name: '海外' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /詳細フィルター/ }));
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'true');
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

    it('日本と海外を排他的に選び、選択中のボタンを再度押すと全公演に戻す', () => {
        setup();
        const japan = screen.getByRole('button', { name: '日本' });
        const overseas = screen.getByRole('button', { name: '海外' });
        fireEvent.click(overseas);
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false); expect(hasLive(2)).toBe(false);
        expect(overseas).toHaveAttribute('aria-pressed', 'true'); expect(japan).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(japan);
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(false); expect(hasLive(2)).toBe(false);
        expect(japan).toHaveAttribute('aria-pressed', 'true'); expect(overseas).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: '詳細フィルター 1件適用中' })).toBeInTheDocument();
        fireEvent.click(japan);
        expect(japan).toHaveAttribute('aria-pressed', 'false');
        for (const id of [1, 2, 3, 4]) expect(hasLive(id)).toBe(true);
        fireEvent.click(overseas); fireEvent.click(overseas);
        expect(overseas).toHaveAttribute('aria-pressed', 'false');
        for (const id of [1, 2, 3, 4]) expect(hasLive(id)).toBe(true);
    });

    it('開催地の近くで現在の結果件数と未確認を含めないことを示し、組み合わせ条件にも追従する', () => {
        setup();
        const feedback = () => document.querySelector('.desktop-only .location-filter-feedback');
        expect(feedback()).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '日本' }));
        expect(feedback()).toHaveTextContent('現在の条件：1件。開催国未確認の公演は日本・海外に含めません。');
        fireEvent.click(screen.getByRole('button', { name: 'FES' }));
        expect(feedback()).toHaveTextContent('現在の条件：0件。開催国未確認の公演は日本・海外に含めません。');
        fireEvent.click(screen.getByRole('button', { name: '絞り込みフィルター' }));
        expect(document.querySelector('.mobile-filter-panel .location-filter-feedback')).toHaveTextContent('現在の条件：0件');
        fireEvent.click(screen.getAllByRole('button', { name: '日本' })[0]);
        expect(feedback()).toBeNull();
        expect(document.querySelector('.mobile-filter-panel .location-filter-feedback')).toBeNull();
    });

    it('復元された海外+国の条件は維持し、日本を選び直した時だけ一本化する', () => {
        setup({ tags: ['overseas'], countryCode: 'KR' });
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('開催地：韓国')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '詳細フィルター 2件適用中' })).toBeInTheDocument();
        expect(hasLive(4)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '日本' }));
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(false);
        expect(screen.getByRole('button', { name: '詳細フィルター 1件適用中' })).toBeInTheDocument();
        expect(screen.queryByText('開催地：韓国')).not.toBeInTheDocument();
    });

    it('取得結果にない国の復元条件もチップに残し、解除するまで検索を広げない', () => {
        setup({ countryCode: 'US' });
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('開催地：アメリカ合衆国')).toBeInTheDocument();
        expect(screen.getByText('条件に一致するライブが見つかりません')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '開催国フィルターを解除' }));
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'false');
        expect(hasLive(4)).toBe(true);
    });

    it('海外全体の選択も閉じたままチップで解除できる', () => {
        setup({ tags: ['overseas'] }, false);
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: '海外公演フィルターを解除' }));
        expect(hasLive(1)).toBe(true);
        expect(screen.getByRole('button', { name: '詳細フィルター' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('生誕祭を選ぶと対象メンバーを指定でき、タグを外しても有効なメンバー条件は隠さない', () => {
        setup();
        expect(screen.queryByLabelText('生誕祭の対象メンバー')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '生誕祭' }));
        fireEvent.change(screen.getByLabelText('生誕祭の対象メンバー'), { target: { value: 'takuya' } });
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: '生誕祭' }));
        expect(screen.getByLabelText('生誕祭の対象メンバー')).toHaveValue('takuya');
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        fireEvent.change(screen.getByLabelText('生誕祭の対象メンバー'), { target: { value: '' } });
        expect(screen.queryByLabelText('生誕祭の対象メンバー')).not.toBeInTheDocument();
    });

    it('メンバーだけの復元条件も表示し、記念日タグを暗黙に追加して検索を広げない', () => {
        setup({ memberId: 'takuya', tags: ['christmas'] });
        expect(screen.getByLabelText('生誕祭の対象メンバー')).toHaveValue('takuya');
        expect(screen.getByText('条件に一致するライブが見つかりません')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '生誕祭' })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'クリスマスフィルターを解除' }));
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
    });

    it('相手が未確認の対バンも探せ、相手の出演形態を指定した時だけ確認済み関係に絞る', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '対バン' }));
        expect(hasLive(1)).toBe(true); expect(hasLive(2)).toBe(true);
        fireEvent.change(screen.getByLabelText('相手の出演形態'), { target: { value: 'co_headliner' } });
        expect(hasLive(1)).toBe(true); expect(hasLive(2)).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: '共演役割フィルターを解除' }));
        expect(hasLive(2)).toBe(true);
    });

    it('復元された未確認条件は日本や海外と誤表示せず、対象メンバー未確認も除外する', () => {
        setup({ countryCode: 'unconfirmed' });
        expect(screen.getByRole('button', { name: '日本' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: '海外' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText('開催国未確認')).toBeInTheDocument();
        expect(hasLive(1)).toBe(false); expect(hasLive(4)).toBe(false);
        expect(hasLive(2)).toBe(true); expect(hasLive(3)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '生誕祭' }));
        fireEvent.change(screen.getByLabelText('生誕祭の対象メンバー'), { target: { value: 'takuya' } });
        expect(screen.getByText('条件に一致するライブが見つかりません')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'フィルターをクリア' }));
        expect(screen.queryByText('開催国未確認')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('生誕祭の対象メンバー')).not.toBeInTheDocument();
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(true);
    });

    it('未確認の保存済み条件もチップから解除でき、その後に日本で絞り込める', () => {
        setup({ countryCode: 'unconfirmed' });
        fireEvent.click(screen.getByRole('button', { name: '開催国フィルターを解除' }));
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '日本' }));
        expect(hasLive(1)).toBe(true); expect(hasLive(2)).toBe(false); expect(hasLive(4)).toBe(false);
    });

    it('モバイルの開催地ボタンもデスクトップと共有する', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '絞り込みフィルター' }));
        fireEvent.click(screen.getAllByRole('button', { name: '海外' })[1]);
        expect(screen.getAllByRole('button', { name: '海外' })[0]).toHaveAttribute('aria-pressed', 'true');
        expect(hasLive(4)).toBe(true); expect(hasLive(1)).toBe(false);
        fireEvent.click(screen.getAllByRole('button', { name: '日本' })[0]);
        expect(screen.getAllByRole('button', { name: '日本' })[1]).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByRole('button', { name: '海外' })[1]).toHaveAttribute('aria-pressed', 'false');
        expect(hasLive(1)).toBe(true); expect(hasLive(4)).toBe(false);
    });

    it('アーティストと役割は同じ共演情報に一致する公演だけを返す', () => {
        setup();
        fireEvent.change(screen.getByLabelText('共演アーティスト'), { target: { value: '10' } });
        expect(hasLive(1)).toBe(true);
        expect(hasLive(4)).toBe(true);
        fireEvent.change(screen.getByLabelText('相手の出演形態'), { target: { value: 'guest' } });
        expect(hasLive(1)).toBe(false); // 別アーティストのゲスト出演を混同しない。
        expect(hasLive(4)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '共演役割フィルターを解除' }));
        expect(screen.getByLabelText('相手の出演形態')).toHaveValue('');
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
