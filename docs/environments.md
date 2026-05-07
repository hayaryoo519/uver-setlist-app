# 環境・データベース仕様書 (Environment & Database Specifications)

UVERworld Setlist Archive の稼働環境と、それぞれのデータベース構成についてまとめます。

## 🌎 1. 環境一覧

このプロジェクトは、開発・検証・運用のために3つの独立した環境で構成されています。

| 環境名 | 用途 | アクセスURL | データベース | DBポート | DB名 | ブランチ |
|:---|:---|:---|:---|:---|:---|:---|
| **ローカル (Local)** | 個人開発・機能実装 | `http://localhost:8000` | Docker Supabase | `54332` | `uver_app_db` | `feature/*` |
| **検証 (Staging)** | 統合テスト・検証 | `http://<staging-server>:9001` | Docker PostgreSQL | `54325` | `uver_setlist_staging` | `dev` |
| **本番 (Production)** | ユーザー向け公開 | `https://uver-setlist-archive.org` | Host PostgreSQL | `5432` | `uver_setlist_prod` | `main` |

---

## 🗄️ 2. データベース詳細

### 🏠 ローカル環境 (Local)
- **構成**: Docker Desktop 上で動作する Supabase コンテナ (`supabase_db_marumie`) を使用。
- **特徴**: 手軽に起動・リセットが可能。開発者ごとに独立したデータを持ちます。
- **管理**: `server/.env` の `DB_HOST=localhost`, `DB_PORT=54332` で接続。

#### 🚀 開発サーバー起動

```powershell
# フロントエンド（プロジェクトルートで）
npm run dev

# バックエンド（別ターミナルで）
cd server
npm run dev
```

#### 🔑 テストアカウント

> パスワードは全アカウント共通: **`password123`**  
> シードスクリプト: `server/scripts/seed_local.js`

| ユーザー名 | メールアドレス | 権限 | 備考 |
|---|---|---|---|
| `admin_test` | admin@test.local | **管理者** | 管理者パネルにアクセス可能 |
| `uver_fan1` | fan1@test.local | 一般 | 予想データあり |
| `uver_fan2` | fan2@test.local | 一般 | 非公開プロフィール設定 |

#### 📦 テストデータ概要

`server/scripts/seed_local.js` を実行すると以下が投入されます:

| データ種別 | 件数 | 内容 |
|---|---|---|
| ユーザー | 3名 | 上記3アカウント |
| 曲 | 30曲 | UVERworld代表曲 |
| ライブ（過去） | 3件 | セトリ確定済み（NORMAL） |
| ライブ（近日） | 2件 | 予想受付中 |
| 予想 | 3件 | fan1×2件、fan2×1件 |

```powershell
# テストデータを初期化して再投入する場合
$env:PGPASSWORD="postgres"; psql -U postgres -h localhost -p 54332 -d uver_app_db `
  -c "TRUNCATE users, songs, lives, setlists, predictions, prediction_songs, prediction_likes RESTART IDENTITY CASCADE;"
cd server
node scripts/seed_local.js
```

#### 🐳 DBコンテナ確認

```powershell
docker ps | findstr supabase
# 起動していない場合
docker restart supabase_db_marumie
```

### 🧪 検証環境 (Staging)
- **構成**: サーバー (`<staging-server>`) 上の Docker コンテナとして動作。
- **特徴**: 本番に近い構成で動作確認。定期的に本番データが同期されます。
- **接続先設定 (接続元による違いに注意)**:
  | 接続元 | `DB_HOST` | `DB_PORT` | 用途 |
  |:---|:---|:---|:---|
  | **Docker内 (App)** | `db-staging` | `5432` | アプリ稼働時の `.env` 設定 |
  | **ホスト (Shell)** | `localhost` | `54325` | ホストから直接スクリプトを実行する場合 |

- **アプリケーションポート**:
  - 外部アクセス: `9001`
  - コンテナ内部: `8000` (`docker-compose.yml` でポートフォワード設定)

### 🚀 本番環境 (Production)
- **構成**: ホスト OS 上で直接動作する PostgreSQL。
- **特徴**: 最高のパフォーマンスと安定性。
- **制限**: **直接のデータ操作は原則禁止。** 変更は必ずアプリケーション経由、または検証環境での確認後に行います。

---

## 🖥️ 本番サーバー運用メモ

### プロセス構成

| 項目 | 内容 |
|:---|:---|
| ホスト名 | `server01` |
| 実行ユーザー | `<server-user>` |
| アプリディレクトリ | `/home/<server-user>/apps/uver-setlist-app/server` |
| プロセス管理 | **systemd** (`uver-setlist.service`) |
| ログ出力先 | **journald** (`journalctl -u uver-setlist`) |

### 初回セットアップ（systemd サービス登録）

リポジトリに `server/uver-setlist.service` があります。初回のみ以下を実行：

```bash
# サービスファイルをコピー
sudo cp /home/<server-user>/apps/uver-setlist-app/server/uver-setlist.service \
        /etc/systemd/system/uver-setlist.service

# systemd に読み込ませる
sudo systemctl daemon-reload

# OS 起動時の自動起動を有効化
sudo systemctl enable uver-setlist

# 今すぐ起動
sudo systemctl start uver-setlist

# 状態確認
sudo systemctl status uver-setlist
```

### ログの確認方法

```bash
# 直近50行
sudo journalctl -u uver-setlist -n 50

# エラーだけ絞り込む
sudo journalctl -u uver-setlist --since "1 hour ago" | grep -E "Error|error|500"

# リアルタイムで流す
sudo journalctl -u uver-setlist -f
```

### デプロイ手順（本番）

```bash
# 本番サーバーにSSHしてから
cd /home/<server-user>/apps/uver-setlist-app

# 1. 最新コードを取得
git pull origin main

# 2. 依存パッケージの更新（package.json変更時のみ）
cd server && npm install && cd ..

# 3. マイグレーションの実行
cd server && npm run migrate && cd ..

# 4. フロントエンドのビルド（UIに変更がある場合）
npm install && npm run build

# 5. サーバーを再起動
sudo systemctl restart uver-setlist

# 6. 起動確認
sudo systemctl status uver-setlist
```

### デプロイの仕組み（自動）

**GitHub Release を publish すると自動デプロイ**されます（`main` へのマージだけでは動きません）。

1. `gh release create vX.Y.Z` でリリース publish
2. GitHub Actions (`deploy-production.yml`) が self-hosted ランナーで起動
3. `git reset --hard origin/main` → `npm install` → `node scripts/migrate.js` → `npm run build` → `systemctl restart uver-setlist`

> 詳細な手順・バージョン規則は `docs/development_workflow.md` を参照。

### よくあるトラブル

| 症状 | 原因 | 対処 |
|:---|:---|:---|
| API が 500 を返す | DBカラム名の不一致、未適用マイグレーション | `node migrate.js` を実行後に `sudo systemctl restart uver-setlist` |
| **API が JSON を返さず HTML を返す** | `systemctl restart` で旧プロセスが残存（ゾンビ化）し、ポート 8000 を占有 | `ExecStartPre` (`fuser -k 8000/tcp`) が `.service` に設定されているか確認。手動復旧: `fuser -k 8000/tcp && sudo systemctl restart uver-setlist` |
| `rate-limit` の ValidationError | `trust proxy` 未設定 (リバースプロキシ環境) | `app.set('trust proxy', 1)` が `index.js` にあるか確認 |
| サービスが起動しない | `.env` が読めない等 | `sudo journalctl -u uver-setlist -n 30` でエラー内容を確認 |
| サービスファイルを変更した | 設定反映されない | `sudo systemctl daemon-reload` 後に `restart` |

---

## 🔐 3. セキュリティ・暗号化

### 暗号化キー (`ENCRYPTION_KEY`)
- **用途**: Spotify / YouTube の OAuth トークンの AES-256-GCM 暗号化に使用。
- **要件**: 64文字の16進数（32バイト）。
- **注意**: 環境ごとに異なるキーを設定すること。キーを紛失すると、DBに保存された既存の連携トークンが復号できなくなります。

---

## 🔄 4. データの流れと同期ポリシー

### 本番 → 検証への同期
安全な検証のため、以下の手順でデータの同期が行われます。
1. **バックアップ**: 本番 DB からダンプファイルを取得。
2. **転送・流し込み**: 検証環境の PostgreSQL コンテナへデータをリストア。
3. **匿名化 (Masking)**: 
   - `users` テーブルのメールアドレス、パスワード、トークンをダミーデータに置き換え。
   - セキュリティログや機密性の高いログテーブルをクリア。

### コードの反映フロー
1. `feature/*` で開発 (Local)
2. `dev` ブランチへマージ → 検証環境へデプロイ (Staging)
3. 動作確認後、`main` ブランチへマージ → 本番環境へデプロイ (Production)

---

## 🛠️ 5. メンテナンス・運用手順

### 検証環境 (Staging) の更新手順
検証サーバーで最新コードを反映する際の標準手順です：

```bash
# 1. 最新コードの取得とビルド
git pull origin dev
npm install
npm run build

# 2. Docker コンテナの再起動
docker compose up -d --build

# 3. マイグレーションの実行 (コンテナ内で実行)
docker compose exec app-staging npm run migrate
```

### 運用スクリプト
- `backup-db.sh`: 本番 DB のバックアップ取得。
- `sync-db.sh`: バックアップを検証環境へ反映。

---

> [!IMPORTANT]
> 検証環境で `ENOTFOUND db-staging` エラーが出る場合は、実行場所（ホストかコンテナ内か）と `.env` の `DB_HOST` 設定が一致しているか確認してください。
