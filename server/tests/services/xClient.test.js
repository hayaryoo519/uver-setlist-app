// promisify(execFile) が custom シンボル経由でモックを直接呼ぶようにする
jest.mock('node:child_process', () => {
    const { promisify } = require('node:util');
    const fn = jest.fn();
    fn[promisify.custom] = (...args) => fn(...args);
    return { execFile: fn };
});

const { execFile } = require('node:child_process');
const xClient = require('../../services/xClient');
const { normalizeTwitterPost, extractTweets, XCollectorAbortError } = xClient;

function mockExec(stdout) {
    execFile.mockResolvedValue({ stdout, stderr: '' });
}

function mockExecError(err) {
    execFile.mockRejectedValue(err);
}

describe('xClient', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TWITTER_AUTH_TOKEN = 'token';
        process.env.TWITTER_CT0 = 'ct0';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('normalizeTwitterPost', () => {
        it('twitter-cli の形式を共通形式へ変換すること', () => {
            const post = normalizeTwitterPost({
                id: '1234567890',
                text: '本日のセトリ',
                created_at: '2026-08-12T12:00:00Z',
                author: { username: 'uver_fan' },
            });

            expect(post).toMatchObject({
                post_id: '1234567890',
                post_url: 'https://x.com/i/status/1234567890',
                posted_at: '2026-08-12T12:00:00Z',
                author: 'uver_fan',
                text: '本日のセトリ',
            });
        });

        it('id が数値でも文字列化されること', () => {
            expect(normalizeTwitterPost({ id: 123, text: 'a' }).post_id).toBe('123');
        });

        it('url が含まれる場合はそちらを優先すること', () => {
            const post = normalizeTwitterPost({ id: '1', url: 'https://x.com/uver/status/1', text: 'a' });
            expect(post.post_url).toBe('https://x.com/uver/status/1');
        });

        it('欠損フィールドは null / 空文字になること', () => {
            const post = normalizeTwitterPost({ id: '1' });
            expect(post.posted_at).toBeNull();
            expect(post.author).toBeNull();
            expect(post.text).toBe('');
        });
    });

    describe('extractTweets', () => {
        it.each([
            ['配列', [{ id: '1' }]],
            ['data キー', { data: [{ id: '1' }] }],
            ['tweets キー', { tweets: [{ id: '1' }] }],
            ['results キー', { results: [{ id: '1' }] }],
        ])('%s から投稿を取り出せること', (_label, input) => {
            expect(extractTweets(input)).toEqual([{ id: '1' }]);
        });

        it('未知の形式では空配列を返すこと', () => {
            expect(extractTweets({ foo: 'bar' })).toEqual([]);
            expect(extractTweets(null)).toEqual([]);
        });
    });

    describe('getPosts', () => {
        it('認証情報が未設定なら CLI を実行せず空配列を返すこと', async () => {
            delete process.env.TWITTER_AUTH_TOKEN;

            await expect(xClient.getPosts('UVERworld セトリ')).resolves.toEqual([]);
            expect(execFile).not.toHaveBeenCalled();
        });

        it('twitter search を --json 付きで実行し正規化した投稿を返すこと', async () => {
            mockExec(JSON.stringify({ data: [{ id: '1', text: 'セトリ', author: { username: 'a' } }] }));

            const posts = await xClient.getPosts('UVERworld セトリ', 5);

            expect(execFile).toHaveBeenCalledWith(
                'twitter',
                ['search', 'UVERworld セトリ', '-n', '5', '--json'],
                expect.objectContaining({
                    env: expect.objectContaining({ TWITTER_AUTH_TOKEN: 'token', TWITTER_CT0: 'ct0' }),
                })
            );
            expect(posts).toHaveLength(1);
            expect(posts[0].post_id).toBe('1');
        });

        it('本文が空の投稿は除外すること', async () => {
            mockExec(JSON.stringify({ data: [{ id: '1', text: '   ' }, { id: '2', text: 'セトリ' }] }));

            const posts = await xClient.getPosts('q');

            expect(posts.map((p) => p.post_id)).toEqual(['2']);
        });

        it('CLI が見つからない場合は中断エラーを投げること', async () => {
            const err = new Error('spawn twitter ENOENT');
            err.code = 'ENOENT';
            mockExecError(err);

            await expect(xClient.getPosts('q')).rejects.toThrow(XCollectorAbortError);
        });

        it('レート制限を検知した場合は中断エラーを投げること', async () => {
            const err = new Error('request failed');
            err.stderr = 'Error: 429 Too Many Requests';
            mockExecError(err);

            await expect(xClient.getPosts('q')).rejects.toThrow(XCollectorAbortError);
        });

        it('JSON として解釈できない出力はエラーになること', async () => {
            mockExec('not json');

            await expect(xClient.getPosts('q')).rejects.toThrow(/JSON/);
        });
    });
});
