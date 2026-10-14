import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import LiveMetadataEditor from '../Admin/LiveMetadataEditor';
import type { LiveMetadata } from '../../types/liveMetadata';

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ apiClient: mocks }));
const fixture = (): LiveMetadata => ({
    live_id: 42, revision: 3,
    candidates: {
        tags: ['mens', 'birthday'], countryCode: 'KR', sourceId: 'uverworld.jp:1',
        conflicts: [{ field: 'countryCode', values: ['KR', 'JP'] }],
        sources: {
            'uverworld.jp:1': { tags: ['birthday'], countryCode: 'KR', sourceUrl: 'https://example.test/official', original: { title: '生誕祭' } },
            'setlistfm:1': { tags: ['mens'], countryCode: 'JP', original: { info: '男祭り' } },
        },
    },
    overrides: {},
    effective: { tags: ['mens', 'birthday'], country: { code: null, status: 'unreviewed' },
        members: { ids: [], status: 'unreviewed' }, classification: { needsReview: false, note: null } },
});
let onClose: Mock<() => void>;
let onSaved: Mock<() => void>;
beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn(); onSaved = vi.fn();
    mocks.get.mockResolvedValue(fixture());
    mocks.patch.mockResolvedValue({ ...fixture(), revision: 4 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());
async function setup() {
    const result = render(<LiveMetadataEditor liveId={42} liveTitle="Fixture Tour" onClose={onClose} onSaved={onSaved} />);
    await screen.findByText('現在の有効情報');
    return result;
}
const save = () => fireEvent.click(screen.getByRole('button', { name: '追加情報を保存' }));
const requestBody = () => mocks.patch.mock.calls[0][1];

describe('LiveMetadataEditor', () => {
    it('親の変形に影響されないPortalへ表示し、背景スクロール状態を復元する', async () => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        const view = await setup();
        try {
            expect(screen.getByRole('dialog').parentElement?.parentElement).toBe(document.body);
            expect(document.body.style.overflow).toBe('hidden');
            view.unmount();
            expect(document.body.style.overflow).toBe('auto');
        } finally { view.unmount(); document.body.style.overflow = previous; }
    });
    it('管理用APIから候補・不一致・取得元別原文を表示し、変更なしでは保存しない', async () => {
        await setup();
        expect(mocks.get).toHaveBeenCalledWith('/api/lives/42/metadata', expect.objectContaining({ signal: expect.any(AbortSignal) }));
        expect(screen.getByText('取得元の不一致：開催国 — KR / JP')).toBeInTheDocument();
        expect(screen.getByText('取得元：uverworld.jp:1')).toBeInTheDocument();
        expect(screen.getByText('取得元：setlistfm:1')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '追加情報を保存' })).toBeDisabled();
        expect(mocks.patch).not.toHaveBeenCalled();
    });

    it('変更したタグ項目だけをrevision付きで送信し、既存の手動追加/除外も維持する', async () => {
        const data = fixture(); data.overrides = { tagOverrides: { add: ['vs'], remove: ['mens'] } };
        mocks.get.mockResolvedValue(data);
        await setup();
        fireEvent.change(screen.getByLabelText('生誕祭'), { target: { value: 'add' } });
        save();
        await screen.findByText('追加情報を保存しました。');
        expect(requestBody()).toEqual({ revision: 3, patch: { tagOverrides: { add: ['birthday', 'vs'], remove: ['mens'] } } });
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: '追加情報を保存' })).toBeDisabled();
    });

    it('タグを全て自動へ戻す操作はnullを送信する', async () => {
        await setup();
        fireEvent.click(screen.getByRole('button', { name: 'タグをすべて自動候補へ戻す' }));
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody()).toEqual({ revision: 3, patch: { tagOverrides: null } });
    });

    it('開催国候補を確認して保存し、未編集項目は送信しない', async () => {
        await setup();
        fireEvent.change(screen.getByLabelText('開催国の確認状態'), { target: { value: 'confirmed' } });
        expect(screen.getByLabelText('開催国コード')).toHaveValue('KR');
        fireEvent.change(screen.getByLabelText('開催国コード'), { target: { value: 'jp' } });
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody()).toEqual({ revision: 3, patch: { country: { code: 'JP' } } });
    });

    it('確認済み国を自動候補へ戻すとnullを送信する', async () => {
        const data = fixture(); data.overrides.country = { code: 'JP' };
        mocks.get.mockResolvedValue(data);
        await setup();
        fireEvent.change(screen.getByLabelText('開催国の確認状態'), { target: { value: 'auto' } });
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody().patch).toEqual({ country: null });
    });

    it('メンバー未選択の確定は「対象なし」、未確認へ戻す操作はnullにする', async () => {
        const confirmed = fixture(); confirmed.overrides.members = { ids: [] };
        confirmed.effective.members = { ids: [], status: 'confirmed' }; confirmed.revision = 4;
        mocks.patch.mockResolvedValueOnce(confirmed);
        await setup();
        fireEvent.change(screen.getByLabelText('対象メンバーの確認状態'), { target: { value: 'confirmed' } });
        save();
        await screen.findByText('追加情報を保存しました。');
        expect(requestBody().patch).toEqual({ members: { ids: [] } });
        mocks.patch.mockClear();
        fireEvent.change(screen.getByLabelText('対象メンバーの確認状態'), { target: { value: 'auto' } });
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody().patch).toEqual({ members: null });
    });

    it('対象メンバーと分類検討メモを保存できる', async () => {
        await setup();
        fireEvent.change(screen.getByLabelText('対象メンバーの確認状態'), { target: { value: 'confirmed' } });
        fireEvent.click(screen.getByLabelText('TAKUYA∞'));
        fireEvent.click(screen.getByLabelText('既存分類に収まらない・分類検討が必要'));
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '  公式説明を確認する  ' } });
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody().patch).toEqual({ members: { ids: ['takuya'] }, classification: { needsReview: true, note: '公式説明を確認する' } });
    });

    it('共演者なしの確認済み保存と未確認への復帰を区別する', async () => {
        const confirmed = fixture(); confirmed.overrides.participants = { items: [] };
        confirmed.effective.participants = { items: [], status: 'confirmed' }; confirmed.revision = 4;
        mocks.patch.mockResolvedValueOnce(confirmed);
        await setup();
        fireEvent.change(screen.getByLabelText('共演者の確認状態'), { target: { value: 'confirmed' } });
        save();
        await screen.findByText('追加情報を保存しました。');
        expect(requestBody().patch).toEqual({ participants: { items: [] } });
        mocks.patch.mockClear();
        fireEvent.change(screen.getByLabelText('共演者の確認状態'), { target: { value: 'auto' } });
        save();
        await waitFor(() => expect(mocks.patch).toHaveBeenCalled());
        expect(requestBody().patch).toEqual({ participants: null });
    });

    it('検索したアーティストIDと役割を追加情報専用APIに保存する', async () => {
        mocks.get.mockImplementation(async (url: string) => url.startsWith('/api/live-artists')
            ? [{ id: 10, name: 'Fixture Artist', aliases: ['FA'], revision: 0 }] : fixture());
        await setup();
        fireEvent.change(screen.getByLabelText('共演者の確認状態'), { target: { value: 'confirmed' } });
        fireEvent.change(screen.getByLabelText('共演アーティストを検索'), { target: { value: 'FA' } });
        fireEvent.click(screen.getByRole('button', { name: 'アーティストを検索' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Fixture Artistを選択' }));
        fireEvent.change(screen.getByLabelText('共演の役割'), { target: { value: 'guest' } });
        fireEvent.click(screen.getByRole('button', { name: '共演者を追加' }));
        save();
        await screen.findByText('追加情報を保存しました。');
        expect(requestBody().patch).toEqual({ participants: { items: [{ artistId: 10, role: 'guest' }] } });
    });

    it('409では入力を保持し、再読み込みするまで再送しない', async () => {
        mocks.patch.mockRejectedValue({ status: 409, message: 'conflict' });
        await setup();
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '未保存の入力' } });
        save();
        await screen.findByRole('alert');
        expect(screen.getByLabelText('管理用メモ')).toHaveValue('未保存の入力');
        expect(screen.getByRole('button', { name: '追加情報を保存' })).toBeDisabled();
        expect(mocks.patch).toHaveBeenCalledTimes(1);
        const latest = fixture(); latest.revision = 8;
        mocks.get.mockResolvedValue(latest);
        fireEvent.click(screen.getByRole('button', { name: '最新情報を再読み込み' }));
        await waitFor(() => expect(screen.getByLabelText('管理用メモ')).toHaveValue(''));
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '確認後の入力' } });
        mocks.patch.mockResolvedValue({ ...latest, revision: 9 });
        save();
        await screen.findByText('追加情報を保存しました。');
        expect(mocks.patch.mock.calls[1][1].revision).toBe(8);
    });

    it('検証エラーでも入力を維持し、修正して保存できる', async () => {
        mocks.patch.mockRejectedValueOnce({ status: 400, message: 'Invalid countryCode' });
        await setup();
        fireEvent.change(screen.getByLabelText('開催国の確認状態'), { target: { value: 'confirmed' } });
        fireEvent.change(screen.getByLabelText('開催国コード'), { target: { value: 'XX' } });
        save();
        await screen.findByText('保存できませんでした：Invalid countryCode');
        expect(screen.getByLabelText('開催国コード')).toHaveValue('XX');
        fireEvent.change(screen.getByLabelText('開催国コード'), { target: { value: 'KR' } });
        save();
        await screen.findByText('追加情報を保存しました。');
    });

    it('未保存の変更を破棄しない場合は閉じる/再読み込みを取り消す', async () => {
        await setup();
        vi.mocked(window.confirm).mockReturnValue(false);
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '変更' } });
        fireEvent.click(screen.getByRole('button', { name: '追加情報を閉じる' }));
        fireEvent.click(screen.getByRole('button', { name: '最新情報を再読み込み' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });

    it('取得失敗時は保存操作を出さず再読み込みで回復できる', async () => {
        mocks.get.mockRejectedValueOnce(new Error('fixture read failure'));
        render(<LiveMetadataEditor liveId={42} liveTitle="Fixture Tour" onClose={onClose} onSaved={onSaved} />);
        await screen.findByRole('alert');
        expect(screen.queryByRole('button', { name: '追加情報を保存' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '最新情報を再読み込み' }));
        await screen.findByText('現在の有効情報');
    });

    it('再読み込み失敗時は前回の情報を保持しても保存を禁止する', async () => {
        await setup();
        fireEvent.change(screen.getByLabelText('管理用メモ'), { target: { value: '未保存' } });
        mocks.get.mockRejectedValueOnce(new Error('fixture reload failure'));
        fireEvent.click(screen.getByRole('button', { name: '最新情報を再読み込み' }));
        await screen.findByText('追加情報を取得できませんでした：fixture reload failure');
        expect(screen.getByRole('button', { name: '追加情報を保存' })).toBeDisabled();
        expect(mocks.patch).not.toHaveBeenCalled();
    });

    it('Escapeで閉じ、危険な出典URLをリンクにしない', async () => {
        const data = fixture(); data.candidates.sources!['uverworld.jp:1'].sourceUrl = 'javascript:alert(1)';
        mocks.get.mockResolvedValue(data);
        await setup();
        expect(document.querySelector('a')).toBeNull();
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
