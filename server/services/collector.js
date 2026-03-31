const db = require('../db');
const crypto = require('crypto');
const { notifyDraftAdded } = require('../utils/lineNotification');

// レート制限用メモリキャッシュ
const lastRunCache = new Map();

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
 * テキストを正規化する
 */
function normalizeText(text) {
    if (!text) return '';
    return text.toUpperCase()
        .replace(/[\s\W_]/g, '')
        .replace(/[！"＃＄％＆'（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～]/g, '')
        .replace(/[ー−―－]/g, '');
}

/**
 * 正規化ハッシュを生成
 */
function generateHash(text) {
    const normalized = normalizeText(text);
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * 投稿日時とテキストから live_id を推定する
 */
async function estimateLiveId(text, postDate) {
    try {
        const dateStr = postDate instanceof Date ? postDate.toISOString().split('T')[0] : postDate.split('T')[0];
        
        // その日のライブを取得
        const lives = await db.query('SELECT * FROM lives WHERE date = $1', [dateStr]);
        if (lives.rows.length === 0) return null;
        if (lives.rows.length === 1) return lives.rows[0].id; // 1件なら確定(可能性大)

        // 複数ある場合は会場名でマッチング
        for (const live of lives.rows) {
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
 * X (Twitter) 等から投稿を取得する (抽象化)
 */
async function getPosts(query) {
    // console.log(`Searching SNS for: ${query}`);
    return []; // 実装はユーザーに委ねる、または外部API連携
}

/**
 * GPT判定
 */
async function identifySetlist(text) {
    try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `以下のテキストがライブのセットリストか判定してください。
演奏曲のみ抽出しJSONで返してください。
{ "is_setlist": boolean, "songs": ["曲名1", ...] }`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `${prompt}\n\nテキスト:\n${text}` }],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        await logToDb('error', 'GPT identification failed', { error: err.message, text: text.substring(0, 100) });
        return { is_setlist: false, songs: [] };
    }
}

/**
 * 信頼度計算 (グルーピング加点あり)
 */
async function calculateConfidence(songs, duplicateCount = 1) {
    let score = 0.3;
    if (songs.length >= 12) score += 0.3;
    
    // 重複投稿ボーナス
    if (duplicateCount >= 5) score += 0.3;
    else if (duplicateCount >= 2) score += 0.15;

    return Math.min(1.0, score);
}

/**
 * 収集器のメイン処理
 */
async function collect(query, inputLiveId = null) {
    // レート制限チェック
    const now = Date.now();
    const cacheKey = inputLiveId || query;
    if (lastRunCache.has(cacheKey) && (now - lastRunCache.get(cacheKey) < 3600000)) {
        console.log(`[Rate Limit] Skipping collection for ${cacheKey}`);
        return 0;
    }
    lastRunCache.set(cacheKey, now);

    // 内部関数をモック可能にするため exports を経由
    const posts = await module.exports.getPosts(query);
    console.log(`[Collector] Found ${posts.length} posts to process`);
    if (!posts || posts.length === 0) {
        return 0;
    }

    let count = 0;
    for (const post of posts) {
        try {
            console.log(`[Collector] Processing post: ${post.url || 'no-url'}`);
            const result = await identifySetlist(post.text);
            console.log(`[Collector] GPT Result: is_setlist=${result.is_setlist}, songs=${result.songs?.length}`);
            
            if (!result.is_setlist || result.songs.length < 10) {
                console.log(`[Collector] Skipping (not a setlist or too short)`);
                continue;
            }

            const songsText = result.songs.join('\n');
            const hash = generateHash(songsText);

            // ライブIDの自動紐付け (指定がない場合)
            const liveId = inputLiveId || await estimateLiveId(post.text, post.created_at || new Date());
            console.log(`[Collector] Estimated Live ID: ${liveId}`);

            // 重複チェック & グルーピング
            const existing = await db.query(
                'SELECT id, duplicate_count FROM raw_setlists WHERE raw_text_hash = $1',
                [hash]
            );

            if (existing.rows.length > 0) {
                // グルーピング: 同一ハッシュならカウントアップ
                const newCount = (existing.rows[0].duplicate_count || 1) + 1;
                const newConfidence = await calculateConfidence(result.songs, newCount);
                
                await db.query(
                    'UPDATE raw_setlists SET duplicate_count = $1, confidence = $2, updated_at = NOW() WHERE id = $3',
                    [newCount, newConfidence, existing.rows[0].id]
                );
                console.log(`[Grouping] Updated Draft #${existing.rows[0].id} (Count: ${newCount})`);
                continue;
            }

            // 新規作成
            const confidence = await calculateConfidence(result.songs, 1);
            const parsedJson = result.songs.map((s, i) => ({ position: i+1, title: s }));

            console.log(`[Collector] Creating new draft with live_id=${liveId}`);
            const insertResult = await db.query(
                `INSERT INTO raw_setlists (live_id, source, raw_text, parsed_json, status, source_url, raw_text_hash, confidence, duplicate_count)
                 VALUES ($1, 'x', $2, $3, 'pending', $4, $5, $6, $7)
                 RETURNING *`,
                [liveId, post.text, JSON.stringify(parsedJson), post.url, hash, confidence, 1]
            );

            // LINE通知（非同期・失敗しても引き続き処理する）
            notifyDraftAdded(insertResult.rows[0]).catch(err => console.error('[LINE] 自動収集ドラフト通知エラー:', err.message));

            count++;
        } catch (postErr) {
            console.error(`[Collector] Post processing error:`, postErr);
            await logToDb('error', 'Post processing error', { error: postErr.message, url: post.url });
        }
    }

    if (count > 0) {
        await logToDb('info', `Collected ${count} new setlists`, { query, liveId: inputLiveId });
    }
    return count;
}

module.exports = { collect, identifySetlist, getPosts };
