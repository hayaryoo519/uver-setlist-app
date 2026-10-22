import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AdminCollectTab from '../Admin/tabs/AdminCollectTab';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), invalidate: vi.fn(), lives: [] as any[] }));
vi.mock('../../lib/apiClient', () => ({ apiClient: { get: mocks.get, post: mocks.post, put: mocks.put } }));
vi.mock('../../hooks/queries/useLives', () => ({ useLives: () => ({ data: mocks.lives }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));

const fixture = (overrides = {}) => ({
    id: 'fixture-live', eventDate: '21-12-2020',
    tour: { name: 'Fixture Tour' }, info: 'UVERworld vs Fixture Artist',
    venue: { name: 'Fixture Hall', city: { country: { code: 'KR' } } },
    url: 'https://example.test/setlist', sets: { set: [] }, ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.lives = [];
    mocks.get.mockResolvedValue({ setlist: [fixture()], total: 1, itemsPerPage: 20 });
    mocks.post.mockImplementation(async (url: string) => ({ id: url === '/api/lives' ? 42 : 10 }));
    mocks.put.mockResolvedValue({ success: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

async function search() {
    render(<AdminCollectTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByTitle('Import This Setlist');
}

const liveRequest = () => mocks.post.mock.calls.find(([url]) => url === '/api/lives');

describe('AdminCollectTab 追加経路の現状確認', () => {
    it('単件追加は日付から生誕祭を作らず、取得した説明を特記事項に保持する', async () => {
        await search();
        fireEvent.click(screen.getByTitle('Import This Setlist'));
        await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
        expect(liveRequest()?.[1]).toMatchObject({
            tour_name: 'Fixture Tour', title: '', date: '2020-12-21',
            venue: 'Fixture Hall', type: 'HALL', special_note: 'UVERworld vs Fixture Artist',
        });
        expect(liveRequest()?.[1].metadata_source).toMatchObject({
            type: 'setlistfm', original: { id: 'fixture-live', info: 'UVERworld vs Fixture Artist',
                venue: { city: { country: { code: 'KR' } } } },
        });
        expect(liveRequest()?.[1].metadata_source.original).not.toHaveProperty('sets');
    });

    it('プレビューで原文と未確認候補を表示する', async () => {
        await search();
        fireEvent.click(screen.getByTitle('View Setlist'));
        expect(screen.getByText('追加情報候補（未確認）')).toBeInTheDocument();
        expect(screen.getByText('属性：対バン')).toBeInTheDocument();
        expect(screen.getByText('開催国コード：KR')).toBeInTheDocument();
        expect(screen.getByText('取得時の説明：UVERworld vs Fixture Artist')).toBeInTheDocument();
        expect(mocks.post).not.toHaveBeenCalled();
    });

    it('選択一括追加も同じ加工を使い、結果ダイアログを閉じて一覧を更新する', async () => {
        await search();
        fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import Selected (1)' }));
        await screen.findByText('1 setlists imported');
        expect(liveRequest()?.[1].special_note).toBe('UVERworld vs Fixture Artist');
        expect(mocks.invalidate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'OK' }));
        expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    });

    it('同日同会場の既存公演は選択一括追加から除外される', async () => {
        mocks.lives = [{ id: 1, date: '2020-12-21', venue: 'Fixture Hall' }];
        await search();
        expect(screen.getByText('Already Imported')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import Selected (1)' }));
        await screen.findByText('All selected items were already imported.');
        expect(mocks.post).not.toHaveBeenCalled();
    });

    it('現状の単件追加は既存表示があっても追加要求を送れる', async () => {
        mocks.lives = [{ id: 1, date: '2020-12-21', venue: 'Fixture Hall' }];
        await search();
        fireEvent.click(screen.getByTitle('Import This Setlist'));
        await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
        expect(liveRequest()).toBeDefined();
    });

    it('楽曲登録とセトリ更新はライブ追加とは別要求で行う', async () => {
        mocks.get.mockResolvedValue({ setlist: [fixture({
            eventDate: '01-08-2020', info: undefined, sets: { set: [{ song: [{ name: 'Fixture Song' }] }] },
        })], total: 1, itemsPerPage: 20 });
        await search();
        fireEvent.click(screen.getByTitle('Import This Setlist'));
        await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
        expect(mocks.post).toHaveBeenCalledWith('/api/songs', { title: 'Fixture Song' });
        expect(mocks.put).toHaveBeenCalledWith('/api/lives/42/setlist', { songs: [10] });
        expect(liveRequest()?.[1].special_note).toBeNull();
    });

    it('ライブ追加成功後のセトリ更新失敗でも取り消し要求はなく、現状は一覧を無効化しない', async () => {
        mocks.get.mockResolvedValue({ setlist: [fixture({
            sets: { set: [{ song: [{ name: 'Fixture Song' }] }] },
        })], total: 1, itemsPerPage: 20 });
        mocks.put.mockRejectedValue(new Error('fixture update failed'));
        await search();
        fireEvent.click(screen.getByTitle('Import This Setlist'));
        await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error during import: fixture update failed'));
        expect(liveRequest()).toBeDefined();
        expect(mocks.invalidate).not.toHaveBeenCalled();
    });
});
