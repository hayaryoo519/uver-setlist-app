const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

// twitter-cli の実行ファイル名（PATH 上にない場合は絶対パスを .env で指定する）
const TWITTER_BIN = process.env.TWITTER_CLI_BIN || 'twitter';
// 取得件数を指定するフラグ。twitter-cli 側の仕様変更に備えて差し替え可能にしておく
const LIMIT_FLAG = process.env.TWITTER_CLI_LIMIT_FLAG || '-n';

const DEFAULT_LIMIT = 20;
const EXEC_TIMEOUT_MS = 30 * 1000;
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * レート制限・認証失敗など「その回の収集を打ち切るべき」エラー
 * 呼び出し側はこれを捕捉したら残りのクエリを実行せず終了する
 */
class XCollectorAbortError extends Error {
    constructor(message) {
        super(message);
        this.name = 'XCollectorAbortError';
    }
}

/**
 * 認証情報が揃っているか
 */
function isConfigured() {
    return Boolean(process.env.TWITTER_AUTH_TOKEN && process.env.TWITTER_CT0);
}

/**
 * twitter-cli 固有のレスポンスから投稿配列を取り出す
 * --json の外側の形（配列 / { data } / { tweets } / { results }）の差異を吸収する
 */
function extractTweets(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== 'object') return [];
    for (const key of ['data', 'tweets', 'results', 'statuses']) {
        if (Array.isArray(parsed[key])) return parsed[key];
    }
    return [];
}

/**
 * X の text に含まれる HTML エンティティを戻す
 * twitter-cli は "&amp;" 等をそのまま返すため、曲名照合の前に復元する
 */
function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * twitter-cli 固有形式 → collector 共通形式 (CollectedPost)
 *
 * twitter-cli 0.8.5 の実際のフィールド名は camelCase（createdAtISO / screenName /
 * isRetweet）。他バックエンドや将来の変更に備えて snake_case も見る。
 *
 * @returns {{post_id: string, post_url: string, posted_at: string|null, author: string|null, text: string, is_retweet: boolean, raw: object}}
 */
function normalizeTwitterPost(tweet) {
    const postId = tweet.id ?? tweet.id_str ?? tweet.rest_id ?? null;
    const screenName =
        tweet.author?.screenName ??
        tweet.author?.username ??
        tweet.author?.screen_name ??
        tweet.user?.screen_name ??
        tweet.username ??
        null;
    const author = screenName ?? tweet.author?.name ?? null;

    let postUrl = tweet.url ?? tweet.permalink ?? null;
    if (!postUrl && postId) {
        postUrl = `https://x.com/${screenName ?? 'i'}/status/${postId}`;
    }

    return {
        post_id: postId != null ? String(postId) : null,
        post_url: postUrl,
        posted_at:
            tweet.createdAtISO ??
            tweet.created_at ??
            tweet.createdAt ??
            tweet.posted_at ??
            tweet.timestamp ??
            null,
        author,
        text: decodeEntities(tweet.text ?? tweet.full_text ?? tweet.content ?? ''),
        is_retweet: Boolean(tweet.isRetweet ?? tweet.is_retweet ?? tweet.retweeted ?? false),
        raw: tweet,
    };
}

/**
 * 収集を打ち切るべきエラーか（レート制限・認証切れ）を判定する
 */
function shouldAbort(err) {
    const haystack = [err.message, err.stderr, err.stdout]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();

    return /rate.?limit|too many requests|\b429\b|\b401\b|\b403\b|unauthorized|forbidden|authentication|login required/.test(haystack);
}

/**
 * X を検索して共通形式の投稿配列を返す
 *
 * 認証情報が未設定の場合は例外にせず空配列を返す（収集が止まるだけで他機能に影響させない）
 * レート制限・認証失敗の場合は XCollectorAbortError を投げる
 */
async function getPosts(query, limit = DEFAULT_LIMIT) {
    if (!isConfigured()) {
        console.warn('[xClient] TWITTER_AUTH_TOKEN / TWITTER_CT0 が未設定のため X 収集をスキップします');
        return [];
    }

    let stdout;
    try {
        ({ stdout } = await execFileAsync(
            TWITTER_BIN,
            ['search', query, LIMIT_FLAG, String(limit), '--json'],
            {
                env: {
                    ...process.env,
                    TWITTER_AUTH_TOKEN: process.env.TWITTER_AUTH_TOKEN,
                    TWITTER_CT0: process.env.TWITTER_CT0,
                },
                timeout: EXEC_TIMEOUT_MS,
                maxBuffer: MAX_BUFFER,
            }
        ));
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new XCollectorAbortError(
                `twitter-cli (${TWITTER_BIN}) が見つかりません。Agent Reach でインストール・設定を確認してください`
            );
        }
        if (shouldAbort(err)) {
            throw new XCollectorAbortError(`X 検索がレート制限／認証エラーで失敗しました: ${err.message}`);
        }
        throw new Error(`twitter search の実行に失敗しました: ${err.message}`);
    }

    let parsed;
    try {
        parsed = JSON.parse(stdout);
    } catch (err) {
        throw new Error(`twitter search の JSON 出力を解析できませんでした: ${err.message}`);
    }

    // twitter-cli は { ok, schema_version, data } 形式。
    // 失敗時は exit 1 になるが、ok:false だけが返る経路も握り潰さないようにする
    if (parsed && parsed.ok === false) {
        const code = parsed.error?.code ?? 'unknown';
        const message = parsed.error?.message ?? '(詳細なし)';
        if (/rate_limit|unauthorized|forbidden|auth/i.test(code)) {
            throw new XCollectorAbortError(`X 検索が失敗しました [${code}]: ${message}`);
        }
        throw new Error(`X 検索が失敗しました [${code}]: ${message}`);
    }

    return extractTweets(parsed)
        .map(normalizeTwitterPost)
        .filter((post) => post.post_id && post.text.trim());
}

module.exports = {
    getPosts,
    isConfigured,
    normalizeTwitterPost,
    extractTweets,
    XCollectorAbortError,
};
