import fs from 'fs';
import path from 'path';

const NOTION_API_KEY = 'ntn_U3793630285abIcTEaNwzQBuLZDeP1ukKxySNzRI4odcdk';
const NOTION_VERSION = '2022-06-28';

// Notion API を呼び出す共通関数
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

// ブロックのテキスト表現を抽出する
function extractText(richTextArray) {
    if (!richTextArray || richTextArray.length === 0) return '';
    return richTextArray.map(t => t.plain_text).join('');
}

// 子ブロックを再帰的に取得して Markdown に変換する
async function blockToMarkdown(blockId, depth = 0) {
    let markdown = '';
    let hasMore = true;
    let startCursor = undefined;
    const blocks = [];

    while (hasMore) {
        let url = `/blocks/${blockId}/children?page_size=100`;
        if (startCursor) {
            url += `&start_cursor=${startCursor}`;
        }
        const data = await callNotionAPI(url);
        blocks.push(...data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    for (const block of blocks) {
        const indent = '  '.repeat(depth);
        switch (block.type) {
            case 'heading_1':
                markdown += `${indent}# ${extractText(block.heading_1.rich_text)}\n\n`;
                break;
            case 'heading_2':
                markdown += `${indent}## ${extractText(block.heading_2.rich_text)}\n\n`;
                break;
            case 'heading_3':
                markdown += `${indent}### ${extractText(block.heading_3.rich_text)}\n\n`;
                break;
            case 'paragraph':
                markdown += `${indent}${extractText(block.paragraph.rich_text)}\n\n`;
                break;
            case 'bulleted_list_item':
                markdown += `${indent}* ${extractText(block.bulleted_list_item.rich_text)}\n`;
                if (block.has_children) {
                    markdown += await blockToMarkdown(block.id, depth + 1);
                }
                break;
            case 'numbered_list_item':
                markdown += `${indent}1. ${extractText(block.numbered_list_item.rich_text)}\n`;
                if (block.has_children) {
                    markdown += await blockToMarkdown(block.id, depth + 1);
                }
                break;
            case 'to_do':
                const checked = block.to_do.checked ? '[x]' : '[ ]';
                markdown += `${indent}- ${checked} ${extractText(block.to_do.rich_text)}\n`;
                break;
            case 'toggle':
                markdown += `<details>\n<summary>${extractText(block.toggle.rich_text)}</summary>\n\n`;
                if (block.has_children) {
                    markdown += await blockToMarkdown(block.id, depth + 1);
                }
                markdown += `</details>\n\n`;
                break;
            case 'quote':
                markdown += `${indent}> ${extractText(block.quote.rich_text)}\n\n`;
                break;
            case 'code':
                markdown += `${indent}\`\`\`${block.code.language}\n${extractText(block.code.rich_text)}\n\`\`\`\n\n`;
                break;
            case 'table':
                // テーブル行を取得して Markdown 形式のテーブルを生成
                const rowsData = await callNotionAPI(`/blocks/${block.id}/children?page_size=100`);
                const rows = rowsData.results;
                if (rows.length > 0) {
                    let tableMarkdown = '';
                    const hasHeader = block.table.has_column_header;
                    
                    rows.forEach((rowBlock, rowIndex) => {
                        if (rowBlock.type !== 'table_row') return;
                        const cells = rowBlock.table_row.cells.map(cell => extractText(cell));
                        tableMarkdown += `| ${cells.join(' | ')} |\n`;
                        
                        if (rowIndex === 0 && hasHeader) {
                            const separator = cells.map(() => '---').join(' | ');
                            tableMarkdown += `| ${separator} |\n`;
                        }
                    });
                    markdown += tableMarkdown + '\n';
                }
                break;
            case 'child_page':
                markdown += `\n--- \n\n### [Page] ${block.child_page.title} (ID: ${block.id})\n\n`;
                // 子ページの内容もネストして取得
                const childContent = await blockToMarkdown(block.id, depth + 1);
                markdown += childContent;
                break;
            case 'divider':
                markdown += '---\n\n';
                break;
            default:
                if (block.has_children) {
                    markdown += await blockToMarkdown(block.id, depth + 1);
                }
                break;
        }
    }
    return markdown;
}

async function main() {
    const parentPageId = '3050e21e-344d-812d-a7a5-f9f57bd46747'; // 仕様書 (Specifications)
    console.log(`Notionから親ページ ${parentPageId} の仕様書データを抽出開始します...`);
    try {
        const md = await blockToMarkdown(parentPageId);
        const outPath = path.join(process.cwd(), '.agent/scratch/notion_specifications.md');
        
        // ディレクトリ作成
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        
        fs.writeFileSync(outPath, md, 'utf-8');
        console.log(`抽出完了！保存先: ${outPath}`);
    } catch (err) {
        console.error('エラーが発生しました:', err);
    }
}

main();
