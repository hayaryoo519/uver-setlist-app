import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CollaboratorsEditor from '../Admin/CollaboratorsEditor';
import type { LiveArtist, ParticipantAssignment } from '../../types/liveMetadata';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), change: vi.fn(), saved: vi.fn(), busy: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ apiClient: mocks }));
const artist: LiveArtist = { id: 10, name: 'Fixture Artist', aliases: ['FA'], revision: 2 };
function Wrapper() {
    const [items, setItems] = useState<ParticipantAssignment[]>([]);
    const [artists, setArtists] = useState<LiveArtist[]>([]);
    return <CollaboratorsEditor items={items} artists={artists} onBusyChange={mocks.busy}
        onChange={value => { mocks.change(value); setItems(value); }}
        onArtistSaved={value => { mocks.saved(value); setArtists([value]); }} />;
}
beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue([artist]);
    mocks.post.mockResolvedValue(artist);
    mocks.patch.mockResolvedValue({ ...artist, name: 'Renamed Artist', revision: 3 });
});
async function select() {
    fireEvent.change(screen.getByLabelText('共演アーティストを検索'), { target: { value: 'FA' } });
    fireEvent.click(screen.getByRole('button', { name: 'アーティストを検索' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fixture Artistを選択' }));
}

describe('共演者の辞書・関連編集', () => {
    it('別名で辞書検索し、既存IDと役割を公演へ関連付ける', async () => {
        render(<Wrapper />); await select();
        expect(mocks.get).toHaveBeenCalledWith('/api/live-artists?search=FA');
        fireEvent.change(screen.getByLabelText('共演の役割'), { target: { value: 'guest' } });
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        expect(mocks.change).toHaveBeenLastCalledWith([{ artistId: 10, role: 'guest' }]);
        expect(mocks.post).not.toHaveBeenCalled();
    });
    it('同一ID/役割を重複させず、別の役割は追加できる', async () => {
        render(<Wrapper />); await select();
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        expect(screen.getByText('同じアーティスト・役割は登録済みです。')).toBeInTheDocument();
        expect(mocks.change).toHaveBeenCalledTimes(1);
        fireEvent.change(screen.getByLabelText('共演の役割'), { target: { value: 'guest' } });
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        expect(mocks.change).toHaveBeenLastCalledWith([{ artistId: 10, role: 'co_headliner' }, { artistId: 10, role: 'guest' }]);
    });
    it('登録済みの役割を修正し、関連だけを削除できる', async () => {
        render(<Wrapper />); await select();
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        fireEvent.change(screen.getByLabelText('共演者10のco_headlinerの役割'), { target: { value: 'supporting_act' } });
        expect(mocks.change).toHaveBeenLastCalledWith([{ artistId: 10, role: 'supporting_act' }]);
        fireEvent.click(screen.getByRole('button', { name: '共演者10のsupporting_actを削除' }));
        expect(mocks.change).toHaveBeenLastCalledWith([]);
    });
    it('新規辞書登録は即時保存するが、公演へ自動追加しない', async () => {
        render(<Wrapper />);
        fireEvent.click(screen.getByRole('button', { name: '新しいアーティストを登録' }));
        fireEvent.change(screen.getByLabelText('アーティスト正式名'), { target: { value: 'Fixture Artist' } });
        fireEvent.change(screen.getByLabelText('アーティスト別名（1行に1つ）'), { target: { value: 'FA\nOther Name' } });
        fireEvent.click(screen.getByRole('button', { name: 'アーティスト辞書を保存' }));
        await waitFor(() => expect(mocks.saved).toHaveBeenCalledWith(artist));
        expect(mocks.post).toHaveBeenCalledWith('/api/live-artists', { name: 'Fixture Artist', aliases: ['FA', 'Other Name'] });
        expect(mocks.change).not.toHaveBeenCalled();
    });
    it('辞書の修正はrevision付きで保存する', async () => {
        render(<Wrapper />); await select();
        fireEvent.click(screen.getByRole('button', { name: '選択アーティストの辞書を修正' }));
        fireEvent.change(screen.getByLabelText('アーティスト正式名'), { target: { value: 'Renamed Artist' } });
        fireEvent.click(screen.getByRole('button', { name: 'アーティスト辞書を保存' }));
        await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
        expect(mocks.patch).toHaveBeenCalledWith('/api/live-artists/10', { name: 'Renamed Artist', aliases: ['FA'], revision: 2 });
    });
    it('重複・競合時は入力を保持して再検索を促す', async () => {
        mocks.post.mockRejectedValue(new Error('Artist name already registered'));
        render(<Wrapper />);
        fireEvent.click(screen.getByRole('button', { name: '新しいアーティストを登録' }));
        fireEvent.change(screen.getByLabelText('アーティスト正式名'), { target: { value: 'Fixture Artist' } });
        fireEvent.click(screen.getByRole('button', { name: 'アーティスト辞書を保存' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('アーティスト正式名')).toHaveValue('Fixture Artist');
        expect(mocks.saved).not.toHaveBeenCalled();
    });
});
