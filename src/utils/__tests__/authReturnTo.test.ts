import { describe, expect, it } from 'vitest';
import { safeReturnTo, loginRedirectUrl } from '../authReturnTo';

describe('認証後の安全な復帰先', () => {
    it('Router locationから単件通知のquery/hashを保持し、stateをコピーしない', () => {
        expect(safeReturnTo({ pathname: '/admin', search: '?tab=lives&metadata=42', hash: '#review', state: { private: true } }))
            .toBe('/admin?tab=lives&metadata=42#review');
    });
    it('未確認一覧の復帰先を一度だけqueryへエンコードする', () => {
        const target = '/admin?tab=lives&review=unconfirmed';
        expect(new URLSearchParams(loginRedirectUrl(target).split('?')[1]).get('returnTo')).toBe(target);
    });
    it.each([undefined, null, {}, 42, 'https://outside.example.invalid/admin', '//outside.example.invalid/admin',
        '/\\outside.example.invalid', '/%2f%2foutside.example.invalid', '/admin\n', '/admin/%5cfoo',
        '/login?returnTo=/login', '/LOGIN', '/signup', '/verify-email?token=fixture', '/reset-password?token=fixture', '/api/auth/login',
        { pathname: '/admin', search: '//outside.example.invalid' }])('不正/外部/認証ループの復帰先 %j を拒否する', value => {
        expect(safeReturnTo(value)).toBe('/mypage');
    });
});
