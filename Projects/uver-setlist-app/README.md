# UVERworld Setlist Archive

UVERworld ファンのライブ参戦記録・セットリスト管理サイト `uver-setlist-app` の開発ハブ。

## リポジトリ

- GitHub: https://github.com/hayaryoo519/uver-setlist-app
- ローカル: `/home/haya-ryoo/dev/uver-setlist-app`

## ノートの使い分け

- `Daily/`: エージェント会話ログ。自動生成された記録を時系列で確認する。
- `Projects/uver-setlist-app/`: 仕様、課題、判断事項、今後の作業を残す。
- `Projects/uver-setlist-app/Issues/`: 具体的な課題や調査メモを 1 件 1 ファイルで残す。
- `Errors/uver-setlist-app/`: 再利用できるトラブルシューティングを 1 件 1 ファイルで残す。

## 運用ルール

1. 会話ログは `Daily/YYYY-MM-DD.md` へ自動保存する。
2. 会話ログをそのまま仕様書にせず、残す価値のある内容だけを `Projects/` または `Errors/` へ整理する。
3. 実装タスクは `Projects/uver-setlist-app/Issues/` に残し、完了後も判断経緯が分かる状態にする。
4. エラー記録には、症状、原因、解決手順、再発防止策を書く。
5. アプリリポジトリの `docs/` はプロダクト仕様を管理し、個人用の会話ログや作業メモは Obsidian 側で管理する。

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
