const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function analyzeSecurityLogs() {
    const client = await pool.connect();
    try {
        console.log('=== セキュリティログ分析 ===\n');

        // 過去7日間の統計
        const stats = await client.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT ip_address) as unique_ips
            FROM security_logs
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY event_type
            ORDER BY count DESC
        `);

        console.log('📊 過去7日間の統計:');
        if (stats.rows.length === 0) {
            console.log('  ログがありません\n');
        } else {
            stats.rows.forEach(row => {
                console.log(`  ${row.event_type}: ${row.count}件 (${row.unique_ips} 個のIP)`);
            });
            console.log('');
        }

        // 今日のログイン失敗数
        const todayFailures = await client.query(`
            SELECT COUNT(*) as count
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND DATE(timestamp) = CURRENT_DATE
        `);

        console.log(`📅 今日のログイン失敗: ${todayFailures.rows[0].count}件\n`);

        // 疑わしいIPアドレス（過去24時間で5回以上失敗）
        const suspicious = await client.query(`
            SELECT 
                ip_address,
                COUNT(*) as failed_attempts,
                array_agg(DISTINCT user_email) as targeted_emails,
                MIN(timestamp) as first_attempt,
                MAX(timestamp) as last_attempt
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY ip_address
            HAVING COUNT(*) >= 5
            ORDER BY failed_attempts DESC
        `);

        if (suspicious.rows.length > 0) {
            console.log('⚠️  疑わしいIPアドレス（過去24時間で5回以上失敗）:');
            suspicious.rows.forEach(row => {
                console.log(`  IP: ${row.ip_address}`);
                console.log(`    失敗回数: ${row.failed_attempts}回`);
                console.log(`    対象: ${row.targeted_emails.join(', ')}`);
                console.log(`    期間: ${row.first_attempt} 〜 ${row.last_attempt}`);
                console.log('');
            });
        } else {
            console.log('✅ 疑わしいIPアドレスはありません\n');
        }

        // 最も攻撃されているメールアドレス
        const targetedEmails = await client.query(`
            SELECT 
                user_email,
                COUNT(*) as attack_count,
                COUNT(DISTINCT ip_address) as attacker_ips
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '7 days'
                AND user_email IS NOT NULL
            GROUP BY user_email
            ORDER BY attack_count DESC
            LIMIT 5
        `);

        if (targetedEmails.rows.length > 0) {
            console.log('🎯 最も攻撃されているメールアドレス（過去7日間）:');
            targetedEmails.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ${row.user_email}: ${row.attack_count}回 (${row.attacker_ips} 個のIPから)`);
            });
            console.log('');
        }

        // 最近のエラー
        const recentErrors = await client.query(`
            SELECT 
                timestamp,
                message,
                details
            FROM security_logs
            WHERE event_type = 'error'
                AND timestamp > NOW() - INTERVAL '24 hours'
            ORDER BY timestamp DESC
            LIMIT 5
        `);

        if (recentErrors.rows.length > 0) {
            console.log('❌ 最近のエラー（過去24時間）:');
            recentErrors.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. [${row.timestamp}] ${row.message}`);
            });
            console.log('');
        } else {
            console.log('✅ 最近のエラーはありません\n');
        }

        // 時間帯別のログイン失敗（過去7日間）
        const hourlyFailures = await client.query(`
            SELECT 
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as failures
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '7 days'
            GROUP BY hour
            ORDER BY failures DESC
            LIMIT 5
        `);

        if (hourlyFailures.rows.length > 0) {
            console.log('🕐 ログイン失敗が多い時間帯（過去7日間）:');
            hourlyFailures.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ${row.hour}時台: ${row.failures}回`);
            });
            console.log('');
        }

        // 総ログ数
        const totalLogs = await client.query(`
            SELECT COUNT(*) as count FROM security_logs
        `);

        console.log(`📝 総ログ数: ${totalLogs.rows[0].count}件`);

        // データベースサイズの推定
        const dbSize = await client.query(`
            SELECT pg_size_pretty(pg_total_relation_size('security_logs')) as size
        `);

        console.log(`💾 テーブルサイズ: ${dbSize.rows[0].size}\n`);

        console.log('=== 分析完了 ===');

    } catch (err) {
        console.error('❌ エラーが発生しました:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

analyzeSecurityLogs();
