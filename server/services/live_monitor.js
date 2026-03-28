const db = require('../db');
const collector = require('./collector');

/**
 * ライブ情報を監視し、SNS収集をトリガーする
 */
async function monitor() {
    console.log('[Monitor] Starting live monitoring...');

    // 現在の日本時間 (UTC+9) を考慮
    const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
    const currentHour = now.getHours();

    // 18:00 〜 翌 10:00 の間のみ収集実行 (ライブ中〜翌朝)
    const isActiveTime = currentHour >= 18 || currentHour < 10;
    if (!isActiveTime) {
        console.log('[Monitor] Outside active time window. Skipping.');
        return;
    }

    try {
        // 今日と前日のライブを取得
        const targetDate = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const livesResult = await db.query(
            'SELECT * FROM lives WHERE date IN ($1, $2)',
            [targetDate.toISOString().split('T')[0], yesterday.toISOString().split('T')[0]]
        );

        if (livesResult.rows.length === 0) {
            console.log('[Monitor] No active lives found for today/yesterday.');
            return;
        }

        for (const live of livesResult.rows) {
            console.log(`[Monitor] Processing live: ${live.tour_name} @ ${live.venue}`);
            
            // 検索クエリ生成
            const queries = [
                `UVERworld ${live.venue} セトリ`,
                `UVERworld セトリ`,
                `#UVERworld`
            ];

            for (const q of queries) {
                const count = await collector.collect(q, live.id);
                if (count > 0) {
                    console.log(`[Monitor] Found ${count} potential setlists for "${q}"`);
                }
            }
        }
    } catch (err) {
        console.error('[Monitor] Error during live monitoring:', err);
    }
}

// 定期実行のセットアップ (例: 1時間おき)
function startMonitoring(intervalMs = 60 * 60 * 1000) {
    monitor(); // 初回実行
    setInterval(monitor, intervalMs);
}

module.exports = { monitor, startMonitoring };
