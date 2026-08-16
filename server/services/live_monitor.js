const db = require('../db');
const collector = require('./collector');
const { XCollectorAbortError } = require('./xClient');
const { notifyAdmins } = require('../utils/pushNotification');
const { notifyDraftsCollected } = require('../utils/lineNotification');

// 収集を実行する時刻（JST）。仕様 §11「ライブがある日にだけ、常時監視はしない」
//
// 15時〜24時の毎時 + 翌7時。終演から最初の収集までを最大1時間に抑えるため。
// 以前は 18/20/22/0/7 だったが、フェスの昼〜夕方枠だと終演から最大3時間空いていた。
// collector 側が「同一公演×同一クエリは1時間に1回」で制限しているため、
// 実行時刻を増やしても X の検索回数は増えない（空振りの起床が増えるだけ）。
const ACTIVE_HOURS_JST = [15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 7];

/**
 * JST の現在時刻を UTC としてエンコードした Date を返す
 * 日付・時刻は getUTC*() / toISOString() 経由で参照すること
 * （getHours() を使うとサーバーのタイムゾーン分だけ二重にずれる）
 */
function nowJst() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toDateString(date) {
    return date.toISOString().split('T')[0];
}

/**
 * ライブ情報から X の検索クエリを生成する（仕様 §4）
 */
function buildQueries(live) {
    const queries = [];
    const dateStr = live.date instanceof Date
        ? toDateString(live.date)
        : String(live.date).split('T')[0];
    const slashDate = dateStr.replace(/-/g, '/');

    if (live.venue) {
        queries.push(`UVERworld セトリ ${live.venue}`);
        queries.push(`UVERworld セットリスト ${live.venue}`);
    }
    queries.push(`UVERworld セトリ ${slashDate}`);
    if (live.tour_name) {
        queries.push(`UVERworld ${live.tour_name} セトリ`);
    }
    if (live.prefecture) {
        queries.push(`UVERworld ${live.prefecture} セトリ`);
    }

    // 仕様 §4: 1ライブあたり 3〜5 クエリ
    return [...new Set(queries)].slice(0, 5);
}

/**
 * 収集対象のライブを取得する（仕様 §3）
 * 当日・前日で、セットリストがまだ登録されていない公演のみ
 */
async function findTargetLives() {
    const now = nowJst();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await db.query(
        `SELECT l.*
         FROM lives l
         WHERE l.date IN ($1, $2)
           AND (l.setlist_status IS DISTINCT FROM 'NORMAL')
           AND NOT EXISTS (SELECT 1 FROM setlists s WHERE s.live_id = l.id)
         ORDER BY l.date DESC, l.id`,
        [toDateString(now), toDateString(yesterday)]
    );
    return result.rows;
}

/**
 * 1公演の収集が終わった時点で、作成されたドラフトをまとめて通知する。
 *
 * collect() は作成件数しか返さないため、この回に作られたドラフトを
 * 開始時刻を基準に引き直して内容を添える。
 * 通知は補助機能なので、失敗しても収集処理は止めない。
 */
async function notifyCollected(live, runStartedAt, created) {
    let drafts = [];
    try {
        const result = await db.query(
            `SELECT id, confidence, parsed_json
             FROM raw_setlists
             WHERE live_id = $1 AND source = 'x' AND created_at >= $2
             ORDER BY confidence DESC NULLS LAST, id`,
            [live.id, runStartedAt]
        );
        drafts = result.rows;
    } catch (err) {
        console.warn('[Monitor] 通知用のドラフト取得に失敗しました:', err.message);
    }

    await Promise.all([
        notifyAdmins({
            title: `セトリ候補が${created}件見つかりました`,
            body: `${live.tour_name || 'ライブ'} @ ${live.venue || '会場未定'}\n管理画面で内容を確認してください。`,
            url: '/admin',
            type: 'setlist_drafts_collected',
        }),
        notifyDraftsCollected(live, drafts.length > 0 ? drafts : null),
    ]).catch((err) => console.error('[Monitor] 通知エラー:', err.message));
}

/**
 * ライブ情報を監視し、SNS収集をトリガーする
 */
async function monitor() {
    console.log('[Monitor] Starting live monitoring...');

    const currentHour = nowJst().getUTCHours();
    if (!ACTIVE_HOURS_JST.includes(currentHour)) {
        console.log(`[Monitor] ${currentHour}時は収集対象時刻ではありません。スキップします。`);
        return;
    }

    try {
        const lives = await findTargetLives();

        if (lives.length === 0) {
            console.log('[Monitor] セトリ未登録の当日/前日ライブはありません。');
            return;
        }

        for (const live of lives) {
            console.log(`[Monitor] Processing live: ${live.tour_name} @ ${live.venue}`);

            // 通知はクエリごとではなく公演単位でまとめる（1公演で最大5クエリ投げるため）
            const runStartedAt = new Date();
            let created = 0;
            for (const q of buildQueries(live)) {
                const count = await collector.collect(q, live.id);
                created += count;
                if (count > 0) {
                    console.log(`[Monitor] Found ${count} potential setlists for "${q}"`);
                }
            }

            if (created > 0) {
                await notifyCollected(live, runStartedAt, created);
            }
        }
    } catch (err) {
        // 仕様 §12: レート制限・認証エラーを検知したらその回の収集を打ち切り、リトライしない
        if (err instanceof XCollectorAbortError) {
            console.warn('[Monitor] X 収集を中断しました:', err.message);
            // Cookie 失効はこの経路で出る。放置すると収集が止まり続けるため必ず通知する
            await notifyAdmins({
                title: 'X収集を中断しました',
                body: `${err.message}\nCookie(auth_token / ct0)の失効が疑われます。`,
                url: '/admin',
                type: 'x_collection_aborted',
            });
            return;
        }
        console.error('[Monitor] Error during live monitoring:', err);
    }
}

// 定期実行のセットアップ (1時間おきに起床し、対象時刻のみ収集する)
function startMonitoring(intervalMs = 60 * 60 * 1000) {
    monitor(); // 初回実行
    setInterval(monitor, intervalMs);
}

module.exports = { monitor, startMonitoring, buildQueries, findTargetLives };
