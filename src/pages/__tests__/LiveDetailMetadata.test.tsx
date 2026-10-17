import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LiveDetail from '../LiveDetail';

const mocks = vi.hoisted(() => ({ live: {} as any }));
vi.mock('../../hooks/queries/useLives', () => ({ useLiveDetail: () => ({ data: mocks.live, isLoading: false }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: null }) }));
vi.mock('../../hooks/useAttendance', () => ({ useAttendance: () => ({ isAttended: () => false, addLive: vi.fn(), removeLive: vi.fn(), loading: false }) }));
vi.mock('../../components/SEO', () => ({ default: () => null }));
vi.mock('../../components/CorrectionModal', () => ({ default: () => null }));
vi.mock('../../components/Spotify/SpotifyPlaylistButton', () => ({ default: () => null }));
vi.mock('../../components/Youtube/YoutubePlaylistButton', () => ({ default: () => null }));
beforeEach(() => {
    mocks.live = { id: 42, tour_name: 'Fixture Tour', title: '男祭り', date: '2020-12-21', venue: 'Fixture Hall', type: 'ONEMAN', special_note: null, setlist: [],
        tags: ['birthday', 'overseas'], metadata: { country: { code: 'KR', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' } } };
});
const setup = () => render(<MemoryRouter initialEntries={['/live/42']}><Routes><Route path="/live/:id" element={<LiveDetail />} /></Routes></MemoryRouter>);

describe('ライブ詳細の有効追加情報', () => {
    it('APIの有効タグ・確認済み国・対象メンバーを表示する', () => {
        setup();
        expect(screen.getByText('海外公演')).toBeInTheDocument();
        expect(screen.getByText('開催国：KR')).toBeInTheDocument();
        expect(screen.getByText('生誕祭：TAKUYA∞')).toBeInTheDocument();
    });
    it('空タグ・未確認情報からバッジを生成せず、正式名称は保持する', () => {
        mocks.live.tags = [];
        mocks.live.metadata = { country: { code: null, status: 'unreviewed' }, members: { ids: [], status: 'unreviewed' } };
        setup();
        expect(screen.queryByLabelText('公演属性')).not.toBeInTheDocument();
        expect(screen.getByText('男祭り')).toBeInTheDocument();
    });
});
