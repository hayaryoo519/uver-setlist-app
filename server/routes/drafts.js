const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { notifyDraftAdded } = require('../utils/lineNotification');

// multerの設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB制限
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('画像ファイルのみアップロード可能です'), false);
        }
    }
});

// ===== 前処理ユーティリティ =====

/**
 * テキストを正規化する（大文字化、空白・記号除去）
 */
function normalizeText(text) {
    if (!text) return '';
    return text.toUpperCase()
        .replace(/[\s\W_]/g, '') // 半角空白・記号・アンダースコア除去
        .replace(/[！"＃＄％＆'（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～]/g, '') // 全角記号もカバー
        .replace(/[ー−―－]/g, ''); // 各種ハイフン・長音も除去
}

/**
 * 生テキストからセトリのノイズを除去する
 * - 行頭のトラック番号（1. / 01 / M1. など）を削除
 * - 空行を削除
 * - 前後の空白をトリム
 */
function cleanRawText(text) {
    if (!text) return [];
    return text
        .split('\n')
        .map(line => line.replace(/^([0-9]+[\.\s]*|M[0-9]+[\.\s]*|EN[0-9]*[\.\s]*|SETLIST[0-9]*[\.\s]*)/i, '').trim())
        .filter(line => line !== '')
        .filter((line, index, self) => self.indexOf(line) === index); // 重複削除
}

/**
 * クリーンな行リストからparsed_json形式に変換する
 */
function buildParsedJson(lines) {
    return lines.map((title, index) => ({
        position: index + 1,
        title: title
    }));
}

/**
 * テキストから一意な正規化ハッシュを生成する
 */
function generateHash(text) {
    const normalized = normalizeText(text);
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * 抽出結果の信頼度（Confidence）を算出する
 */
async function calculateConfidence(lines, rawText, source = 'ocr') {
    let score = 0.2; // 基本スコア

    // 曲数による判定
    if (lines.length >= 10) score += 0.3;
    if (lines.length >= 15) score += 0.1;
    if (lines.length >= 20) score += 0.1;
    if (lines.length < 5) score -= 0.4;

    // ソングテーブルとの一致率
    try {
        if (lines.length > 0) {
            // 正規化したタイトルで一致確認
            const songCount = await db.query(
                'SELECT COUNT(*) FROM songs WHERE UPPER(REPLACE(title, \' \', \'\')) = ANY($1)', 
                [lines.map(l => normalizeText(l))]
            );
            const matchRate = parseInt(songCount.rows[0].count) / lines.length;
            
            if (matchRate > 0.4) score += 0.2;
            if (matchRate > 0.7) score += 0.2;
        }
    } catch (e) {
        console.warn('Confidence計算中のDBチェック失敗:', e);
    }

    // SNS特有の信頼度向上（同一ハッシュの投稿が複数あれば信頼度アップ）
    if (source === 'x') {
        const hash = generateHash(lines.join('\n'));
        const sameContentResult = await db.query(
            'SELECT COUNT(*) FROM raw_setlists WHERE raw_text_hash = $1 AND source = \'x\'',
            [hash]
        );
        const sameCount = parseInt(sameContentResult.rows[0].count);
        if (sameCount >= 1) score += 0.2; // 既に同じものがあれば信頼度大幅アップ
    }

    // ノイズ判定（記号等が多い場合は減点）
    const noiseSymbols = /[\!\?\#\$\%\^]/g;
    const matches = rawText.match(noiseSymbols);
    if (matches && matches.length > 15) score -= 0.2;

    return Math.max(0, Math.min(1.0, score)); // 0.0〜1.0に収める
}

// ===== APIルート =====

// POST /api/drafts/upload — 画像アップロード & OCR
router.post('/upload', authorize, adminCheck, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '画像ファイルが必要です' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        const imagePath = req.file.path;

        // 画像をbase64に変換 (OpenAI API送信用)
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

        // OpenAI API呼び出し (Vision)
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const visionPrompt = `この画像はライブのセットリストです。

必ず上から順番に曲名を抽出してください。
複数列の場合も、左上から右下へ順番に並べ替えてください。

以下は除外してください：
・エンドロール曲
・BGM
・スタッフ情報
・注意書き
・時刻
・番号（M1, 01など）

出力ルール：
・曲名のみを1行ずつ出力
・番号は不要
・説明文は不要`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: visionPrompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${req.file.mimetype};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1500,
        });

        const rawText = response.choices[0].message.content;

        // 前処理
        const cleanedLines = cleanRawText(rawText);
        if (cleanedLines.length === 0) {
            return res.status(422).json({ message: '曲名を抽出できませんでした。画像が鮮明か確認してください。' });
        }

        const parsedJson = buildParsedJson(cleanedLines);
        const hash = generateHash(cleanedLines.join('\n'));
        const confidence = await calculateConfidence(cleanedLines, rawText);

        // 重複チェック
        const dupCheck = await db.query(
            'SELECT * FROM raw_setlists WHERE raw_text_hash = $1',
            [hash]
        );

        if (dupCheck.rows.length > 0) {
            return res.status(409).json({
                message: 'このセットリストは既に登録されています。',
                draft: dupCheck.rows[0]
            });
        }

        // ドラフトとして保存
        // (注: 信頼度が低くても保存し、UI側でユーザーに修正を促す)
        const result = await db.query(
            `INSERT INTO raw_setlists (source, raw_text, parsed_json, status, raw_image_url, raw_text_hash, confidence)
             VALUES ('ocr', $1, $2, 'pending', $3, $4, $5)
             RETURNING *`,
            [rawText, JSON.stringify(parsedJson), imageUrl, hash, confidence]
        );

        // LINE通知（非同期・失敗してもレスポンスには影響しない）
        notifyDraftAdded(result.rows[0]).catch(err => console.error('[LINE] OCRドラフト通知エラー:', err.message));

        res.status(201).json({
            message: '画像からセットリストを抽出しました',
            draft: result.rows[0]
        });
    } catch (err) {
        console.error('画像OCRエラー:', err);
        res.status(500).json({ message: 'OCR処理に失敗しました', error: err.message });
    }
});

// POST /api/drafts — ドラフト新規作成
router.post('/', authorize, adminCheck, async (req, res) => {
    try {
        const { liveId, rawText, source } = req.body;

        if (!rawText || rawText.trim() === '') {
            return res.status(400).json({ message: 'rawText は必須です' });
        }

        const validSources = ['manual', 'x', 'scrape', 'ocr'];
        const finalSource = validSources.includes(source) ? source : 'manual';

        // 前処理でparsed_jsonを自動生成
        const cleanedLines = cleanRawText(rawText);
        const parsedJson = buildParsedJson(cleanedLines);

        const result = await db.query(
            `INSERT INTO raw_setlists (live_id, source, raw_text, parsed_json, status, duplicate_count, official_setlist)
             VALUES ($1, $2, $3, $4, 'pending', 1, false)
             RETURNING *`,
            [liveId || null, finalSource, rawText, JSON.stringify(parsedJson)]
        );

        // LINE通知（非同期・失敗してもレスポンスには影響しない）
        notifyDraftAdded(result.rows[0]).catch(err => console.error('[LINE] 手動ドラフト通知エラー:', err.message));

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('ドラフト作成エラー:', err);
        res.status(500).json({ message: 'サーバーエラー', error: err.message });
    }
});

// GET /api/drafts — ドラフト一覧取得
router.get('/', authorize, adminCheck, async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT rs.*, l.date as live_date, l.venue as live_venue, l.tour_name as live_tour_name
            FROM raw_setlists rs
            LEFT JOIN lives l ON rs.live_id = l.id
        `;
        const params = [];

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query += ' WHERE rs.status = $1';
            params.push(status);
        }

        query += ' ORDER BY rs.confidence DESC, rs.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('ドラフト一覧取得エラー:', err);
        res.status(500).json({ message: 'サーバーエラー', error: err.message });
    }
});

// GET /api/drafts/:id — ドラフト詳細取得
router.get('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT rs.*, l.date as live_date, l.venue as live_venue, l.tour_name as live_tour_name
             FROM raw_setlists rs
             LEFT JOIN lives l ON rs.live_id = l.id
             WHERE rs.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ドラフトが見つかりません' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('ドラフト詳細取得エラー:', err);
        res.status(500).json({ message: 'サーバーエラー', error: err.message });
    }
});

// PATCH /api/drafts/:id — ステータス・テキスト・ライブ紐付け更新
router.patch('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, liveId, rawText, officialSetlist } = req.body;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (status) {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: '無効なステータスです' });
            }
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (liveId !== undefined) {
            updates.push(`live_id = $${paramIndex++}`);
            params.push(liveId || null);
        }

        if (rawText !== undefined) {
            updates.push(`raw_text = $${paramIndex++}`);
            params.push(rawText);
            
            // テキストが更新された場合はハッシュと信頼度も再計算
            const cleanedLines = cleanRawText(rawText);
            const hash = generateHash(cleanedLines.join('\n'));
            const confidence = await calculateConfidence(cleanedLines, rawText);
            
            updates.push(`raw_text_hash = $${paramIndex++}`);
            params.push(hash);
            updates.push(`confidence = $${paramIndex++}`);
            params.push(confidence);
            updates.push(`parsed_json = $${paramIndex++}`);
            params.push(JSON.stringify(buildParsedJson(cleanedLines)));
        }

        if (officialSetlist !== undefined) {
            updates.push(`official_setlist = $${paramIndex++}`);
            params.push(officialSetlist);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: '更新項目がありません' });
        }

        params.push(id);
        const query = `UPDATE raw_setlists SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ドラフトが見つかりません' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('ドラフト更新エラー:', err);
        res.status(500).json({ message: 'サーバーエラー', error: err.message });
    }
});

// DELETE /api/drafts/:id — ドラフト削除
router.delete('/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM raw_setlists WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ドラフトが見つかりません' });
        }

        res.json({ message: 'ドラフトを削除しました', id: result.rows[0].id });
    } catch (err) {
        console.error('ドラフト削除エラー:', err);
        res.status(500).json({ message: 'サーバーエラー', error: err.message });
    }
});

// POST /api/drafts/:id/parse — GPT整形処理
router.post('/:id/parse', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;

        // ドラフトを取得
        const draftResult = await db.query('SELECT * FROM raw_setlists WHERE id = $1', [id]);
        if (draftResult.rows.length === 0) {
            return res.status(404).json({ message: 'ドラフトが見つかりません' });
        }

        const draft = draftResult.rows[0];

        // 前処理
        const cleanedLines = cleanRawText(draft.raw_text);
        const cleanedText = cleanedLines.join('\n');

        // OpenAI API呼び出し
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `あなたはUVERworldのセットリスト整形アシスタントです。
入力されたテキストからセットリストの曲名を抽出し、JSON配列で返してください。

ルール:
- 出力は必ず JSON 配列のみ（説明文不要）
- 各要素は { "position": number, "title": string } 形式
- UVERworldの正式な曲名に修正してください（例: "コアプライド" → "CORE PRIDE"）
- SE、MC、挨拶などは除外してください
- アンコール（EN, encore）の曲も含めてください
- 曲名はUVERworldの楽曲データベースに基づいて正確に表記してください`
                },
                {
                    role: 'user',
                    content: cleanedText
                }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        let parsedJson;
        try {
            const content = completion.choices[0].message.content;
            const parsed = JSON.parse(content);
            // GPTが { "setlist": [...] } 形式で返す場合にも対応
            parsedJson = Array.isArray(parsed) ? parsed : (parsed.setlist || parsed.songs || parsed.data || []);
        } catch (parseErr) {
            console.error('GPTレスポンスのパースエラー:', parseErr);
            return res.status(500).json({ message: 'GPTの応答をパースできませんでした' });
        }

        // DBを更新
        const updateResult = await db.query(
            `UPDATE raw_setlists SET parsed_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [JSON.stringify(parsedJson), id]
        );

        res.json({
            message: 'GPT整形が完了しました',
            draft: updateResult.rows[0],
            usage: completion.usage
        });
    } catch (err) {
        console.error('GPT整形エラー:', err);

        if (err.message && err.message.includes('API key')) {
            return res.status(500).json({ message: 'OpenAI APIキーが設定されていないか無効です' });
        }

        res.status(500).json({ message: 'GPT整形に失敗しました', error: err.message });
    }
});

module.exports = router;
