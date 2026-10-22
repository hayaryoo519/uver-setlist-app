import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLivesTab from '../Admin/tabs/AdminLivesTab';
import type { MetadataReviewSummary } from '../../types/liveMetadata';

const mocks = vi.hoisted(() => ({ get: vi.fn(), invalidate: vi.fn(), refetch: vi.fn(), lives: [] as any[], reviews: [] as any[], pending: false, error: false }));
vi.mock('../../hooks/queries/useLives', () => ({ useLives: () => ({ data: mocks.lives, isLoading: false }) }));
vi.mock('../../hooks/queries/useAdminMetadataReview', () => ({
    METADATA_REVIEW_QUERY_KEY: ['admin', 'liveMetadataReview'],
    useAdminMetadataReview: () => ({ data: mocks.reviews, isPending: mocks.pending, isError: mocks.error, isFetching: false, refetch: mocks.refetch }),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('../../lib/apiClient', () => ({ apiClient: { get: mocks.get } }));
vi.mock('../Admin/SetlistEditor', () => ({ default: () => null }));
const names = ['Birthday Show', 'Reviewed VS', 'Normal Show', 'Country Pending', 'Missing Review'];
const summary = (liveId: number, extra: Partial<MetadataReviewSummary> = {}): MetadataReviewSummary => ({
    liveId, revision: 1, unconfirmedFields: [], hasUnconfirmed: false, countryConflict: 'none', needsClassificationReview: false, ...extra,
});
beforeEach(() => {
    vi.clearAllMocks(); mocks.pending = false; mocks.error = false;
    mocks.lives = names.map((tour_name, index) => ({ id: index + 1, tour_name, title: null, venue: 'Fixture Hall', date: index === 1 ? '2023-01-01' : '2024-01-01', type: 'ONEMAN', setlist_status: index === 1 ? 'UNKNOWN_SETLIST' : 'NORMAL' }));
    mocks.reviews = [summary(1, { hasUnconfirmed: true, unconfirmedFields: ['country', 'members'], countryConflict: 'unresolved' }),
        summary(2, { countryConflict: 'confirmed', needsClassificationReview: true }), summary(3),
        summary(4, { hasUnconfirmed: true, unconfirmedFields: ['country'] })];
    mocks.get.mockResolvedValue({ live_id: 3, revision: 1, candidates: {}, overrides: {}, effective: {
        tags: [], country: { code: null, status: 'unreviewed' }, members: { ids: [], status: 'unreviewed' }, classification: { needsReview: false, note: null },
    } });
});
const filter = (value: string) => fireEvent.change(screen.getByLabelText('追加情報レビュー'), { target: { value } });
const visible = (name: string) => !!screen.queryByText(name, { selector: 'div' });

describe('管理一覧の追加情報レビュー', () => {
    it('件数と未確認理由を表示し、未取得を確認済みと扱わない', () => {
        render(<AdminLivesTab />);
        expect(screen.getByRole('option', { name: '未確認（2）' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '取得元不一致（2）' })).toBeInTheDocument();
        expect(screen.getByLabelText('Birthday Showのレビュー状態')).toHaveTextContent('未確認：開催国・生誕祭の対象メンバー');
        expect(screen.getByLabelText('Missing Reviewのレビュー状態')).toHaveTextContent('レビュー情報未取得');
        expect(screen.getByText(/レビュー情報未取得の公演が1件/)).toBeInTheDocument();
    });
    it('未確認・不一致・未確定の不一致・分類検討を別々に絞る', () => {
        render(<AdminLivesTab />);
        filter('UNCONFIRMED'); expect(visible(names[0])).toBe(true); expect(visible(names[3])).toBe(true); expect(visible(names[1])).toBe(false);
        filter('CONFLICT'); expect(visible(names[0])).toBe(true); expect(visible(names[1])).toBe(true); expect(visible(names[3])).toBe(false);
        filter('UNRESOLVED'); expect(visible(names[0])).toBe(true); expect(visible(names[1])).toBe(false);
        filter('CLASSIFICATION'); expect(visible(names[1])).toBe(true); expect(visible(names[0])).toBe(false);
    });
    it('レビュー条件は既存の文字・セトリ条件とAND', () => {
        render(<AdminLivesTab />); filter('CONFLICT');
        fireEvent.change(screen.getByPlaceholderText('Search lives...'), { target: { value: 'Reviewed' } });
        expect(visible(names[1])).toBe(true); expect(visible(names[0])).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'セトリあり' }));
        expect(screen.getByText('条件に一致する公演はありません。')).toBeInTheDocument();
    });
    it('絞り込みで消えた公演を一括削除の選択に残さない', async () => {
        render(<AdminLivesTab />);
        const row = screen.getByText(names[1], { selector: 'div' }).closest('tr')!;
        fireEvent.click(row.querySelector('td div')!);
        expect(screen.getByRole('button', { name: /Delete Selected/ })).toBeInTheDocument();
        filter('UNCONFIRMED');
        await waitFor(() => expect(screen.queryByRole('button', { name: /Delete Selected/ })).not.toBeInTheDocument());
    });
    it('取得失敗時は件数を0と偽装せず、再取得か全公演表示へ戻せる', () => {
        mocks.error = true;
        render(<AdminLivesTab initialReviewFilter="UNCONFIRMED" />);
        expect(screen.getByRole('option', { name: '未確認（—）' })).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('未確認件数を0件とは扱いません');
        expect(screen.getByText(/この条件での一覧は表示できません/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'レビュー情報を再取得' })); expect(mocks.refetch).toHaveBeenCalled();
        filter('ALL'); expect(visible(names[0])).toBe(true);
        expect(screen.getByLabelText('Birthday Showのレビュー状態')).toHaveTextContent('レビュー情報未取得');
    });
    it('読込中も空キューと断定しない', () => {
        mocks.pending = true; mocks.reviews = [];
        render(<AdminLivesTab />);
        expect(screen.getByText('レビュー情報を読み込み中…')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '未確認（—）' })).toBeDisabled();
    });
    it('通知リンクは絞り込み外の公演も開け、保存後のデータ更新で再度開かない', async () => {
        const { rerender } = render(<AdminLivesTab initialMetadataId={3} initialReviewFilter="UNCONFIRMED" />);
        await screen.findByText('現在の有効情報');
        expect(mocks.get).toHaveBeenCalledWith('/api/lives/3/metadata', expect.any(Object));
        fireEvent.click(screen.getByRole('button', { name: '追加情報を閉じる' }));
        mocks.lives = [...mocks.lives];
        rerender(<AdminLivesTab initialMetadataId={3} initialReviewFilter="UNCONFIRMED" />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.get).toHaveBeenCalledTimes(1);
        rerender(<AdminLivesTab initialMetadataId={2} initialReviewFilter="UNCONFIRMED" />);
        await screen.findByText('現在の有効情報');
        expect(mocks.get).toHaveBeenLastCalledWith('/api/lives/2/metadata', expect.any(Object));
    });
    it('別の通知リンクが来ても現在の未保存編集を上書きしない', async () => {
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        try {
            const { rerender } = render(<AdminLivesTab initialMetadataId={1} />);
            await screen.findByText('現在の有効情報');
            fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '未保存の検討' } });
            rerender(<AdminLivesTab initialMetadataId={2} />);
            expect(screen.getByRole('dialog')).toHaveTextContent('Birthday Show');
            expect(mocks.get).toHaveBeenCalledTimes(1);
            fireEvent.click(screen.getByRole('button', { name: '追加情報を閉じる' }));
            expect(screen.getByLabelText('管理用メモ')).toHaveValue('未保存の検討');
            confirm.mockReturnValue(true);
            fireEvent.click(screen.getByRole('button', { name: '追加情報を閉じる' }));
            await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/api/lives/2/metadata', expect.any(Object)));
            await screen.findByText('現在の有効情報');
            expect(screen.getByRole('dialog')).toHaveTextContent('Reviewed VS');
        } finally { confirm.mockRestore(); }
    });

    it('削除等でリンク先が見つからない場合は明示する', () => {
        render(<AdminLivesTab initialMetadataId={999} />);
        expect(screen.getByRole('alert')).toHaveTextContent('リンク先の公演が一覧にありません');
        expect(mocks.get).not.toHaveBeenCalled();
    });
});
