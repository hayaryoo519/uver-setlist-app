import { describe, expect, it } from 'vitest';
import { getAnalyticsConfig, loadAnalytics, maskPath, maskUrl, sanitizePayload } from '../analytics';

describe('パスのID置き換え', () => {
    it('数字のIDを :id に置き換える', () => {
        expect(maskPath('/users/123')).toBe('/users/:id');
        expect(maskPath('/live/45/edit')).toBe('/live/:id/edit');
        expect(maskPath('/predictions/edit/7')).toBe('/predictions/edit/:id');
    });

    it('IDを含まないパスはそのまま残す', () => {
        expect(maskPath('/dashboard')).toBe('/dashboard');
        expect(maskPath('/')).toBe('/');
    });

    it('クエリとハッシュを除く', () => {
        expect(maskUrl('https://uver-setlist-archive.org/reset-password?token=abc#x')).toBe('/reset-password');
        expect(maskUrl('https://uver-setlist-archive.org/users/9?x=1')).toBe('/users/:id');
    });
});

describe('sanitizePayload', () => {
    it('url のIDを置き換え、参照元はオリジンを残す', () => {
        expect(sanitizePayload({ url: '/users/12?a=b', referrer: 'https://www.google.com/search?q=uver', title: 'x' })).toEqual({
            url: '/users/:id',
            referrer: 'https://www.google.com/search',
            title: 'x',
        });
    });

    it('想定外の形式は null を返して送信を止める', () => {
        expect(sanitizePayload(null)).toBeNull();
        expect(sanitizePayload(undefined)).toBeNull();
        expect(sanitizePayload({ title: 'no url' })).toBeNull();
        expect(sanitizePayload({ url: '' })).toBeNull();
    });
});

describe('getAnalyticsConfig', () => {
    it('SRC と WEBSITE_ID が両方ないと null を返す', () => {
        expect(getAnalyticsConfig({})).toBeNull();
        expect(getAnalyticsConfig({ VITE_UMAMI_SRC: 'https://a.example/script.js' })).toBeNull();
        expect(getAnalyticsConfig({ VITE_UMAMI_WEBSITE_ID: 'abc' })).toBeNull();
    });

    it('DOMAINS 未指定なら本番ドメインを既定にする', () => {
        expect(getAnalyticsConfig({ VITE_UMAMI_SRC: 'https://a.example/script.js', VITE_UMAMI_WEBSITE_ID: 'abc' })).toEqual({
            src: 'https://a.example/script.js',
            websiteId: 'abc',
            domains: 'uver-setlist-archive.org',
        });
    });
});

describe('loadAnalytics', () => {
    const env = { VITE_UMAMI_SRC: 'https://a.example/script.js', VITE_UMAMI_WEBSITE_ID: 'abc' };

    it('設定がなければ script を追加しない', () => {
        document.head.innerHTML = '';
        expect(loadAnalytics({})).toBe(false);
        expect(document.querySelector('script[data-website-id]')).toBeNull();
    });

    it('クエリ文字列を送らない属性付きで一度だけ追加する', () => {
        document.head.innerHTML = '';
        expect(loadAnalytics(env)).toBe(true);
        expect(loadAnalytics(env)).toBe(true);
        const scripts = document.querySelectorAll('script[data-website-id]');
        expect(scripts).toHaveLength(1);
        const script = scripts[0];
        expect(script.getAttribute('src')).toBe('https://a.example/script.js');
        expect(script.getAttribute('data-website-id')).toBe('abc');
        expect(script.getAttribute('data-domains')).toBe('uver-setlist-archive.org');
        expect(script.getAttribute('data-exclude-search')).toBe('true');
        expect(script.getAttribute('data-before-send')).toBe('__uverBeforeSend');
    });

    it('トラッカーより前に送信前フックを登録する', () => {
        document.head.innerHTML = '';
        loadAnalytics(env);
        const registered = (window as unknown as Record<string, unknown>).__uverBeforeSend as (t: string, p: unknown) => unknown;
        expect(typeof registered).toBe('function');
        expect(registered('pageView', { url: '/users/5' })).toEqual({ url: '/users/:id' });
    });
});
