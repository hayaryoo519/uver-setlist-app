# 開発ワークフロー (Development Workflow)

ローカル開発からリリースまでの一連の手順をまとめます。

---

## 環境概要

| 環境 | ブランチ | URL | DB |
|:---|:---|:---|:---|
| **ローカル (Local)** | `feature/*` | `http://localhost:8000` | Docker Supabase (port: 54332) |
| **検証 (Staging)** | `dev` | `http://<staging-server>:9001` | Docker PostgreSQL (port: 54325) |
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
- `http://<staging-server>:9001` でブラウザ確認
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

**GitHub Release を publish すると自動デプロイ**されます（main へのマージだけでは動きません）。

### 自動デプロイの流れ
1. `gh release create vX.Y.Z` でリリース publish
2. GitHub Actions (`deploy-production.yml`) が self-hosted ランナーで起動
3. `git reset --hard origin/main` → `npm install` → `node scripts/migrate.js` → `npm run build` → `systemctl restart uver-setlist`

### 手動デプロイが必要な場合
```bash
ssh <server-user>@server01
cd ~/apps/uver-setlist-app/server

git fetch origin main && git reset --hard origin/main
npm install
node scripts/migrate.js

cd ~/apps/uver-setlist-app
npm install --legacy-peer-deps
npm run build
sudo systemctl restart uver-setlist
```

### ログ確認
```bash
sudo systemctl status uver-setlist          # 稼働状況
sudo journalctl -u uver-setlist -f          # リアルタイムログ
sudo journalctl -u uver-setlist -n 50       # 直近50行
sudo journalctl -u uver-setlist --since "1 hour ago" | grep -E "Error|500"  # エラー絞り込み
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
  dev ブランチ ──→ 自動デプロイ ──→ Staging (<staging-server>:9001)
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

## CI/CD 構成

### ワークフロー一覧

| ファイル | トリガー | ランナー | 内容 |
|:---|:---|:---|:---|
| `test.yml` | push/PR → `main`, `dev` | GitHub hosted | バックエンド・フロントエンドのテスト実行 |
| `deploy-staging.yml` | push → `dev` | self-hosted | `docker compose up -d --build` |
| `deploy-production.yml` | Release published | self-hosted | git pull → migrate → build → systemctl restart |

### self-hosted ランナー

| 項目 | 内容 |
|:---|:---|
| サーバー | `server01` (`<server-user>` ユーザー) |
| インストール先 | `/home/<server-user>/actions-runner` |
| systemd サービス名 | `actions.runner.hayaryoo519-uver-setlist-app.server01` |
| 自動起動 | enabled（OS 再起動後も自動起動） |

```bash
# ランナーの状態確認
sudo systemctl status actions.runner.hayaryoo519-uver-setlist-app.server01

# 再起動
sudo systemctl restart actions.runner.hayaryoo519-uver-setlist-app.server01

# ログ確認
sudo journalctl -u actions.runner.hayaryoo519-uver-setlist-app.server01 -f
```

### GitHub Secrets

| Secret 名 | 用途 |
|:---|:---|
| `SUDO_PASSWORD` | 本番デプロイ時の `sudo systemctl restart uver-setlist` に使用 |

### よくあるトラブル

| 症状 | 原因 | 対処 |
|:---|:---|:---|
| ジョブが "Waiting for runner..." のまま | ランナーが停止中 | `sudo systemctl start actions.runner.*` |
| "A session for this runner already exists" | 旧プロセスのセッションが残存 | 数分待って `sudo systemctl restart actions.runner.*` |
| `npm error ERESOLVE` (フロントエンド) | `react-helmet-async` の React 19 非対応 | `npm install --legacy-peer-deps` を使用（ワークフロー設定済み） |

---

最終更新日: 2026-05-03
