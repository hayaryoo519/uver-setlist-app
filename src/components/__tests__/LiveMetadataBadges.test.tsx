import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LiveMetadataBadges from '../LiveMetadataBadges';

describe('公開用追加情報バッジ', () => {
    it('有効タグと確認済み国・メンバーだけを表示する', () => {
        render(<LiveMetadataBadges tags={['birthday', 'overseas']} metadata={{
            country: { code: 'KR', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' },
        }} />);
        expect(screen.queryByText('生誕祭', { exact: true })).not.toBeInTheDocument();
        expect(screen.queryByText('海外公演', { exact: true })).not.toBeInTheDocument();
        expect(screen.getByText('海外公演：韓国')).toBeInTheDocument();
        expect(screen.getByText('生誕祭：TAKUYA∞')).toBeInTheDocument();
    });

    it('日本だけが確認済みの通常公演には補足欄を作らない', () => {
        const { container } = render(<LiveMetadataBadges metadata={{
            country: { code: 'JP', status: 'confirmed' }, members: { ids: [], status: 'unreviewed' },
        }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('日本の表示を省略しても特徴タグは残し、入力データを書き換えない', () => {
        const metadata = { country: { code: 'JP' as const, status: 'confirmed' as const }, members: { ids: [], status: 'unreviewed' as const } };
        render(<LiveMetadataBadges tags={['mens']} metadata={metadata} />);
        expect(screen.getByRole('list', { name: '公演属性' })).toBeInTheDocument();
        expect(screen.getByText('男祭り')).toBeInTheDocument();
        expect(screen.queryByText(/開催国|海外公演/)).not.toBeInTheDocument();
        expect(metadata.country).toEqual({ code: 'JP', status: 'confirmed' });
    });

    it('対バン相手があれば汎用対バンを重ねず、未確認メンバーの生誕タグは残す', () => {
        render(<LiveMetadataBadges tags={['vs', 'birthday']} metadata={{
            country: { code: 'JP', status: 'confirmed' }, members: { ids: [], status: 'unreviewed' },
            participants: { status: 'confirmed', items: [{ artistId: 10, name: 'Fixture Artist', aliases: [], role: 'co_headliner' }] },
        }} />);
        expect(screen.queryByText('対バン', { exact: true })).not.toBeInTheDocument();
        expect(screen.getByText('対バン相手：Fixture Artist')).toBeInTheDocument();
        expect(screen.getByText('生誕祭')).toBeInTheDocument();
    });

    it('未確認の国コードは補足に出さない', () => {
        const { container } = render(<LiveMetadataBadges metadata={{
            country: { code: 'KR', status: 'unreviewed' }, members: { ids: [], status: 'unreviewed' },
        }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('共演者の正式名と役割を表示し、ゲストを対バン相手と混同しない', () => {
        render(<LiveMetadataBadges metadata={{ country: { code: null, status: 'unreviewed' }, members: { ids: [], status: 'unreviewed' },
            participants: { status: 'confirmed', items: [{ artistId: 10, name: 'Fixture Artist', aliases: ['FA'], role: 'guest' }] } }} />);
        expect(screen.getByText('ゲスト：Fixture Artist')).toBeInTheDocument();
        expect(screen.queryByText('対バン相手：Fixture Artist')).not.toBeInTheDocument();
    });

    it('未確認の構造化情報や確認済み対象なしをバッジにしない', () => {
        const { container } = render(<LiveMetadataBadges tags={[]} metadata={{
            country: { code: null, status: 'unreviewed' }, members: { ids: [], status: 'confirmed' },
        }} />);
        expect(container).toBeEmptyDOMElement();
    });
});
