#!/usr/bin/env node

/**
 * Agent Activity Logger (修正安全版)
 * 
 * 役割: エージェントの会話履歴を安全に解析・マスクし、Obsidianやプロジェクト内にMarkdown日誌として自動資産化する。
 * 特徴: WSL/Windows環境の厳格な分岐解決、.envのAGENT_LOG_*に限定した厳格ロード、機密情報のマスク、冪等性を確保した部分更新。
 * バグ修正: 純粋なLinux環境でWindows用のパスが渡された際、相対フォルダ（C:\Users...）を作らないようにガードを追加。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. 環境判別とパス解決関数の定義
function isWsl() {
    if (process.platform !== 'linux') return false;
    try {
        const version = fs.readFileSync('/proc/version', 'utf8');
        return version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl');
    } catch (_) {
        return false;
    }
}

function resolveWslPath(winPath) {
    if (!winPath) return '';
    
    // WSL環境でのみ wslpath -u を呼び出す
    if (isWsl()) {
        try {
            const resolved = execSync(`wslpath -u "${winPath.replace(/\\/g, '\\\\')}"`, { encoding: 'utf8' }).trim();
            return resolved;
        } catch (err) {
            console.warn(`[Logger] wslpath 変換に失敗したため、簡易置換を試みます: ${err.message}`);
            // wslpath失敗時のフォールバック (C:\ -> /mnt/c/)
            const driveLetterMatch = winPath.match(/^([a-zA-Z]):[\\/](.*)/);
            if (driveLetterMatch) {
                const drive = driveLetterMatch[1].toLowerCase();
                const rest = driveLetterMatch[2].replace(/\\/g, '/');
                return `/mnt/${drive}/${rest}`;
            }
            return winPath;
        }
    }
    
    // Windows ネイティブ環境
    if (process.platform === 'win32') {
        return path.win32.resolve(winPath);
    }
    
    // Linux/macOS ネイティブ環境
    // Windows形式の絶対パス（C:\等）やバックスラッシュを含むパスは、誤って相対パス解決されないようガード
    if (winPath.match(/^[a-zA-Z]:[\\/]/) || winPath.includes('\\')) {
        console.warn(`[Logger] Linuxネイティブ環境でWindows形式のパスを検出したため、パス解決をスキップします: ${winPath}`);
        return '';
    }
    
    return path.resolve(winPath);
}

// 2. .env 読み込みと AGENT_LOG_* 限定フィルタリング
function loadEnvConfig() {
    const config = {
        AGENT_LOG_OBSIDIAN_DIR: '',
        AGENT_LOG_OBSIDIAN_ONLY: 'false',
        AGENT_LOG_PROJECT_DIR: ''
    };

    // カレントディレクトリの .env と .env.local を探索
    const envPaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.local')
    ];

    envPaths.forEach(envPath => {
        if (fs.existsSync(envPath)) {
            try {
                const content = fs.readFileSync(envPath, 'utf8');
                content.split('\n').forEach(line => {
                    const match = line.match(/^\s*(AGENT_LOG_[A-Z0-9_]+)\s*=\s*(.*)\s*$/);
                    if (match) {
                        const key = match[1];
                        let val = match[2].trim();
                        // 引用符の除去
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.slice(1, -1);
                        }
                        config[key] = val;
                    }
                });
            } catch (err) {
                console.error(`[Logger] 環境変数ファイルの読み込みに失敗しました (${envPath}):`, err.message);
            }
        }
    });

    return config;
}

// 3. 秘密情報のマスク処理 (Redaction)
function redactSecrets(text) {
    if (!text) return '';
    
    // Notion API キー (ntn_...)
    let redacted = text.replace(/ntn_[a-zA-Z0-9]+/g, '[REDACTED_NOTION_API_KEY]');
    
    // AWS アクセスキーID / シークレットアクセスキー
    redacted = redacted.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]');
    redacted = redacted.replace(/(?<=aws_secret_access_key\s*=\s*)[^\s#]+/gi, '[REDACTED_AWS_SECRET]');
    
    // 一般的なトークン/シークレット表現（Authorization Bearer など）
    redacted = redacted.replace(/(?<=Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi, '[REDACTED_BEARER_TOKEN]');
    
    return redacted;
}

// 4. transcript.jsonl の堅牢なパースとフォールバック
function parseTranscript(jsonlPath) {
    const activities = [];
    
    if (!fs.existsSync(jsonlPath)) {
        console.warn(`[Logger] 会話ログファイルが見つかりません: ${jsonlPath}`);
        return null;
    }

    try {
        const rawContent = fs.readFileSync(jsonlPath, 'utf8');
        const lines = rawContent.split('\n').filter(line => line.trim() !== '');

        lines.forEach((line, index) => {
            try {
                const step = JSON.parse(line);
                // スキーマ変更耐性: 必要なプロパティが存在するか厳密にチェック
                if (!step || typeof step !== 'object') return;

                const stepType = step.type || '';
                const source = step.source || '';
                const content = step.content || '';
                
                if (stepType === 'USER_INPUT' && source === 'USER_EXPLICIT') {
                    activities.push({ type: 'user', content: redactSecrets(content) });
                } else if (stepType === 'VIEW_FILE' && step.tool_calls) {
                    step.tool_calls.forEach(tc => {
                        if (tc.name === 'view_file' && tc.args && tc.args.AbsolutePath) {
                            activities.push({ type: 'view', file: path.basename(tc.args.AbsolutePath) });
                        }
                    });
                } else if (stepType === 'RUN_COMMAND' && step.tool_calls) {
                    step.tool_calls.forEach(tc => {
                        if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
                            // コマンド引数などのシークレット保護
                            activities.push({ type: 'command', cmd: redactSecrets(tc.args.CommandLine) });
                        }
                    });
                } else if (stepType === 'REPLACE_FILE_CONTENT' && step.tool_calls) {
                    step.tool_calls.forEach(tc => {
                        if (tc.name === 'replace_file_content' && tc.args && tc.args.TargetFile) {
                            activities.push({ type: 'modify', file: path.basename(tc.args.TargetFile) });
                        }
                    });
                } else if (stepType === 'PLANNER_RESPONSE' && content) {
                    activities.push({ type: 'agent', content: redactSecrets(content) });
                }
            } catch (lineErr) {
                // 個別行のパースエラーはスキップして継続（スキーマ崩壊耐性）
                console.warn(`[Logger] 行 ${index + 1} のパースをスキップしました: ${lineErr.message}`);
            }
        });
    } catch (err) {
        console.error('[Logger] 会話ログのパース中に致命的なエラーが発生しました。フォールバックします:', err.message);
        return null;
    }

    return activities;
}

function findFileBySuffix(rootDir, suffix) {
    if (!fs.existsSync(rootDir)) return '';

    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
        const entryPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const found = findFileBySuffix(entryPath, suffix);
            if (found) return found;
        } else if (entry.name.endsWith(suffix)) {
            return entryPath;
        }
    }

    return '';
}

function parseCodexTranscript(jsonlPath) {
    const activities = [];

    if (!jsonlPath || !fs.existsSync(jsonlPath)) return null;

    try {
        const rawContent = fs.readFileSync(jsonlPath, 'utf8');
        const lines = rawContent.split('\n').filter(line => line.trim() !== '');

        lines.forEach((line, index) => {
            try {
                const step = JSON.parse(line);
                const payload = step && step.payload;
                if (!payload || typeof payload !== 'object') return;

                if (step.type === 'event_msg' && payload.type === 'user_message' && payload.message) {
                    activities.push({ type: 'user', content: redactSecrets(payload.message) });
                } else if (step.type === 'response_item' && payload.type === 'message' && payload.role === 'user' && Array.isArray(payload.content)) {
                    payload.content.forEach(item => {
                        if (item && item.type === 'input_text' && item.text) {
                            activities.push({ type: 'user', content: redactSecrets(item.text) });
                        }
                    });
                } else if (step.type === 'response_item' && payload.type === 'message' && payload.role === 'assistant' && Array.isArray(payload.content)) {
                    if (!payload.phase || payload.phase === 'final_answer') {
                        payload.content.forEach(item => {
                            if (item && item.type === 'output_text' && item.text) {
                                activities.push({ type: 'agent', content: redactSecrets(item.text) });
                            }
                        });
                    }
                } else if (step.type === 'response_item' && payload.type === 'function_call') {
                    const args = JSON.parse(payload.arguments || '{}');
                    if (payload.name === 'exec_command' && args.cmd) {
                        activities.push({ type: 'command', cmd: redactSecrets(args.cmd) });
                    } else if (payload.name === 'apply_patch' && args.patch) {
                        const matches = args.patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm);
                        for (const match of matches) {
                            activities.push({ type: 'modify', file: path.basename(match[1]) });
                        }
                    }
                }
            } catch (lineErr) {
                console.warn(`[Logger] Codexログの行 ${index + 1} をスキップしました: ${lineErr.message}`);
            }
        });
    } catch (err) {
        console.error('[Logger] Codexログのパース中に致命的なエラーが発生しました。フォールバックします:', err.message);
        return null;
    }

    return activities;
}

// 5. 決定論的な Markdown ログ of 生成
function generateMarkdown(conversationId, activities) {
    const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    let md = `<!-- Conversation Start: ${conversationId} -->\n`;
    md += `### 🤖 エージェント対話ログ (${dateStr} ${timeStr})\n\n`;
    md += `* **Conversation ID**: \`${conversationId}\`\n`;
    md += `* **作業スペース**: \`${path.basename(process.cwd())}\`\n\n`;

    if (!activities || activities.length === 0) {
        md += `> [!NOTE]\n> 対話アクティビティが記録されていないか、パースに失敗しました（フォールバック実行）。\n\n`;
        md += `<!-- Conversation End: ${conversationId} -->\n`;
        return md;
    }

    // 対話履歴を時系列順に抽出・整理
    const chatFlow = [];
    let lastType = null;
    let lastContent = null;

    activities.forEach(a => {
        if (a.type === 'user' || a.type === 'agent') {
            const normalizedContent = a.content.trim();
            // 隣接する同じ話者の同一内容の連続投稿を排除
            if (a.type === lastType && normalizedContent === lastContent) {
                return;
            }
            chatFlow.push(a);
            lastType = a.type;
            lastContent = normalizedContent;
        }
    });

    if (chatFlow.length > 0) {
        md += `#### 💬 対話履歴\n\n`;
        chatFlow.forEach((turn, idx) => {
            if (turn.type === 'user') {
                md += `👤 **ユーザー**:\n`;
                md += `> ${turn.content.split('\n').join('\n> ')}\n\n`;
            } else if (turn.type === 'agent') {
                md += `🤖 **エージェント**:\n${turn.content}\n\n`;
            }
            if (idx < chatFlow.length - 1) {
                md += `---\n\n`;
            }
        });
    }

    // 実行コマンドの抽出（重複排除）
    const commands = [...new Set(activities.filter(a => a.type === 'command').map(a => a.cmd))];
    if (commands.length > 0) {
        md += `#### 💻 実行した主要コマンド\n\`\`\`bash\n`;
        commands.forEach(cmd => {
            md += `${cmd}\n`;
        });
        md += `\`\`\`\n\n`;
    }

    // 修正・閲覧ファイルの抽出
    const viewedFiles = [...new Set(activities.filter(a => a.type === 'view').map(a => a.file))];
    const modifiedFiles = [...new Set(activities.filter(a => a.type === 'modify').map(a => a.file))];
    
    if (viewedFiles.length > 0 || modifiedFiles.length > 0) {
        md += `#### 📄 操作ファイル\n`;
        if (viewedFiles.length > 0) md += `* **閲覧**: ${viewedFiles.map(f => `\`${f}\``).join(', ')}\n`;
        if (modifiedFiles.length > 0) md += `* **変更**: ${modifiedFiles.map(f => `\`${f}\``).join(', ')}\n`;
        md += `\n`;
    }

    md += `<!-- Conversation End: ${conversationId} -->\n`;
    return md;
}

// 6. 冪等性を確保したファイル保存・更新処理
function writeLogWithIdempotency(filePath, conversationId, newContent) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    let existingContent = '';
    if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, 'utf8');
    }

    const startMarker = `<!-- Conversation Start: ${conversationId} -->`;
    const endMarker = `<!-- Conversation End: ${conversationId} -->`;

    const hasStart = existingContent.includes(startMarker);
    const hasEnd = existingContent.includes(endMarker);

    // どちらか片方しか見つからないなどの「破損状態」の場合
    if (hasStart !== hasEnd) {
        console.warn(`[Logger] マーカー破損を検知しました (${filePath})。安全のため、上書きせず新規ファイルに退避します。`);
        const fallbackPath = `${filePath}.failed.${Date.now()}.md`;
        fs.writeFileSync(fallbackPath, newContent, 'utf8');
        return;
    }

    if (hasStart && hasEnd) {
        // 同一 Conversation ID が存在する場合: 部分置換（上書き）
        console.log(`[Logger] 既存の会話ID [${conversationId}] を検出しました。該当セクションを最新に更新します。`);
        const startIndex = existingContent.indexOf(startMarker);
        const endIndex = existingContent.indexOf(endMarker) + endMarker.length;

        const before = existingContent.slice(0, startIndex);
        const after = existingContent.slice(endIndex);

        // 改行調整
        const updated = before + newContent + after;
        fs.writeFileSync(filePath, updated, 'utf8');
    } else {
        // 新規 Conversation ID の場合: 末尾に追記
        console.log(`[Logger] 新しい会話IDです。ログファイル末尾に追記します。`);
        const delimiter = existingContent ? '\n\n---\n\n' : '';
        fs.writeFileSync(filePath, existingContent + delimiter + newContent, 'utf8');
    }
}

// 7. メイン処理
function main() {
    // 実行引数のパース
    const args = process.argv.slice(2);
    let conversationId = '';
    
    // Conversation IDの取得 (引数から、または環境変数等からフォールバック)
    const idArgIndex = args.indexOf('--id');
    if (idArgIndex !== -1 && args[idArgIndex + 1]) {
        conversationId = args[idArgIndex + 1];
    } else {
        // 環境変数等から推測を試みる
        conversationId = process.env.CONVERSATION_ID || process.env.CODEX_THREAD_ID || 'manual-' + Date.now();
    }

    console.log(`[Logger] ログ資産化開始 (ID: ${conversationId})`);

    // configの読み込み
    const config = loadEnvConfig();
    
    // 会話ログ transcript.jsonl のパスを特定
    // システムの conversation_logs 仕様に従い、ホーム配下の .gemini から探索
    const userHome = process.env.HOME || '/home/haya-ryoo';
    const jsonlPath = path.join(userHome, `.gemini/antigravity-ide/brain/${conversationId}/.system_generated/logs/transcript.jsonl`);
    let activities = parseTranscript(jsonlPath);

    if (!activities) {
        const codexRoot = path.join(userHome, '.codex');
        const codexJsonlPath = findFileBySuffix(path.join(codexRoot, 'sessions'), `-${conversationId}.jsonl`)
            || findFileBySuffix(path.join(codexRoot, 'archived_sessions'), `-${conversationId}.jsonl`);
        if (codexJsonlPath) {
            console.log(`[Logger] Codex会話ログを使用します: ${codexJsonlPath}`);
            activities = parseCodexTranscript(codexJsonlPath);
        }
    }
    const logMarkdown = generateMarkdown(conversationId, activities);

    // 7-1. Obsidian への書き出し (既定・デフォルト)
    const rawObsidianDir = config.AGENT_LOG_OBSIDIAN_DIR || 'C:\\Users\\oault\\ドキュメント\\Obsidian\\ローカル\\Daily';
    let obsidianDir = resolveWslPath(rawObsidianDir);
    
    // 【バグ修正】Linuxネイティブ環境でWindows形式のパスがスキップされた場合の安全フォールバック
    if (!obsidianDir && process.platform === 'linux' && !isWsl()) {
        obsidianDir = path.join(userHome, 'Obsidian/Daily');
        console.log(`[Logger] Linuxネイティブ環境用の標準フォールバックパスを使用します: ${obsidianDir}`);
    }

    if (obsidianDir) {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const obsidianFilePath = path.join(obsidianDir, `${todayStr}.md`);
        try {
            writeLogWithIdempotency(obsidianFilePath, conversationId, logMarkdown);
            console.log(`[Logger] Obsidian 日誌に正常に保存されました: ${obsidianFilePath}`);
            
            // Git自動プッシュ処理
            try {
                const gitRepoDir = path.dirname(obsidianDir); // /home/haya-ryoo/Obsidian
                if (fs.existsSync(path.join(gitRepoDir, '.git'))) {
                    execSync('git add . && git commit -m "Auto-update daily logs" && git push origin main', { cwd: gitRepoDir, stdio: 'ignore' });
                    console.log('[Logger] [Git Sync] Obsidian の変更を GitHub に自動プッシュしました。');
                }
            } catch (gitErr) {
                // コミットする変更がない場合や、リモート未設定の場合は警告を出さずにスキップ
            }
        } catch (err) {
            console.error(`[Logger] Obsidian への保存に失敗しました: ${err.message}`);
        }
    } else {
        console.warn('[Logger] Obsidian の出力先ディレクトリが特定できなかったため、書き出しをスキップしました。');
    }

    // 7-2. プロジェクト内への書き出し (明示的な Opt-in のみ)
    const projectDirRel = config.AGENT_LOG_PROJECT_DIR;
    const isObsidianOnly = config.AGENT_LOG_OBSIDIAN_ONLY === 'true';

    if (projectDirRel && !isObsidianOnly) {
        const projectDir = path.resolve(process.cwd(), projectDirRel);
        const todayStr = new Date().toISOString().split('T')[0];
        const projectFilePath = path.join(projectDir, `${todayStr}.md`);
        try {
            writeLogWithIdempotency(projectFilePath, conversationId, logMarkdown);
            console.log(`[Logger] プロジェクトドキュメントに正常に保存されました: ${projectFilePath}`);
        } catch (err) {
            console.error(`[Logger] プロジェクト内への保存に失敗しました: ${err.message}`);
        }
    } else {
        console.log('[Logger] プロジェクトドキュメントへの書き出しはオプトアウトされているか、設定されていません。');
    }
}

main();
