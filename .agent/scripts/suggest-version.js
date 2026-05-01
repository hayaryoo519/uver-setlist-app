/**
 * suggest-version.js
 * 最新のGitHubリリースを取得し、次に設定すべきバージョン番号を提案します。
 */
import { execSync } from 'child_process';

function getLatestVersion() {
    try {
        const ghPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';
        const output = execSync(`"${ghPath}" release list --limit 1`, { encoding: 'utf8' });
        const match = output.match(/v(\d+)\.(\d+)\.(\d+)/);
        if (match) {
            return {
                full: match[0],
                major: parseInt(match[1]),
                minor: parseInt(match[2]),
                patch: parseInt(match[3])
            };
        }
    } catch (e) {
        console.error('Error fetching latest release:', e.message);
    }
    return null;
}

const latest = getLatestVersion();

if (!latest) {
    console.log('最新のリリースが見つかりませんでした。v1.0.0 から開始することを検討してください。');
    process.exit(0);
}

console.log(`\x1b[36m[Current Version]\x1b[0m ${latest.full}`);
console.log('-----------------------------------');
console.log(`\x1b[32m[Next Suggestions]\x1b[0m`);
console.log(`  PATCH: v${latest.major}.${latest.minor}.${latest.patch + 1}  (バグ修正・微調整)`);
console.log(`  MINOR: v${latest.major}.${latest.minor + 1}.0  (機能追加・改善)`);
console.log(`  MAJOR: v${latest.major + 1}.0.0    (大規模変更)`);
console.log('-----------------------------------');
console.log('リリース作成コマンドの例:');
console.log(`  gh release create v${latest.major}.${latest.minor}.${latest.patch + 1} --title "v${latest.major}.${latest.minor}.${latest.patch + 1} - タイトル" --notes "内容"`);
