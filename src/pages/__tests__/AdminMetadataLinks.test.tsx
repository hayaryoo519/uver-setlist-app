import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../AdminPage';
const mocks = vi.hoisted(() => ({ tab: vi.fn(), role: 'admin' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 1, role: mocks.role } }) }));
vi.mock('../../hooks/queries/useLives', () => ({ useLives: () => ({ data: [] }) }));
vi.mock('../../hooks/queries/useSongs', () => ({ useSongs: () => ({ data: [] }) }));
vi.mock('../../hooks/queries/useAdminUsers', () => ({ useAdminUsers: () => ({ data: [] }) }));
vi.mock('../../hooks/queries/useAdminCorrections', () => ({ useAdminCorrections: () => ({ data: [] }) }));
vi.mock('../../components/Admin/tabs/AdminLivesTab', () => ({ default: (props: unknown) => { mocks.tab(props); return <div>Review tab</div>; } }));
vi.mock('../../components/Admin/tabs/AdminSongsTab', () => ({ default: () => <div>Song tab state</div> }));
beforeEach(() => { vi.clearAllMocks(); mocks.role = 'admin'; });
afterEach(() => vi.unstubAllGlobals());
const setup = (url: string) => render(<MemoryRouter initialEntries={[url]}><AdminPage /></MemoryRouter>);
describe('管理通知リンクのページ接続', () => {
    it('単件の追加情報リンクを公演タブへ渡す', () => {
        setup('/admin?tab=lives&metadata=42');
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ initialMetadataId: 42, initialReviewFilter: 'ALL' }));
    });
    it('一括取り込みの通知から未確認フィルターへ進める', () => {
        setup('/admin?tab=lives&review=unconfirmed');
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ initialMetadataId: undefined, initialReviewFilter: 'UNCONFIRMED' }));
    });
    it('同じ単件URLの通知メッセージだけを明示的な再開要求へ変換する', () => {
        const serviceWorker = new EventTarget();
        vi.stubGlobal('navigator', { serviceWorker });
        setup('/admin?tab=lives&metadata=42');
        const send = (url: string, origin = window.location.origin) => act(() => {
            serviceWorker.dispatchEvent(new MessageEvent('message', { origin, data: { type: 'metadata-review-notification', url } }));
        });
        send('/admin?tab=lives&metadata=4');
        send('/admin?tab=lives&metadata=42', 'https://outside.example.invalid');
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ metadataNotificationRevision: 0 }));
        send('/admin?tab=lives&metadata=42');
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ initialMetadataId: 42, metadataNotificationRevision: 1 }));
    });
    it('未確認一覧の通知メッセージも再選択要求にする', () => {
        const serviceWorker = new EventTarget();
        vi.stubGlobal('navigator', { serviceWorker });
        setup('/admin?tab=lives&review=unconfirmed');
        act(() => serviceWorker.dispatchEvent(new MessageEvent('message', { origin: window.location.origin,
            data: { type: 'metadata-review-notification', url: '/admin?tab=lives&review=unconfirmed' } })));
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ initialReviewFilter: 'UNCONFIRMED', metadataNotificationRevision: 1 }));
    });
    it('URLが公演タブのままでも、別タブの編集を通知で切り替えない', () => {
        const serviceWorker = new EventTarget();
        vi.stubGlobal('navigator', { serviceWorker });
        setup('/admin?tab=lives&metadata=42');
        fireEvent.click(screen.getByRole('heading', { name: 'Songs' }));
        act(() => serviceWorker.dispatchEvent(new MessageEvent('message', { origin: window.location.origin,
            data: { type: 'metadata-review-notification', url: '/admin?tab=lives&metadata=42' } })));
        expect(screen.getByText('Song tab state')).toBeInTheDocument();
        expect(mocks.tab).toHaveBeenLastCalledWith(expect.objectContaining({ metadataNotificationRevision: 0 }));
    });
    it('一般ユーザーにはレビュータブを表示しない', () => {
        mocks.role = 'user'; setup('/admin?tab=lives&metadata=42');
        expect(screen.getByText('Access denied.')).toBeInTheDocument();
        expect(mocks.tab).not.toHaveBeenCalled();
    });
});
