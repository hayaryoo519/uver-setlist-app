import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../test/utils';
import { useAdminMetadataReview } from '../useAdminMetadataReview';
const mocks = vi.hoisted(() => ({ get: vi.fn(), user: null as { id: number; role: string } | null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: mocks.user }) }));
vi.mock('../../../lib/apiClient', () => ({ apiClient: { get: mocks.get } }));
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 1, role: 'admin' }; mocks.get.mockResolvedValue([]); });
describe('管理者専用レビュー取得', () => {
    it.each([null, { id: 2, role: 'user' }])('管理者以外は要求しない %j', async user => {
        mocks.user = user;
        renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        expect(mocks.get).not.toHaveBeenCalled();
    });
    it('管理者専用APIを取り消し可能な要求で取得する', async () => {
        const { result } = renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.get).toHaveBeenCalledWith('/api/lives/metadata-review', expect.objectContaining({ signal: expect.anything() }));
    });
    it('500等は空配列の成功に偽装しない', async () => {
        mocks.get.mockRejectedValue(new Error('fixture failure'));
        const { result } = renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.data).toBeUndefined();
    });
    it('管理者が切り替わった場合に前の管理者のキャッシュを使わない', async () => {
        mocks.get.mockResolvedValueOnce([{ liveId: 1 }]).mockResolvedValueOnce([{ liveId: 2 }]);
        const { result, rerender } = renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.data).toEqual([{ liveId: 1 }]));
        mocks.user = { id: 2, role: 'admin' }; rerender();
        await waitFor(() => expect(result.current.data).toEqual([{ liveId: 2 }]));
        expect(mocks.get).toHaveBeenCalledTimes(2);
    });
    it('同じアカウントでも管理者権限がなくなったら以前のキャッシュを返さない', async () => {
        mocks.get.mockResolvedValue([{ liveId: 1 }]);
        const { result, rerender } = renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.data).toEqual([{ liveId: 1 }]));
        mocks.user = { id: 1, role: 'user' }; rerender();
        expect(result.current.data).toBeUndefined();
        expect(result.current.isFetching).toBe(false);
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });
    it('タブを閉じると取得要求を取り消す', async () => {
        mocks.get.mockImplementation(() => new Promise(() => {}));
        const { unmount } = renderHook(() => useAdminMetadataReview(), { wrapper: createWrapper() });
        await waitFor(() => expect(mocks.get).toHaveBeenCalled());
        const signal = mocks.get.mock.calls[0][1].signal;
        unmount(); expect(signal.aborted).toBe(true);
    });
});
