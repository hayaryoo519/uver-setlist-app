const db = require('../db');
const { normalizeForHash: normalizeText, generateHash } = require('../utils/setlistHash');
const xClient = require('./xClient');

const { XCollectorAbortError } = xClient;

// レート制限用メモリキャッシュ（キーは live_id + クエリ単位）
const lastRunCache = new Map();
const RATE_LIMIT_MS = 60 * 60 * 1000;

// 曲マスタのキャッシュ（Confidence 計算のたびに全件取得しないため）
const SONG_CACHE_TTL_MS = 5 * 60 * 1000;
let songCache = null;
let songCacheAt = 0;

/**
 * ログを DB に書き込む
 */
async function logToDb(level, message, details = null) {
    try {
        await db.query(
            'INSERT INTO collector_logs (level, message, details) VALUES ($1, $2, $3)',
            [level, message, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.error('Failed to write collector log to DB:', err);
    }
}

/**
 * 曲マスタを取得（5分キャッシュ）
 */
async function loadSongs() {
    if (songCache && Date.now() - songCacheAt < SONG_CACHE_TTL_MS) {
        return songCache;
    }
    const result = await db.query(
        'SELECT id, title, normalized_title FROM songs WHERE deleted_at IS NULL'
    );
    songCache = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        normalizedTitle: (row.normalized_title || '').toLowerCase().trim(),
        fuzzyKey: normalizeText(row.title),
    }));
    songCacheAt = Date.now();
    return songCache;
}

/**
 * 曲名を曲マスタに突き合わせる
 * 完全一致 → normalized_title 一致 → 記号・空白を落としたファジー一致 の順に試す
 */
function matchSong(title, songs) {
    const raw = (title || '').trim();
    if (!raw) return null;

    const exact = songs.find((s) => s.title === raw);
    if (exact) return exact;

    const normalizedKey = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized = songs.find((s) => s.normalizedTitle && s.normalizedTitle === normalizedKey);
    if (normalized) return normalized;

    const fuzzyKey = normalizeText(raw);
    if (!fuzzyKey) return null;
    return songs.find((s) => s.fuzzyKey && s.fuzzyKey === fuzzyKey) || null;
}

/**
 * 抽出した曲名リストを parsed_json 形式へ変換する
 * 曲マスタに一致した場合は song_id を持たせ、不明曲は song_id: null（管理画面で要確認）
 */
async function buildParsedSongs(titles) {
    let songs = [];
    try {
        songs = await loadSongs();
    } catch (err) {
        console.warn('[Collector] 曲マスタの取得に失敗しました:', err.message);
    }

    return titles.map((title, index) => {
        const matched = songs.length > 0 ? matchSong(title, songs) : null;
        return {
            position: index + 1,
            title,
            song_id: matched ? matched.id : null,
            matched_title: matched ? matched.title : null,
        };
    });
}

// フェス・イベントは持ち時間が短く曲数が少ない。
// 本番DB実績では FESTIVAL が平均8.9曲・最小6曲、ONEMAN は平均21.0曲・最小10曲。
const SHORT_SET_TYPES = new Set(['FESTIVAL', 'EVENT']);
const MIN_SONGS_SHORT_SET = 5;
const MIN_SONGS_DEFAULT = 10;

// UVERworld の曲がこの割合を下回るセトリは対象外とする。
// 同じフェスに出演した他アーティストのセトリが同一クエリで大量に引っかかるため。
const MIN_SONG_MATCH_RATE = 0.3;

// ライブ情報のキャッシュ（1回の collect 内で同じライブを何度も引かない）
const liveCache = new Map();

/**
 * live_id からライブ情報を取得する
 * 特定できない場合は null（呼び出し側は保守的な既定値を使う）
 */
async function getLive(liveId) {
    if (!liveId) return null;
    if (liveCache.has(liveId)) return liveCache.get(liveId);

    let live = null;
    try {
        const result = await db.query(
            'SELECT id, date, venue, tour_name, type FROM lives WHERE id = $1',
            [liveId]
        );
        live = result.rows[0] ?? null;
    } catch (err) {
        console.warn('[Collector] ライブ情報の取得に失敗しました:', err.message);
    }
    liveCache.set(liveId, live);
    return live;
}

/**
 * 公演種別ごとの最低曲数
 * 種別が不明な場合は、ノイズを拾わないよう厳しい方（10曲）に倒す
 */
function minSongsForType(liveType) {
    return SHORT_SET_TYPES.has(liveType) ? MIN_SONGS_SHORT_SET : MIN_SONGS_DEFAULT;
}

/**
 * 投稿日時とテキストから live_id を推定する
 */
async function estimateLiveId(text, postDate) {
    try {
        const dateStr = postDate instanceof Date
            ? postDate.toISOString().split('T')[0]
            : String(postDate).split('T')[0];

        // その日のライブを取得
        const lives = await db.query('SELECT * FROM lives WHERE date = $1', [dateStr]);
        if (lives.rows.length === 0) return null;
        if (lives.rows.length === 1) return lives.rows[0].id; // 1件なら確定(可能性大)

        // 複数ある場合は会場名でマッチング
        for (const live of lives.rows) {
            if (!live.venue) continue;
            if (text.includes(live.venue) || text.includes(live.venue.replace('Zepp ', ''))) {
                return live.id;
            }
        }
    } catch (err) {
        console.error('Live ID estimation error:', err);
    }
    return null;
}

/**
 * X (Twitter) から投稿を取得する
 * 実体は twitter-cli アダプタ（services/xClient.js）
 */
async function getPosts(query, limit = 20) {
    return xClient.getPosts(query, limit);
}

/**
 * 対象公演をプロンプトに埋め込む文面を組み立てる
 */
function buildLiveContext(live) {
    if (!live) return '';

    const dateStr = live.date instanceof Date
        ? live.date.toISOString().split('T')[0]
        : String(live.date || '').split('T')[0];
    const parts = [
        dateStr && `日付: ${dateStr}`,
        live.venue && `会場: ${live.venue}`,
        live.tour_name && `公演名: ${live.tour_name}`,
    ].filter(Boolean);
    if (parts.length === 0) return '';

    return `
対象公演は以下です。この公演のセットリストでなければ is_setlist を false にしてください。
${parts.join('\n')}
投稿に別の日付・会場・公演名が明記されている場合は、たとえ UVERworld のセットリストであっても false にしてください。
`;
}

/**
 * GPT判定
 * セトリ予想・願望・感想のみの投稿を除外させる（仕様 §6）
 *
 * @param {object|null} live 対象公演。渡すと「その公演のものか」も判定させる
 */
async function identifySetlist(text, live = null) {
    try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `以下のX(Twitter)投稿が、実際に開催されたUVERworldのライブで演奏されたセットリストの記録か判定してください。
演奏された曲のみを演奏順に抽出し、JSONで返してください。
${buildLiveContext(live)}
is_setlist を false にする例:
- セトリ予想・願望（「〇〇やってほしい」「予想」「聴きたい」等）
- ライブの感想のみで曲順の記載がないもの
- 過去公演の振り返りや、日付が明示的に別公演のもの
- Spotify/Apple Music 等のプレイリスト
- UVERworld 以外のアーティストのセットリスト。
  フェスでは同じ会場の別アーティストのセトリが紛れ込みやすいので特に注意すること。
  曲名に UVERworld の楽曲が含まれない場合は false にすること。

is_setlist を true にする例:
- 番号付き・箇条書きで演奏曲が並んでいるもの
- 「本日のセトリ」「今日のセットリスト」等の明確な記載があるもの

出力形式:
{ "is_setlist": boolean, "songs": ["曲名1", "曲名2", ...] }`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `${prompt}\n\n投稿:\n${text}` }],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        return {
            is_setlist: Boolean(parsed.is_setlist),
            songs: Array.isArray(parsed.songs) ? parsed.songs : [],
        };
    } catch (err) {
        await logToDb('error', 'GPT identification failed', { error: err.message, text: text.substring(0, 100) });
        return { is_setlist: false, songs: [] };
    }
}

/**
 * 信頼度計算（仕様 §9 の重み付け）
 *
 *   楽曲DB一致率   40%
 *   曲数の妥当性   20%
 *   複数投稿一致   20%
 *   ノイズの少なさ 20%
 *
 * 仕様の「曲順の一貫性 10%」は単一投稿からは判定できないため、
 * ノイズ判定に統合して 20% としている。
 *
 * @param {Array} parsedSongs buildParsedSongs() の戻り値
 * @param {string|null} liveType 公演種別。フェス・イベントは曲数の期待値が異なる
 */
function calculateConfidence(parsedSongs, duplicateCount = 1, rawText = '', liveType = null) {
    const total = parsedSongs.length;
    if (total === 0) return 0;

    // 楽曲DB一致率
    const matchRate = parsedSongs.filter((s) => s.song_id).length / total;
    let score = matchRate * 0.4;

    // 曲数の妥当性（本番DB実績: FESTIVAL は 6〜17曲、ワンマン系は 10〜28曲）
    if (SHORT_SET_TYPES.has(liveType)) {
        if (total >= 5 && total <= 18) score += 0.2;
        else if (total >= 3) score += 0.1;
    } else if (total >= 15 && total <= 30) score += 0.2;
    else if (total >= 10) score += 0.15;
    else if (total >= 5) score += 0.08;

    // 複数投稿一致
    if (duplicateCount >= 5) score += 0.2;
    else if (duplicateCount >= 3) score += 0.15;
    else if (duplicateCount >= 2) score += 0.1;

    // ノイズの少なさ
    const noiseMatches = rawText.match(/[!?#$%^]/g);
    if (!noiseMatches) score += 0.2;
    else if (noiseMatches.length <= 15) score += 0.1;

    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

/**
 * 収集器のメイン処理
 *
 * @throws {XCollectorAbortError} レート制限・認証エラー時（呼び出し側は残りのクエリを中止する）
 * @returns {number} 新規作成したドラフト数
 */
async function collect(query, inputLiveId = null) {
    // レート制限チェック（同一ライブ × 同一クエリで 1 時間に 1 回）
    const now = Date.now();
    const cacheKey = `${inputLiveId ?? 'any'}::${query}`;
    if (lastRunCache.has(cacheKey) && (now - lastRunCache.get(cacheKey) < RATE_LIMIT_MS)) {
        console.log(`[Rate Limit] Skipping collection for ${cacheKey}`);
        return 0;
    }
    lastRunCache.set(cacheKey, now);

    const stats = { query, liveId: inputLiveId, fetched: 0, candidates: 0, lowMatch: 0, created: 0, grouped: 0, errors: 0 };

    let posts;
    try {
        // 内部関数をモック可能にするため exports を経由
        posts = await module.exports.getPosts(query);
    } catch (err) {
        stats.errors++;
        await logToDb(
            err instanceof XCollectorAbortError ? 'warn' : 'error',
            'X post fetch failed',
            { ...stats, error: err.message }
        );
        // レート制限・認証エラーは呼び出し側で収集全体を打ち切らせる
        if (err instanceof XCollectorAbortError) throw err;
        return 0;
    }

    stats.fetched = posts.length;
    console.log(`[Collector] Found ${posts.length} posts to process`);

    for (const post of posts) {
        try {
            // リツイートは本文が原投稿と同一なため、複数投稿一致の加点を水増ししてしまう
            if (post.is_retweet) {
                console.log(`[Collector] Skipping retweet: ${post.post_url || 'no-url'}`);
                continue;
            }

            // 対象ライブが分かっていれば、その公演のセトリかを GPT にも判定させる
            const inputLive = inputLiveId ? await getLive(inputLiveId) : null;

            console.log(`[Collector] Processing post: ${post.post_url || 'no-url'}`);
            const result = await module.exports.identifySetlist(post.text, inputLive);
            console.log(`[Collector] GPT Result: is_setlist=${result.is_setlist}, songs=${result.songs?.length}`);

            if (!result.is_setlist) {
                console.log(`[Collector] Skipping (not a setlist)`);
                continue;
            }

            // ライブIDの自動紐付け (指定がない場合)
            // 最低曲数の判定に公演種別が要るため、曲数チェックより先に確定させる
            const liveId = inputLiveId || await estimateLiveId(post.text, post.posted_at || new Date());
            console.log(`[Collector] Estimated Live ID: ${liveId}`);

            const liveType = (inputLive || await getLive(liveId))?.type ?? null;
            const minSongs = minSongsForType(liveType);
            if (result.songs.length < minSongs) {
                console.log(`[Collector] Skipping (${result.songs.length} songs < ${minSongs} for type=${liveType ?? 'unknown'})`);
                continue;
            }

            // 曲マスタ一致率での足切り。
            // 同じフェスに出演した他アーティストのセトリが同一クエリで引っかかるため、
            // UVERworld の曲が一定割合含まれないものは対象外とする。
            const parsedSongs = await buildParsedSongs(result.songs);
            const matchRate = parsedSongs.filter((s) => s.song_id).length / parsedSongs.length;
            if (matchRate < MIN_SONG_MATCH_RATE) {
                stats.lowMatch++;
                console.log(`[Collector] Skipping (曲マスタ一致率 ${Math.round(matchRate * 100)}% < ${MIN_SONG_MATCH_RATE * 100}%)`);
                continue;
            }
            stats.candidates++;

            const songsText = result.songs.join('\n');
            const hash = generateHash(songsText);

            // 重複チェック & グルーピング
            const existing = await db.query(
                'SELECT id, duplicate_count, source_urls, source_post_ids FROM raw_setlists WHERE raw_text_hash = $1',
                [hash]
            );

            if (existing.rows.length > 0) {
                const draft = existing.rows[0];
                const knownPostIds = draft.source_post_ids || [];

                // 別クエリで同じ投稿を再取得した場合はカウントしない
                if (knownPostIds.includes(post.post_id)) {
                    console.log(`[Grouping] Post ${post.post_id} already counted in Draft #${draft.id}`);
                    continue;
                }

                const newCount = (draft.duplicate_count || 1) + 1;
                const newConfidence = calculateConfidence(parsedSongs, newCount, post.text, liveType);

                await db.query(
                    `UPDATE raw_setlists
                     SET duplicate_count = $1,
                         confidence = $2,
                         source_urls = array_append(COALESCE(source_urls, ARRAY[]::TEXT[]), $3),
                         source_post_ids = array_append(COALESCE(source_post_ids, ARRAY[]::TEXT[]), $4),
                         updated_at = NOW()
                     WHERE id = $5`,
                    [newCount, newConfidence, post.post_url, post.post_id, draft.id]
                );
                stats.grouped++;
                console.log(`[Grouping] Updated Draft #${draft.id} (Count: ${newCount})`);
                continue;
            }

            // 新規作成
            const confidence = calculateConfidence(parsedSongs, 1, post.text, liveType);

            console.log(`[Collector] Creating new draft with live_id=${liveId}`);
            const insertResult = await db.query(
                `INSERT INTO raw_setlists (live_id, source, raw_text, parsed_json, status, source_url, source_urls, source_post_ids, raw_text_hash, confidence, duplicate_count)
                 VALUES ($1, 'x', $2, $3, 'pending', $4, $5, $6, $7, $8, 1)
                 RETURNING *`,
                [
                    liveId,
                    post.text,
                    JSON.stringify(parsedSongs),
                    post.post_url,
                    [post.post_url],
                    [post.post_id],
                    hash,
                    confidence,
                ]
            );

            // 個別のLINE通知はここでは送らない。
            // 1公演で最大5クエリ投げるため通知が溢れるので、
            // live_monitor 側で公演ごとに1通へまとめる。
            stats.created++;
        } catch (postErr) {
            stats.errors++;
            console.error(`[Collector] Post processing error:`, postErr);
            await logToDb('error', 'Post processing error', { error: postErr.message, url: post.post_url });
        }
    }

    // 仕様 §11: 実行ごとに取得件数・候補数・作成数を残す
    await logToDb(stats.errors > 0 ? 'warn' : 'info', 'X collection finished', stats);
    return stats.created;
}

/**
 * テスト用: レート制限キャッシュと曲マスタキャッシュを初期化する
 */
function _resetCaches() {
    lastRunCache.clear();
    liveCache.clear();
    songCache = null;
    songCacheAt = 0;
}

module.exports = {
    collect,
    identifySetlist,
    getPosts,
    calculateConfidence,
    buildParsedSongs,
    matchSong,
    minSongsForType,
    buildLiveContext,
    MIN_SONG_MATCH_RATE,
    XCollectorAbortError,
    _resetCaches,
};
