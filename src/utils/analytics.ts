// Umami によるアクセス解析（Issue #252）
// Cookie を使わず、個人を特定できる情報（クエリ文字列・ユーザーID）は送らない。
// 設定（VITE_UMAMI_SRC / VITE_UMAMI_WEBSITE_ID）が両方ある場合だけトラッカーを読み込む。

const DEFAULT_DOMAIN = 'uver-setlist-archive.org';
const BEFORE_SEND_NAME = '__uverBeforeSend';

// 読み込み対象のホスト名。Staging（IPアドレス）は含めず、計測しない
export const getAnalyticsConfig = (env: Record<string, string | undefined>) => {
    const src = env.VITE_UMAMI_SRC?.trim();
    const websiteId = env.VITE_UMAMI_WEBSITE_ID?.trim();
    if (!src || !websiteId) return null;
    return {
        src,
        websiteId,
        domains: env.VITE_UMAMI_DOMAINS?.trim() || DEFAULT_DOMAIN,
    };
};

// パス中の数字だけ・長い英数字のセグメント（ユーザーID・公演IDなど）を :id に置き換える
// 例: /users/123 → /users/:id、/live/45/edit → /live/:id/edit
const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{20,})$/i;

export const maskPath = (path: string) =>
    path
        .split('/')
        .map(segment => (ID_SEGMENT.test(segment) ? ':id' : segment))
        .join('/');

// URL からクエリ・ハッシュを除き、パス中のIDを置き換える。解析できなければ null
export const maskUrl = (value: string): string | null => {
    try {
        const url = new URL(value, 'https://placeholder.invalid');
        return maskPath(url.pathname);
    } catch {
        return null;
    }
};

// 参照元はドメインが分析に必要なため、オリジンを残してパスだけ置き換える
export const maskReferrer = (value: string): string | null => {
    try {
        const url = new URL(value);
        return `${url.origin}${maskPath(url.pathname)}`;
    } catch {
        return null;
    }
};

// 送信前に URL / 参照元を加工する。形式が想定外なら null を返して送信を止める（安全側に倒す）
export const sanitizePayload = (payload: Record<string, unknown> | null | undefined) => {
    if (!payload || typeof payload !== 'object') return null;
    const sanitized = { ...payload };
    // url が無い・想定外のペイロードは、IDを含むパスを送らないよう送信しない
    if (typeof sanitized.url !== 'string' || sanitized.url === '') return null;
    const maskedUrl = maskUrl(sanitized.url);
    if (maskedUrl === null) return null;
    sanitized.url = maskedUrl;
    if (typeof sanitized.referrer === 'string' && sanitized.referrer !== '') {
        const masked = maskReferrer(sanitized.referrer);
        if (masked === null) return null;
        sanitized.referrer = masked;
    }
    return sanitized;
};

type BeforeSendWindow = Window & {
    [BEFORE_SEND_NAME]?: (type: string, payload: Record<string, unknown>) => Record<string, unknown> | null;
};

// 既に読み込み済みなら何もしない（StrictMode の二重実行対策）
export const loadAnalytics = (
    env: Record<string, string | undefined>,
    doc: Document = document,
) => {
    const config = getAnalyticsConfig(env);
    if (!config) return false;
    if (doc.querySelector('script[data-website-id]')) return true;

    // data-before-send は、トラッカーより前に window 上に定義されている必要がある
    const target = (doc.defaultView ?? window) as BeforeSendWindow;
    target[BEFORE_SEND_NAME] = (_type, payload) => sanitizePayload(payload);

    const script = doc.createElement('script');
    script.defer = true;
    script.src = config.src;
    script.setAttribute('data-website-id', config.websiteId);
    script.setAttribute('data-domains', config.domains);
    // クエリ文字列（パスワード再設定・メール認証のトークンなど）を送らない
    script.setAttribute('data-exclude-search', 'true');
    script.setAttribute('data-before-send', BEFORE_SEND_NAME);
    doc.head.appendChild(script);
    return true;
};
