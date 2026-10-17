import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLivesTab from '../Admin/tabs/AdminLivesTab';

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn(), invalidate: vi.fn(),
    lives: [{ id: 42, tour_name: 'Fixture Tour', title: null, date: '2020-12-21', venue: 'Fixture Hall', type: 'ONEMAN', special_note: null }],
}));
vi.mock('../../hooks/queries/useLives', () => ({ useLives: () => ({ data: mocks.lives, isLoading: false }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('../../hooks/queries/useAdminMetadataReview', () => ({
    METADATA_REVIEW_QUERY_KEY: ['admin', 'liveMetadataReview'],
    useAdminMetadataReview: () => ({ data: [], isPending: false, isError: false, isFetching: false, refetch: vi.fn() }),
}));
vi.mock('../../lib/apiClient', () => ({ apiClient: mocks }));
vi.mock('../Admin/SetlistEditor', () => ({ default: () => null }));
const metadata = {
    live_id: 42, revision: 0, candidates: {}, overrides: {}, effective: {
        tags: [], country: { code: null, status: 'unreviewed' }, members: { ids: [], status: 'unreviewed' },
        classification: { needsReview: false, note: null },
    },
};
beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(metadata);
    mocks.patch.mockResolvedValue({ ...metadata, revision: 1 });
});

describe('公演一覧から追加情報レビュー', () => {
    it('属性ボタンから対象公演のレビューを開き、閉じても公演・セトリを更新しない', async () => {
        render(<AdminLivesTab />);
        fireEvent.click(screen.getByRole('button', { name: 'Fixture Tourの追加情報を確認・修正' }));
        await screen.findByText('現在の有効情報');
        expect(mocks.get).toHaveBeenCalledWith('/api/lives/42/metadata', expect.any(Object));
        fireEvent.click(screen.getByRole('button', { name: '追加情報を閉じる' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.put).not.toHaveBeenCalled();
        expect(mocks.post).not.toHaveBeenCalled();
        expect(mocks.patch).not.toHaveBeenCalled();
    });

    it('アーティスト辞書更新は一覧と全詳細のキャッシュを無効化する', async () => {
        mocks.post.mockResolvedValue({ id: 10, name: 'Fixture Artist', aliases: [], revision: 0 });
        render(<AdminLivesTab />);
        fireEvent.click(screen.getByRole('button', { name: 'Fixture Tourの追加情報を確認・修正' }));
        await screen.findByText('現在の有効情報');
        fireEvent.change(screen.getByLabelText('共演者の確認状態'), { target: { value: 'confirmed' } });
        fireEvent.click(screen.getByRole('button', { name: '新しいアーティストを登録' }));
        fireEvent.change(screen.getByLabelText('アーティスト正式名'), { target: { value: 'Fixture Artist' } });
        fireEvent.click(screen.getByRole('button', { name: 'アーティスト辞書を保存' }));
        await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['live'] }));
        expect(mocks.patch).not.toHaveBeenCalled();
    });

    it('保存は追加情報専用APIへ送り、公演一覧キャッシュを無効化する', async () => {
        render(<AdminLivesTab />);
        fireEvent.click(screen.getByRole('button', { name: 'Fixture Tourの追加情報を確認・修正' }));
        await screen.findByText('現在の有効情報');
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '分類を検討' } });
        fireEvent.click(screen.getByRole('button', { name: '追加情報を保存' }));
        await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(3));
        expect(mocks.patch).toHaveBeenCalledWith('/api/lives/42/metadata', {
            revision: 0, patch: { classification: { needsReview: false, note: '分類を検討' } },
        });
        expect(mocks.invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['live'] }));
        expect(mocks.put).not.toHaveBeenCalled();
        expect(mocks.post).not.toHaveBeenCalled();
    });
});
