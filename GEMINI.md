# GEMINI.md - プロジェクトルール

## プロジェクト概要

**UVERworld Setlist Archive** - UVERworld のライブセットリスト記録・閲覧・分析 Web アプリ。
公開 URL: `https://uver-setlist-archive.org`

### 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 + Vite + TanStack React Query |
| バックエンド | Node.js / Express 5 |
| データベース | PostgreSQL |
| 認証 | JWT + bcrypt |
| インフラ | Cloudflare + systemd (本番) / Docker Compose (検証) |

### 開発サーバー起動

```powershell
# フロントエンド（プロジェクトルート）
npm run dev

# バックエンド（別ターミナル）
cd server && npm run dev
```

### ブランチ・デプロイ戦略

```
feature/* (ローカル) → dev (Staging 自動デプロイ) → main + GitHub Release (本番自動デプロイ)
```

- `dev` へのプッシュ → Staging 自動デプロイ
- **本番デプロイは GitHub Release publish が必須**（`main` へのマージだけでは動かない）

### 詳細ドキュメント

- `docs/development_workflow.md` — 開発からリリースまでの手順
- `docs/environments.md` — 環境・DB 仕様・本番サーバー運用
- `docs/db_operations.md` — DB バックアップ・同期手順

---

## 言語設定
- ユーザーとの対話、計画の策定、説明文はすべて**日本語**で行うこと。
- 技術用語（例: Request, Response, Commit）は、文脈に応じてカタカナまたは英語のまま使用可。ただし説明は日本語で行うこと。

## コード生成ルール
- コード内のコメントは、ドキュメンテーション文字列（docstring）を含め、すべて**日本語**で記述すること。
- 変数名は英語で分かりやすく命名すること（ローマ字命名は禁止）。
- コミットメッセージは**日本語**で記述すること。

## 安全策（絶対厳守）
- **本番データベース（`uver_setlist_prod`）を直接操作しないこと。** SQL の実行が必要な場合は、必ずユーザーに確認してから実行すること。
- **`server/.env` ファイルを絶対に削除・上書きしないこと。**
- **`src/data/` 配下のデータファイルを、ユーザーの許可なく削除しないこと。**
- **本番サーバーへのデプロイ・コマンド実行は原則禁止。** AIは診断のための read-only な操作（ログ確認等）のみ行い、デプロイや再起動はユーザーの許可なく絶対に行わないこと。
- **`main` ブランチへの Push/Merge は原則禁止。** AIは `dev` ブランチまたは作業用ブランチのみを操作し、`main` への統合は必ずユーザーが行うこと。
- データベースのマイグレーションや破壊的変更を行う前には、必ずユーザーに確認すること。

## Git運用ルール
- **`dev` へのマージ**: PRは不要。ローカルでマージし、pushする。
- **`main` へのマージ**: 必ず `dev → main` のPRを作成する。マージはユーザーが行う。
- 作業ブランチ（`feature/*` 等）→ `dev` はローカルマージ。
- `dev` → `main` はPR経由。
- **バージョン番号を勝手に決めない。** PRタイトル、リリース作成、ユーザーへの提案など、いかなる場合もバージョン番号を扱う際は、必ず `git tag --sort=-v:refname` で最新タグを実機確認すること。確認せずに想像でバージョンを提示（捏造）することは厳禁。
- **証拠の提示**: バージョン番号を提案・使用する際は、必ず「最新タグは vX.X.X でした」と実測値を報告すること。
- **推奨スクリプト**: `node .agent/scripts/suggest-version.js` を実行し、その出力をベースに決定すること。
- 詳細なバージョニング・リリース手順は `docs/versioning_policy.md` に従うこと。

## プロジェクト構成
- フロントエンド: React (Vite)
- バックエンド: Express.js (Node.js)
- データベース: PostgreSQL
- モジュールシステム: ESM (`"type": "module"`)
- ブランチ: `dev` で開発、`main` は本番用
