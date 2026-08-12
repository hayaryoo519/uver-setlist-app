# Kakeibo

同棲カップル向け共有費精算アプリ `kakeibo` の開発ハブ。

## リポジトリ

- GitHub: https://github.com/hayaryoo519/kakeibo
- ローカル: `/home/haya-ryoo/apps/kakeibo`

## ノートの使い分け

- `Daily/`: エージェント会話ログ。自動生成された記録を時系列で確認する。
- `Projects/kakeibo/`: 仕様、課題、判断事項、今後の作業を残す。
- `Projects/kakeibo/Issues/`: 具体的な課題や調査メモを 1 件 1 ファイルで残す。
- `Errors/kakeibo/`: 再利用できるトラブルシューティングを 1 件 1 ファイルで残す。

## Vault の Git 同期

このvaultは `~/scripts/sync-obsidian.sh` により **毎時0分** に自動プッシュされる。
設定・ログ確認・エラー対応は [Vault README](../../README.md) を参照する。

## 運用ルール

1. 会話ログは `Daily/YYYY-MM-DD.md` へ自動保存する。
2. 会話ログをそのまま仕様書にせず、残す価値のある内容だけを `Projects/` または `Errors/` へ整理する。
3. 実装タスクは `Projects/kakeibo/Issues/` に残し、完了後も判断経緯が分かる状態にする。
4. エラー記録には、症状、原因、解決手順、再発防止策を書く。
5. アプリリポジトリの `Docs/` はプロダクト仕様を管理し、個人用の会話ログや作業メモは Obsidian 側で管理する。

## Issue メモのテンプレート

```md
# 課題名

## 背景

## 対応内容

## 確認方法

## 関連リンク
```

## エラーメモのテンプレート

```md
# エラー名

## 症状

## 原因

## 解決手順

## 再発防止
```
