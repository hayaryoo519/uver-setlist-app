const { Pool } = require('pg');
const path = require('path');

const NOTION_API_KEY = 'ntn_U3793630285abIcTEaNwzQBuLZDeP1ukKxySNzRI4odcdk';
const NOTION_VERSION = '2022-06-28';
const TARGET_PAGE_ID = '3050e21e-344d-81b5-a68c-e71f92075312'; // 3. データベース設計 (Database Schema)

// server/.envを読み込む
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function callNotionAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
    };
    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
}

// 富裕テキストオブジェクトを作成するヘルパー
function richText(content, bold = false, color = 'default') {
    return [
        {
            type: 'text',
            text: { content: content || '' },
            annotations: { bold, color },
        }
    ];
}

async function main() {
    try {
        console.log('1. PostgreSQL から実際のスキーマ情報を取得中...');
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`取得されたテーブル (${tables.length}件):`, tables.join(', '));

        const schemaData = [];
        for (const table of tables) {
            // カラム情報
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

            // 制約情報
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

            schemaData.push({
                tableName: table,
                columns: columnsRes.rows,
                constraints: constraintsRes.rows,
            });
        }

        console.log('2. Notionの既存の子ブロックを削除中...');
        let hasMore = true;
        let startCursor = undefined;
        const existingBlocks = [];
        while (hasMore) {
            let url = `/blocks/${TARGET_PAGE_ID}/children?page_size=100`;
            if (startCursor) url += `&start_cursor=${startCursor}`;
            const data = await callNotionAPI(url);
            existingBlocks.push(...data.results);
            hasMore = data.has_more;
            startCursor = data.next_cursor;
        }

        console.log(`削除対象ブロック数: ${existingBlocks.length}件`);
        for (const block of existingBlocks) {
            await callNotionAPI(`/blocks/${block.id}`, 'DELETE');
        }
        console.log('既存ブロックの削除完了！');

        console.log('3. 新しいブロックオブジェクトの組み立て中...');
        const blocksToCreate = [];

        // イントロダクション
        blocksToCreate.push({
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: richText('データベース設計 (Database Schema)', true),
            }
        });
        blocksToCreate.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: richText('実際の PostgreSQL データベース（ローカル/Staging/Production）の物理スキーマに完全同期された仕様書です。（自動更新日: ' + new Date().toLocaleDateString('ja-JP') + '）'),
            }
        });
        blocksToCreate.push({
            object: 'block',
            type: 'divider',
            divider: {}
        });

        // 各テーブルのドキュメント生成
        for (const sd of schemaData) {
            blocksToCreate.push({
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: richText(`📂 テーブル: ${sd.tableName}`, true),
                }
            });

            // カラムテーブルブロック
            const tableRows = [
                // ヘッダー行
                {
                    type: 'table_row',
                    table_row: {
                        cells: [
                            richText('カラム名', true),
                            richText('データ型', true),
                            richText('NULL許容', true),
                            richText('デフォルト値', true)
                        ]
                    }
                }
            ];

            sd.columns.forEach(col => {
                const typeStr = col.character_maximum_length 
                    ? `${col.data_type}(${col.character_maximum_length})` 
                    : col.data_type;
                tableRows.push({
                    type: 'table_row',
                    table_row: {
                        cells: [
                            richText(col.column_name, true, 'blue'),
                            richText(typeStr),
                            richText(col.is_nullable),
                            richText(col.column_default || '-')
                        ]
                    }
                });
            });

            blocksToCreate.push({
                object: 'block',
                type: 'table',
                table: {
                    table_width: 4,
                    has_column_header: true,
                    has_row_header: false,
                    children: tableRows
                }
            });

            // 制約テーブルブロック (ある場合のみ)
            if (sd.constraints.length > 0) {
                blocksToCreate.push({
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: richText('制約 (Constraints)', true),
                    }
                });

                const constraintRows = [
                    {
                        type: 'table_row',
                        table_row: {
                            cells: [
                                richText('制約名', true),
                                richText('タイプ', true),
                                richText('カラム', true),
                                richText('参照先', true)
                            ]
                        }
                    }
                ];

                sd.constraints.forEach(con => {
                    const refStr = con.foreign_table_name 
                        ? `${con.foreign_table_name}.${con.foreign_column_name}` 
                        : '-';
                    constraintRows.push({
                        type: 'table_row',
                        table_row: {
                            cells: [
                                richText(con.constraint_name),
                                richText(con.constraint_type),
                                richText(con.column_name),
                                richText(refStr)
                            ]
                        }
                    });
                });

                blocksToCreate.push({
                    object: 'block',
                    type: 'table',
                    table: {
                        table_width: 4,
                        has_column_header: true,
                        has_row_header: false,
                        children: constraintRows
                    }
                });
            }

            blocksToCreate.push({
                object: 'block',
                type: 'divider',
                divider: {}
            });
        }

        console.log(`4. Notionへの書き込み実行中 (総ブロック数: ${blocksToCreate.length}件)...`);
        
        // チャンクに分割してPATCHリクエストを送信 (Notion APIの制限対策)
        const chunkSize = 50;
        for (let i = 0; i < blocksToCreate.length; i += chunkSize) {
            const chunk = blocksToCreate.slice(i, i + chunkSize);
            console.log(`  - チャンク追加中: ${i + 1} 〜 ${Math.min(i + chunkSize, blocksToCreate.length)} 件`);
            await callNotionAPI(`/blocks/${TARGET_PAGE_ID}/children`, 'PATCH', {
                children: chunk
            });
        }

        console.log('✨ Notion データベース仕様書ページの完全同期に成功いたしました！');
    } catch (err) {
        console.error('❌ エラーが発生しました:', err);
    } finally {
        await pool.end();
    }
}

main();
