# UVERworld Setlist Archive

UVERworld ファンのライブ参戦記録・セットリスト管理サイト。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 + Vite + TanStack React Query + TypeScript (一部) |
| バックエンド | Node.js / Express 5（`server/`） |
| DB | PostgreSQL（`server/db.js`） |
| 認証 | JWT + bcrypt |

## 開発サーバー起動

```powershell
# フロントエンド（プロジェクトルートで）
npm run dev

# バックエンド（別ターミナルで）
cd server && npm run dev
```

Vite は `/api/*` を `http://127.0.0.1:3001` にプロキシします（`vite.config.js`）。  
**バックエンドのデフォルトポートは `server/.env` の `PORT` に依存します。ローカルでは `3001` に設定してください。**

## ブランチ・デプロイ戦略

```
feature/* → dev（push で Staging 自動デプロイ）→ main（GitHub Release で Production 自動デプロイ）
```

- `dev` push → Docker Compose ベースの Staging へ自動デプロイ
- GitHub Release publish → systemd ベースの Production へ自動デプロイ（`deploy-production.yml`）

## 重要なルール

- 本番DBへの直接操作は禁止。スキーマ変更は `server/scripts/` のマイグレーションスクリプトで行う。
- `main` ブランチへのマージだけでは本番デプロイされない。**必ず GitHub Release を publish する。**
- 本番デプロイ後は `sudo systemctl status uver-setlist` で起動時刻を確認する（ゾンビプロセス対策）。

## テスト

```powershell
npm test        # vitest（フロントエンド）
```

## 詳細ドキュメント

@docs/development_workflow.md
@docs/environments.md
@docs/SPECIFICATIONS.md
@docs/db_operations.md
