import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LiveMetadataBadges from '../LiveMetadataBadges';

describe('公開用追加情報バッジ', () => {
    it('有効タグと確認済み国・メンバーだけを表示する', () => {
        render(<LiveMetadataBadges tags={['birthday', 'overseas']} metadata={{
            country: { code: 'KR', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' },
        }} />);
        expect(screen.getByText('生誕祭')).toBeInTheDocument();
        expect(screen.getByText('海外公演')).toBeInTheDocument();
        expect(screen.getByText('開催国：KR')).toBeInTheDocument();
        expect(screen.getByText('生誕祭：TAKUYA∞')).toBeInTheDocument();
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
