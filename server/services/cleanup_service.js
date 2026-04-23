const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * 30日以上前の OCR画像を削除する
 */
async function cleanupOldImages() {
    console.log('[Cleanup] Starting image cleanup...');

    try {
        // 30日より古いドラフトで、画像 URL が存在するものを取得
        const result = await db.query(
            `SELECT id, raw_image_url FROM raw_setlists 
             WHERE created_at < NOW() - INTERVAL '30 days' 
             AND raw_image_url IS NOT NULL`
        );

        console.log(`[Cleanup] Found ${result.rows.length} images to clean up.`);

        for (const row of result.rows) {
            const relativePath = row.raw_image_url; // 例: /uploads/123.jpg
            const absolutePath = path.join(__dirname, '..', relativePath);

            // ファイルが存在すれば削除
            if (fs.existsSync(absolutePath)) {
                try {
                    fs.unlinkSync(absolutePath);
                    console.log(`[Cleanup] Deleted file: ${absolutePath}`);
                } catch (unlinkErr) {
                    console.error(`[Cleanup] Failed to delete file: ${absolutePath}`, unlinkErr);
                }
            }

            // DB の画像 URL を NULL に更新 (レコード自体は残す)
            await db.query(
                'UPDATE raw_setlists SET raw_image_url = NULL WHERE id = $1',
                [row.id]
            );
        }

        console.log('[Cleanup] Finished image cleanup.');
    } catch (err) {
        console.error('[Cleanup] Error during image cleanup:', err);
    }
}

/**
 * 定期実行のセットアップ (例: 1日1回)
 */
function startCleanup(intervalMs = 24 * 60 * 60 * 1000) {
    cleanupOldImages(); // 起動時に一度実行
    setInterval(cleanupOldImages, intervalMs);
}

module.exports = { cleanupOldImages, startCleanup };
