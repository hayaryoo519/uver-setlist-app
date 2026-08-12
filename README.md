# Obsidian Vault

個人の開発メモ・エラー記録・日誌を管理する Obsidian vault。

## ディレクトリ構成

```
Obsidian/
├── Daily/          # エージェント会話ログ（自動生成。手動編集しない）
├── Errors/         # 再利用できるトラブルシューティング。1件1ファイル
├── Projects/       # プロジェクト別の課題メモ・判断記録
└── README.md       # このファイル
```

## Git 自動同期

`~/scripts/sync-obsidian.sh` が **cron で毎時0分** に実行される。

```
0 * * * * /home/haya-ryoo/scripts/sync-obsidian.sh >> /home/haya-ryoo/scripts/sync-obsidian.log 2>&1
```

動作:

1. 未コミットの変更があれば自動コミット（`Auto-commit: YYYY-MM-DD HH:MM`）
2. `git pull --rebase origin main` でリモートの変更を取り込む
3. `git push origin main`

ログ確認:

```bash
tail -f ~/scripts/sync-obsidian.log
```

エラー時（`ERROR:` が記録された場合）は手動で確認する:

```bash
cd ~/Obsidian
git status
# 競合があれば
git rebase --abort
```

## エージェント会話ログの自動保存

`agent-logger.cjs` が Claude Code のセッション終了時に `Daily/YYYY-MM-DD.md` へ
会話ログを保存する。`install-logger-hook.cjs` でフックを設定済み。

会話ログはそのまま仕様書にせず、残す価値のある内容だけを
`Projects/` または `Errors/` へ整理する。

## プロジェクト一覧

- [kakeibo](./Projects/kakeibo/README.md) — 同棲カップル向け共有費精算アプリ
