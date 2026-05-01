import { execSync } from 'child_process';
import fs from 'fs';

/**
 * リリースタグ（GitHub Release）作成専用スクリプト
 * ※絶対に git push を行わない安全設計
 */

const GH_CLI_PATH = '"C:\\Program Files\\GitHub CLI\\gh.exe"';

function run(command) {
    console.log(`> ${command}`);
    return execSync(command, { encoding: 'utf-8' }).trim();
}

async function main() {
    try {
        // 1. ブランチ確認
        const currentBranch = run('git branch --show-current');
        if (currentBranch !== 'main') {
            console.error('エラー: リリース作成は main ブランチで行う必要があるのだ！');
            process.exit(1);
        }

        // 2. クリーンチェック
        const status = run('git status --short');
        if (status) {
            console.error('エラー: 未コミットの変更があるのだ！クリーンな状態で実行するのだ！');
            process.exit(1);
        }

        // 3. 最新バージョンの提案
        console.log('現在のバージョンを確認中...');
        const suggest = run('node .agent/scripts/suggest-version.js');
        console.log(suggest);

        const versionMatch = suggest.match(/PATCH: (v\d+\.\d+\.\d+)/);
        const minorMatch = suggest.match(/MINOR: (v\d+\.\d+\.\d+)/);
        
        if (!versionMatch) {
            console.error('エラー: バージョン提案が取得できなかったのだ。');
            process.exit(1);
        }

        const patchVersion = versionMatch[1];
        const minorVersion = minorMatch ? minorMatch[1] : null;

        console.log('-----------------------------------');
        console.log(`推奨バージョン: ${minorVersion || patchVersion}`);
        console.log('以下のコマンドをコピーして実行するのだ（AIはこれを提案するだけにするのだ）:');
        console.log('-----------------------------------');
        
        // 実際には実行せず、コマンドを表示するだけ、あるいはユーザーの明示的な許可で gh release だけ叩く
        const releaseNote = 'セトリ予想機能の期間制限（2026-05-01以降）の実装';
        const finalCmd = `${GH_CLI_PATH} release create ${minorVersion || patchVersion} --target main --title "${minorVersion || patchVersion} - ${releaseNote}" --notes "リリース内容はPRを参照するのだ！"`;
        
        console.log(finalCmd);
        console.log('-----------------------------------');
        
        console.log('※このスクリプトは git push を行わないのだ。');
        console.log('リモートの main が最新であることを確認してから、上記のコマンドを実行してほしいのだ。');

    } catch (err) {
        console.error('実行中にエラーが発生したのだ:', err.message);
        process.exit(1);
    }
}

main();
