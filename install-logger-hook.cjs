#!/usr/bin/env node

/**
 * Agent Logger Git Hook Installer
 * 
 * 役割: カレントディレクトリの Git リポジトリに、安全にロガーフックをインストール・登録する。
 * 特徴: core.hooksPathの考慮、既存フックの安全なラップ、二重インジェクションの防止（署名確認）。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGGER_PATH = '/home/haya-ryoo/.local/share/antigravity-logger/agent-logger.cjs';
const SIGNATURE = '### GEMINI-AGENT-LOGGER-SIGNATURE ###';

async function main() {
    console.log('[Installer] ログ資産化フックのインストールを開始します...');

    const projectRoot = process.cwd();
    const gitDir = path.join(projectRoot, '.git');

    // 1. Git リポジトリであるかチェック
    if (!fs.existsSync(gitDir)) {
        console.error('❌ エラー: カレントディレクトリが Git リポジトリではありません。プロジェクトのルートで実行してください。');
        process.exit(1);
    }

    // 2. core.hooksPath のチェック
    let hooksDir = path.join(gitDir, 'hooks');
    try {
        const customHooksPath = execSync('git config core.hooksPath', { encoding: 'utf8' }).trim();
        if (customHooksPath) {
            console.log(`[Installer] カスタムフックディレクトリを検出しました: ${customHooksPath}`);
            hooksDir = path.resolve(projectRoot, customHooksPath);
        }
    } catch (_) {
        // core.hooksPath 未設定の場合は無視してデフォルトを使用
    }

    fs.mkdirSync(hooksDir, { recursive: true });
    const prePushPath = path.join(hooksDir, 'pre-push');
    const localPrePushPath = path.join(hooksDir, 'pre-push.local');

    // 3. 既存の二重登録・署名チェック
    if (fs.existsSync(prePushPath)) {
        const content = fs.readFileSync(prePushPath, 'utf8');
        if (content.includes(SIGNATURE)) {
            console.log('✅ [Installer] すでにフックが正常にインストールされています（二重登録を防ぐため処理をスキップします）。');
            process.exit(0);
        }

        // 4. 既存フックのバックアップ & ラップ処理
        console.log(`[Installer] 既存の pre-push フックを検出しました。バックアップを作成し、ラッパー化します...`);
        const timestamp = Date.now();
        const backupPath = `${prePushPath}.backup.${timestamp}`;
        
        try {
            // バックアップを作成
            fs.copyFileSync(prePushPath, backupPath);
            console.log(`  - バックアップ作成完了: ${path.basename(backupPath)}`);

            // 既存フックを pre-push.local に改名 (既存の local フックが既にあればバックアップして上書き)
            if (fs.existsSync(localPrePushPath)) {
                fs.copyFileSync(localPrePushPath, `${localPrePushPath}.backup.${timestamp}`);
            }
            fs.renameSync(prePushPath, localPrePushPath);
            console.log(`  - 既存フックを退避完了: ${path.basename(localPrePushPath)}`);
        } catch (err) {
            console.error('❌ エラー: 既存フックのバックアップ/退避に失敗しました:', err.message);
            process.exit(1);
        }
    }

    // 5. 新しいラッパー pre-push の作成
    const wrapperContent = `#!/bin/sh
${SIGNATURE}
#
# Gemini Agent Logger wrapper hook.
#

# 1. 既存のローカルフック（退避させたもの）があれば先に実行
if [ -f "$0.local" ]; then
    echo "[Logger Hook] 既存の pre-push 処理を実行中..."
    sh "$0.local" "$@"
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo "❌ [Logger Hook] 既存の pre-push 処理が失敗したため、プッシュを中止します。"
        exit $EXIT_CODE
    fi
fi

# 2. 会話ログの自動資産化を実行
echo "🤖 [Logger Hook] エージェントの会話履歴を自動資産化しています..."
node ${LOGGER_PATH} --id "\${CONVERSATION_ID:-$CODEX_THREAD_ID}"

exit 0
`;

    try {
        fs.writeFileSync(prePushPath, wrapperContent, { encoding: 'utf8', mode: 0o755 });
        // 明示的に実行権限を付与 (chmod +x)
        execSync(`chmod +x "${prePushPath}"`);
        console.log(`\n✨ [Installer] 正常にフックがインストールされました！`);
        console.log(`  - フック配置先: ${prePushPath}`);
        console.log(`  - 次回 git push 時、既存の処理の後に会話ログが自動で Obsidian に資産化されます。`);
    } catch (err) {
        console.error('❌ エラー: フックファイルの書き込み、または実行権限の付与に失敗しました:', err.message);
        process.exit(1);
    }
}

main();
