const RETURN_ORIGIN = 'https://return.example.invalid';

/** URLだけを保持し、Router stateの任意オブジェクトをコピーしない。 */
export function safeReturnTo(value: unknown): string {
    const fallback = '/mypage';
    let candidate: unknown = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const location = value as Record<string, unknown>;
        if (typeof location.pathname !== 'string' ||
            (location.search !== undefined && (typeof location.search !== 'string' || (location.search !== '' && !location.search.startsWith('?')))) ||
            (location.hash !== undefined && (typeof location.hash !== 'string' || (location.hash !== '' && !location.hash.startsWith('#'))))) return fallback;
        candidate = location.pathname + (location.search || '') + (location.hash || '');
    }
    if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(candidate)) return fallback;
    try {
        const url = new URL(candidate, RETURN_ORIGIN);
        const decodedPath = decodeURIComponent(url.pathname);
        if (url.origin !== RETURN_ORIGIN || decodedPath.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decodedPath) ||
            /^\/(login|signup|verify-email|reset-password|forgot-password|api)(\/|$)/i.test(decodedPath)) return fallback;
        return url.pathname + url.search + url.hash;
    } catch { return fallback; }
}

export function loginRedirectUrl(from: unknown): string {
    return `/login?returnTo=${encodeURIComponent(safeReturnTo(from))}`;
}
