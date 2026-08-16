const axios = require('axios');
const db = require('../db');
const { normalizeVenueName } = require('../utils/songTranslations');
const { notifyAdmins } = require('../utils/pushNotification');

/**
 * UVERworld 公式サイトのスケジュールから、出演予定の公演を取り込む。
 *
 * セトリ収集 (services/collector.js) とは別系統。
 * こちらは「出演情報が解禁されたら lives に公演を追加する」ことが目的で、
 * 解禁のタイミングが読めないため1日1回程度の低頻度で回す。
 *
 * 情報源: https://www.uverworld.jp/schedule/list/
 *   一覧ページはサーバーレンダリングで、1件が次の構造になっている。
 *     <li class="category--18 live03">
 *       <a href="/schedule/detail/3186">
 *         <p class="date date--event">2026.08.15<span class="week">[SAT]</span></p>
 *         <p class="cate">EVENT</p>
 *         <p class="tit">RISING SUN ROCK FESTIVAL 2026 in EZO</p>
 *   会場は一覧に無いため、詳細ページ /schedule/detail/<id> から取得する。
 *
 * ソニーミュージックの JSON API
 * (https://www.sonymusic.co.jp/json/v2/artist/UVERworld/live/...) も存在するが、
 * 2023年のツアー1件しか返らず日程が空のため使わない。
 */

const BASE_URL = 'https://www.uverworld.jp';
const LIST_URL = `${BASE_URL}/schedule/list/`;
const SOURCE_NAME = 'uverworld.jp';
const REQUEST_TIMEOUT_MS = 15 * 1000;
const DETAIL_INTERVAL_MS = 1000; // 詳細ページの連続取得を避ける

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

// 一覧のカテゴリ。ライブ関連のみ取り込み、TICKET/RELEASE/TV 等は対象外
const LIVE_CATEGORIES = new Set(['TOUR', 'EVENT']);

async function logToDb(level, message, details = null) {
    try {
        await db.query(
            'INSERT INTO collector_logs (level, message, details) VALUES ($1, $2, $3)',
            [level, message, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.error('Failed to write schedule importer log:', err);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTags(html) {
    return (html || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchHtml(url) {
    const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
        responseType: 'text',
    });
    return res.data;
}

/**
 * 一覧ページの HTML から公演エントリを抽出する
 *
 * @returns {{sourceId: string, date: string, category: string, title: string, detailUrl: string}[]}
 */
function parseScheduleList(html) {
    const entries = [];
    // <li> 単位で切り出してから中身を拾う（項目間の取り違えを防ぐ）
    const itemRe = /<li[^>]*class="category--\d+[^"]*"[\s\S]*?<\/li>/g;

    for (const block of html.match(itemRe) || []) {
        const idMatch = block.match(/href="\/schedule\/detail\/(\d+)"/);
        const dateMatch = block.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        const catMatch = block.match(/<p class="cate">([\s\S]*?)<\/p>/);
        const titleMatch = block.match(/<p class="tit">([\s\S]*?)<\/p>/);
        if (!idMatch || !dateMatch || !titleMatch) continue;

        const category = catMatch ? stripTags(catMatch[1]) : '';
        if (!LIVE_CATEGORIES.has(category)) continue;

        entries.push({
            sourceId: idMatch[1],
            date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
            category,
            title: stripTags(titleMatch[1]),
            detailUrl: `${BASE_URL}/schedule/detail/${idMatch[1]}`,
        });
    }
    return entries;
}

// 会場欄に紛れ込みやすい別項目。ここまでを会場名として切り出す
const VENUE_STOP_WORDS = /(日程|開催日|開場|開演|出演|チケット|料金|問\s*合|主催)/;

/**
 * 詳細ページから会場名を取り出す
 * 取得できない場合は null（会場未定の告知もあるため、それ自体は異常ではない）
 */
function parseVenue(html) {
    // <head> の og:description に「会場：〜」が入っているページがあり、
    // そのまま探すと本文より先にヒットして誤った値を拾うため先に落とす
    const body = (html || '')
        .replace(/<head[\s\S]*?<\/head>/i, '')
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<meta[^>]*>/gi, '');

    const patterns = [
        // <dt>会場</dt><dd>〜</dd>
        /<dt[^>]*>\s*(?:会場|開催地|場所)\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
        // <p>会場</p><p>〜</p> のように別要素に分かれている形
        /(?:会場|開催地|場所)\s*<\/[a-z]+>\s*<[^>]*>([\s\S]*?)</i,
        // 「会場：〜」と同一テキスト内に書かれている形
        /(?:会場|開催地|場所)\s*[：:]\s*([^<]+)/i,
    ];

    for (const re of patterns) {
        const m = body.match(re);
        if (!m) continue;

        let venue = stripTags(m[1]);
        // 「Zepp New Taipei 日程：2026/8/8」のように後続項目が続く場合は切る
        const stop = venue.search(VENUE_STOP_WORDS);
        if (stop > 0) venue = venue.slice(0, stop).trim();
        venue = venue.replace(/[：:]\s*$/, '').trim();

        // 日付だけを拾ってしまった場合は会場とみなさない
        if (!venue || /^\d{4}[./-]\d{1,2}/.test(venue)) continue;
        return venue;
    }
    return null;
}

/**
 * 公演種別を推定する
 * 一覧の EVENT はフェス等の複数アーティスト公演、TOUR は自身のツアー
 */
function detectType(category, venue) {
    if (category === 'EVENT') return 'FESTIVAL';

    const v = (venue || '').toLowerCase();
    if (v.includes('ドーム') || v.includes('dome')) return 'ARENA';
    if (v.includes('アリーナ') || v.includes('arena') || v.includes('武道館') || v.includes('メッセ')) return 'ARENA';
    if (v.includes('zepp') || v.includes('ライブハウス')) return 'LIVEHOUSE';
    if (v.includes('ホール') || v.includes('hall') || v.includes('会館')) return 'HALL';
    return 'ONEMAN';
}

/**
 * ソース側IDで登録済みか判定する
 * 詳細ページを取得する前に判定できるため、既知の公演では追加リクエストを出さずに済む
 */
async function findLiveBySourceId(sourceId) {
    const result = await db.query(
        'SELECT id FROM lives WHERE external_source_id = $1',
        [`${SOURCE_NAME}:${sourceId}`]
    );
    return result.rows[0]?.id ?? null;
}

/**
 * 手動登録済みの公演と重複しないよう、同日・同会場（または同日・同タイトル）でも既存とみなす
 */
async function findExistingLive(entry, venue) {
    if (venue) {
        const byDateVenue = await db.query(
            `SELECT id FROM lives
             WHERE date = $1
               AND (venue = $2 OR normalized_venue = $3)`,
            [entry.date, venue, normalizeVenueName(venue)]
        );
        if (byDateVenue.rows.length > 0) return byDateVenue.rows[0].id;
    }

    // 会場未定の告知は日付とタイトルで突き合わせる
    const byDateTitle = await db.query(
        'SELECT id FROM lives WHERE date = $1 AND tour_name = $2',
        [entry.date, entry.title]
    );
    return byDateTitle.rows[0]?.id ?? null;
}

/**
 * 公式サイトのスケジュールを取り込む
 *
 * @param {{dryRun?: boolean}} options dryRun 時は DB に書き込まない
 * @returns {{fetched: number, candidates: number, created: number, skipped: number, errors: number, created_lives: object[]}}
 */
async function importSchedule({ dryRun = false } = {}) {
    const stats = { fetched: 0, candidates: 0, created: 0, skipped: 0, errors: 0, created_lives: [] };

    let entries;
    try {
        const html = await fetchHtml(LIST_URL);
        entries = parseScheduleList(html);
    } catch (err) {
        stats.errors++;
        await logToDb('error', 'Schedule import failed', { error: err.message });
        throw err;
    }

    stats.fetched = entries.length;
    console.log(`[Schedule] ${entries.length} 件のライブ関連エントリを取得`);

    // スクレイピングのため、先方のHTML構造が変わるとパースが黙って0件になる。
    // ページは取得できているのに1件も取れない状態は異常として記録する
    if (entries.length === 0) {
        await logToDb('warn', 'Schedule import parsed no entries', {
            url: LIST_URL,
            hint: '一覧ページのHTML構造が変わった可能性があります',
        });
        console.warn('[Schedule] エントリを1件も抽出できませんでした。HTML構造の変更を確認してください');
        await notifyAdmins({
            title: '公演情報の取り込みに失敗',
            body: '公式サイトから公演を1件も抽出できませんでした。ページ構造が変わった可能性があります。',
            url: '/admin',
            type: 'schedule_import_broken',
        });
    }

    for (const entry of entries) {
        try {
            // 既知の公演は詳細ページを取りに行かない。
            // 定常状態では一覧の1リクエストだけで済み、相手サイトへの負荷を抑えられる
            if (await findLiveBySourceId(entry.sourceId)) {
                stats.skipped++;
                continue;
            }

            let venue = null;
            try {
                await sleep(DETAIL_INTERVAL_MS);
                venue = parseVenue(await fetchHtml(entry.detailUrl));
            } catch (err) {
                console.warn(`[Schedule] 詳細ページ取得に失敗: ${entry.detailUrl} (${err.message})`);
            }

            const existingId = await findExistingLive(entry, venue);
            if (existingId) {
                stats.skipped++;
                continue;
            }
            stats.candidates++;

            const type = detectType(entry.category, venue);
            const live = {
                date: entry.date,
                venue: venue || '',
                tour_name: entry.title,
                type,
                external_source_id: `${SOURCE_NAME}:${entry.sourceId}`,
            };

            if (dryRun) {
                stats.created_lives.push({ ...live, dryRun: true });
                continue;
            }

            // external_source_id にはユニーク制約を張っていない。
            // 本番では既に別用途（日付+会場+ツアー名のハッシュ）で使われており、
            // 同日同会場の昼夜2公演が同じ値を持つため、一意にできない。
            // 重複は上の findLiveBySourceId / findExistingLive で防ぐ。
            const inserted = await db.query(
                `INSERT INTO lives (date, venue, tour_name, type, setlist_status, external_source_id, import_metadata)
                 VALUES ($1, $2, $3, $4, 'UNKNOWN_SETLIST', $5, $6)
                 RETURNING id`,
                [
                    live.date, live.venue, live.tour_name, live.type, live.external_source_id,
                    JSON.stringify({ source: SOURCE_NAME, source_url: entry.detailUrl, category: entry.category, imported_at: new Date().toISOString() }),
                ]
            );

            stats.created++;
            stats.created_lives.push({ id: inserted.rows[0].id, ...live });
            console.log(`[Schedule] 新規公演を追加: ${live.date} ${live.tour_name} @ ${live.venue || '(会場未定)'}`);
        } catch (err) {
            stats.errors++;
            console.error('[Schedule] エントリ処理エラー:', err);
            await logToDb('error', 'Schedule entry failed', { error: err.message, sourceId: entry.sourceId });
        }
    }

    await logToDb(stats.errors > 0 ? 'warn' : 'info', 'Schedule import finished', {
        fetched: stats.fetched,
        candidates: stats.candidates,
        created: stats.created,
        skipped: stats.skipped,
        errors: stats.errors,
        dryRun,
    });

    // 新規公演があった時だけ通知する（出演解禁を知るのがこの機能の目的）
    if (!dryRun && stats.created > 0) {
        const lines = stats.created_lives
            .slice(0, 5)
            .map((l) => `${l.date.replace(/-/g, '/')} ${l.tour_name}`);
        if (stats.created_lives.length > 5) lines.push(`ほか${stats.created_lives.length - 5}件`);

        await notifyAdmins({
            title: `新しい公演を${stats.created}件追加しました`,
            body: lines.join('\n'),
            url: '/admin',
            type: 'schedule_imported',
        });
    }

    return stats;
}

/**
 * 定期実行。出演発表は解禁タイミングが読めないため、低頻度で回す。
 */
function startScheduleImport(intervalMs = 12 * 60 * 60 * 1000) {
    const run = () => importSchedule().catch((err) => console.error('[Schedule] 取り込み失敗:', err.message));
    run();
    setInterval(run, intervalMs);
}

module.exports = {
    importSchedule,
    startScheduleImport,
    parseScheduleList,
    parseVenue,
    detectType,
    LIST_URL,
    SOURCE_NAME,
};
