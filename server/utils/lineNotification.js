// LINE Messaging API を使ったドラフト追加通知ユーティリティ

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * ドラフトの信頼度を %表示 に変換する
 */
function formatConfidence(confidence) {
    if (confidence == null) return '不明';
    return `${Math.round(confidence * 100)}%`;
}

/**
 * ソース種別を日本語に変換する
 */
function formatSource(source) {
    const map = {
        'x': 'SNS (X) 自動収集',
        'ocr': '管理者 (OCR画像)',
        'manual': '管理者 (手動登録)',
        'scrape': 'スクレイピング',
    };
    return map[source] || source || '不明';
}

/**
 * 日付文字列を yyyy/MM/dd に整形する
 */
function formatDate(dateStr) {
    if (!dateStr) return '不明';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * ドラフト追加時に管理者のLINEに通知を送信する
 * @param {object} draft - raw_setlists テーブルのレコード
 */
async function notifyDraftAdded(draft) {
    // 環境変数が未設定の場合はスキップ (エラーは出さない)
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_USER_ID) {
        console.warn('[LINE] 通知設定なし: LINE_CHANNEL_ACCESS_TOKEN または LINE_USER_ID が未設定です。');
        return;
    }

    const songCount = Array.isArray(draft.parsed_json) ? draft.parsed_json.length : '?';
    const liveDate = formatDate(draft.live_date);
    const venue = draft.live_venue || '未紐付け';
    const confidence = formatConfidence(draft.confidence);
    const source = formatSource(draft.source);

    // セットリスト部分の生成
    let setlistLines = [];
    if (Array.isArray(draft.parsed_json) && draft.parsed_json.length > 0) {
        setlistLines = draft.parsed_json.map(s => ` ${String(s.position).padStart(2, ' ')}. ${s.title}`);
    }

    const messageText = [
        '🎸 セトリドラフトが追加されました！',
        '',
        `📅 ライブ日: ${liveDate}`,
        `🏟️  会場: ${venue}`,
        `📋 ソース: ${source}`,
        `🎯 信頼度: ${confidence}`,
        '',
        `🎵 セットリスト (${songCount}曲)`,
        ...(setlistLines.length > 0 ? setlistLines : ['(曲データなし)']),
        '',
        '🔗 https://uver-setlist-archive.org/admin/drafts',
    ].join('\n');

    try {
        const https = require('https');
        const url = new URL(LINE_API_URL);
        
        const data = JSON.stringify({
            to: LINE_USER_ID,
            messages: [
                { type: 'text', text: messageText }
            ]
        });

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('[LINE] ドラフト追加通知を送信しました。');
                } else {
                    console.error(`[LINE] 通知失敗 (status: ${res.statusCode}):`, body);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[LINE] 通知送信中にエラーが発生しました:', err.message);
        });

        req.write(data);
        req.end();

    } catch (err) {
        console.error('[LINE] 通知処理中に致命的なエラーが発生しました:', err.message);
    }
}

module.exports = { notifyDraftAdded };
