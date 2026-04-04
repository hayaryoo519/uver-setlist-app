// LINE通知のテストスクリプト
// 実行: node server/test_line_notify.js

require('dotenv').config({ path: './server/.env' });
const { notifyDraftAdded } = require('./server/utils/lineNotification');

// テスト用ダミードラフトデータ
const testDraft = {
    id: 9999,
    source: 'ocr',
    confidence: 0.88,
    live_date: '2026-04-01',
    live_venue: 'Zepp Osaka Bayside',
    parsed_json: Array.from({ length: 16 }, (_, i) => ({ position: i + 1, title: `テスト曲 ${i + 1}` })),
};

console.log('[TEST] LINE通知テストを開始します...');
notifyDraftAdded(testDraft).then(() => {
    console.log('[TEST] 完了！LINEを確認してください。');
}).catch(err => {
    console.error('[TEST] エラー:', err);
});
