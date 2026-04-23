/**
 * マイグレーション自動実行スクリプト
 *
 * 機能:
 * - schema_migrations テーブルで適用済みを管理
 * - 番号ベースのソートで順序保証
 * - 1ファイル = 1トランザクションで安全性確保
 * - pg_advisory_lock で同時実行防止
 * - dry-run モード対応
 *
 * 使い方:
 *   npm run migrate          -- 通常実行
 *   npm run migrate:dry      -- dry-run（確認のみ）
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// dry-run モードの判定
const isDryRun = process.argv.includes('--dry-run');

// アドバイザリーロック用の固定キー
const MIGRATION_LOCK_KEY = 123456;

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

/**
 * schema_migrations テーブルを作成する（存在しない場合のみ）
 */
async function ensureMigrationTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT NOW()
        );
    `);
}

/**
 * 適用済みマイグレーション一覧を取得する
 */
async function getAppliedMigrations(client) {
    const result = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    return new Set(result.rows.map(row => row.filename));
}

/**
 * マイグレーションファイル一覧を番号ベースでソートして返す
 */
function getMigrationFiles() {
    const migrationDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql'));

    // 番号ベースのソート（文字列ソートだと 1, 10, 2 になるため）
    files.sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
    });

    return files;
}

/**
 * メイン処理: マイグレーションを実行する
 */
async function runMigrations() {
    const client = await pool.connect();

    try {
        // ==============================
        // 同時実行防止（アドバイザリーロック）
        // ==============================
        const lockResult = await client.query(
            'SELECT pg_try_advisory_lock($1) AS locked',
            [MIGRATION_LOCK_KEY]
        );

        if (!lockResult.rows[0].locked) {
            console.error('[ERROR] 別のマイグレーションプロセスが実行中です。終了します。');
            return;
        }

        console.log('========================================');
        console.log(isDryRun ? '  マイグレーション (dry-run モード)' : '  マイグレーション実行');
        console.log('========================================');

        // ==============================
        // schema_migrations テーブル確認
        // ==============================
        await ensureMigrationTable(client);

        // ==============================
        // ファイル一覧 & 適用済み取得
        // ==============================
        const files = getMigrationFiles();
        const applied = await getAppliedMigrations(client);

        // 未適用のファイルを抽出
        const pending = files.filter(f => !applied.has(f));

        if (pending.length === 0) {
            console.log('\n[INFO] すべてのマイグレーションは適用済みです。');
            // スキップされたファイルも表示
            for (const file of files) {
                console.log(`  [SKIP] ${file}`);
            }
            console.log('\n完了。変更なし。');
            return;
        }

        console.log(`\n合計: ${files.length} ファイル / 適用済み: ${applied.size} / 未適用: ${pending.length}\n`);

        // ==============================
        // 適用済みはスキップログを出力
        // ==============================
        for (const file of files) {
            if (applied.has(file)) {
                console.log(`  [SKIP] ${file}`);
            }
        }

        // ==============================
        // 未適用を1ファイルずつトランザクション実行
        // ==============================
        const migrationDir = path.join(__dirname, '../migrations');
        let successCount = 0;

        for (const file of pending) {
            const filePath = path.join(migrationDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            if (isDryRun) {
                console.log(`  [DRY-RUN] ${file} （実行されません）`);
                successCount++;
                continue;
            }

            console.log(`  [RUN]  ${file} ...`);

            try {
                // トランザクション開始
                await client.query('BEGIN');

                // SQL実行
                await client.query(sql);

                // 適用済みとして記録
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );

                // コミット
                await client.query('COMMIT');
                console.log(`  [DONE] ${file}`);
                successCount++;
            } catch (err) {
                // ロールバック
                await client.query('ROLLBACK');
                console.error(`\n  [FAIL] ${file}`);
                console.error(`  エラー: ${err.message}`);
                console.error(`\n[ERROR] マイグレーションが中断されました。`);
                console.error(`  ${successCount} 件適用済み / 残り ${pending.length - successCount} 件未適用`);
                // ここで停止（後続のファイルは実行しない）
                process.exitCode = 1;
                return;
            }
        }

        console.log(`\n========================================`);
        if (isDryRun) {
            console.log(`  dry-run 完了: ${successCount} 件が適用対象`);
        } else {
            console.log(`  完了: ${successCount} 件のマイグレーションを適用しました`);
        }
        console.log(`========================================\n`);

    } finally {
        // アドバイザリーロック解放
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
        client.release();
        await pool.end();
    }
}

// 実行
runMigrations().catch(err => {
    console.error('[FATAL] マイグレーション実行エラー:', err);
    process.exitCode = 1;
});
