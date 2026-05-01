# 開発ワークフロー (Development Workflow)

ローカル開発からリリースまでの一連の手順をまとめます。

---

## 環境概要

| 環境 | ブランチ | URL | DB |
|:---|:---|:---|:---|
| **ローカル (Local)** | `feature/*` | `http://localhost:8000` | Docker Supabase (port: 54332) |
| **検証 (Staging)** | `dev` | `http://192.168.0.13:9001` | Docker PostgreSQL (port: 54325) |
| **本番 (Production)** | `main` | `https://uver-setlist-archive.org` | Host PostgreSQL (port: 5432) |

詳細は [`docs/environments.md`](./environments.md) を参照。

---

## Step 1 : ローカル開発

### ブランチを作成する
```bash
git checkout dev
git pull origin dev
git checkout -b feature/xxx
```

### 開発サーバーを起動する
Claude Code のプロンプトで `/dev-start` と入力するか、手動で起動します。

```bash
# フロントエンド（ルートで実行）
npm run dev

# バックエンド（別ターミナルで実行）
cd server && npm run dev
```

### コミットする
```bash
git add <ファイル>
git commit -m "feat: xxx"   # コミットプレフィックス: feat / fix / docs / refactor / chore
```

コミットメッセージ規則：
| プレフィックス | 用途 |
|:---|:---|
| `feat:` | 新機能 |
| `fix:` | バグ修正 |
| `docs:` | ドキュメントのみの変更 |
| `refactor:` | 機能変更を伴わないリファクタリング |
| `chore:` | ビルド・設定変更など |

---

## Step 2 : dev ブランチへマージ → Staging 検証

### dev へマージする
```bash
git checkout dev
git merge feature/xxx
git push origin dev
```

`dev` へのプッシュで **Staging 環境へ自動デプロイ**されます。

### Staging 環境を起動する（必要な場合）
```bash
docker compose up -d    # 起動
docker compose stop     # 一時停止
docker compose down     # 完全停止（データ保持）
```

### DB マイグレーションを実行する（スキーマ変更がある場合）
```bash
# サーバー上で実行
cd server

node scripts/migrate.js --dry-run   # 未適用の確認（実行しない）
node scripts/migrate.js             # 実際に適用
```

### 動作確認する
- `http://192.168.0.13:9001` でブラウザ確認
- 追加・修正した機能を中心に検証

---

## Step 3 : PR を作成して main へマージ

### GitHub CLI で PR を作成する
```powershell
& "C:\Program Files\GitHub CLI\gh.exe" pr create `
  --base main `
  --head dev `
  --title "タイトル" `
  --body "変更内容の説明"
```

### マージする
GitHub 上でレビュー → Merge pull request。

---

## Step 4 : 本番デプロイ

`main` へのマージで **本番環境へ自動デプロイ**されます。

### 手動デプロイが必要な場合
```bash
# サーバーへ SSH ログイン
ssh haya-ryoo@server01

cd ~/apps/uver-setlist-app

# 最新化
git pull origin main
npm install --legacy-peer-deps

# マイグレーション
cd server && npm run migrate && cd ..

# ビルドと再起動
npm run build
sudo systemctl restart uver-app-prod
```

### ログ確認
```bash
systemctl status uver-app-prod         # 稼働状況
journalctl -u uver-app-prod -f         # リアルタイムログ
node server/analyze_security.js        # セキュリティログ分析
```

---

## Step 5 : リリースタグを打つ

バージョン規則は [`docs/versioning_policy.md`](./versioning_policy.md) を参照。

```
v[MAJOR].[MINOR].[PATCH]

MAJOR : 破壊的変更・大規模リニューアル
MINOR : 新機能追加（例: v1.5.x → v1.6.0）
PATCH : バグ修正・軽微なUI調整（例: v1.6.0 → v1.6.1）
```

### 手順

```powershell
# ① main を最新化
git checkout main
git pull origin main

# ② 最新タグを確認
git tag --sort=-v:refname | Select-Object -First 5

# ③ リリース作成
& "C:\Program Files\GitHub CLI\gh.exe" release create vX.Y.Z `
  --title "vX.Y.Z - 簡潔なタイトル" `
  --notes "## 新機能`n- xxx`n`n## バグ修正`n- xxx"
```

---

## Issue 管理

```powershell
# Issue を一覧表示
& "C:\Program Files\GitHub CLI\gh.exe" issue list --repo hayaryoo519/uver-setlist-app

# Issue を閉じる
& "C:\Program Files\GitHub CLI\gh.exe" issue close <番号> --repo hayaryoo519/uver-setlist-app
```

---

## 全体フロー図

```
feature/xxx (ローカル開発)
    │
    │ git merge / PR
    ▼
  dev ブランチ ──→ 自動デプロイ ──→ Staging (192.168.0.13:9001)
    │                                   │
    │  動作確認 OK                       │ node scripts/migrate.js
    │ PR --base main                    │（スキーマ変更がある場合）
    ▼
  main ブランチ ──→ 自動デプロイ ──→ Production (uver-setlist-archive.org)
    │
    │ gh release create vX.Y.Z
    ▼
  GitHub Release (タグ)
```

---

最終更新日: 2026-05-01
