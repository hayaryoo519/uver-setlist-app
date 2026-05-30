const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// server/.envを読み込む
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function main() {
    try {
        console.log('ローカルDBからテーブルとカラム情報を取得します...');
        
        // 全テーブルのリストを取得
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        
        const tables = tablesRes.rows.map(r => r.table_name);
        let markdown = '# 実際のデータベーススキーマ (Actual DB Schema)\n\n';

        for (const table of tables) {
            markdown += `## ${table}\n\n`;
            
            // カラム情報を取得
            const columnsRes = await pool.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            
            markdown += '| カラム名 | 型 | NULL許容 | デフォルト値 |\n';
            markdown += '| --- | --- | --- | --- |\n';
            
            columnsRes.rows.forEach(col => {
                const typeStr = col.character_maximum_length 
                    ? `${col.data_type}(${col.character_maximum_length})` 
                    : col.data_type;
                markdown += `| ${col.column_name} | ${typeStr} | ${col.is_nullable} | ${col.column_default || ''} |\n`;
            });
            markdown += '\n';

            // インデックスと制約（PK, FK等）の取得
            const constraintsRes = await pool.query(`
                SELECT
                    tc.constraint_name, 
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    LEFT JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema = 'public' AND tc.table_name = $1;
            `, [table]);

            if (constraintsRes.rows.length > 0) {
                markdown += '### 制約 (Constraints)\n\n';
                markdown += '| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |\n';
                markdown += '| --- | --- | --- | --- | --- |\n';
                constraintsRes.rows.forEach(con => {
                    markdown += `| ${con.constraint_name} | ${con.constraint_type} | ${con.column_name} | ${con.foreign_table_name || ''} | ${con.foreign_column_name || ''} |\n`;
                });
                markdown += '\n';
            }
        }

        const outPath = path.join(__dirname, 'db_schema_actual.md');
        fs.writeFileSync(outPath, markdown, 'utf-8');
        console.log(`取得完了！保存先: ${outPath}`);
    } catch (err) {
        console.error('エラーが発生しました:', err);
    } finally {
        await pool.end();
    }
}

main();
