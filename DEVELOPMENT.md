# 開発者ガイド (UVERworld Setlist Archive)

このドキュメントは、アプリケーションの開発・テストを行うための情報をまとめたものです。

---

## 🌎 環境構成

このプロジェクトには3つの独立した環境があります。

| 環境 | 用途 | URL | データベース | ポート |
|:---|:---|:---|:---|:---|
| **ローカル (Local)** | 日常の開発 | http://localhost:8000 | Docker Supabase | 54332 |
| **検証 (Staging)** | 本番反映前のテスト | http://<staging-server>:9001 | Docker PostgreSQL | 54325 |
| **本番 (Production)** | ユーザー向け稼働 | https://uver-setlist-archive.org | Host PostgreSQL | 5432 |

> [!CAUTION]
> **本番データベース (Production) の直接操作は厳禁です。** データの変更は必ずローカルまたは検証環境で行ってください。

---

## 💻 1. ローカル開発環境のセットアップ

Windows PC上でDockerを使用して開発環境を構築します。

### 必要要件
- Docker Desktop
- Node.js (v18+)

### 起動方法
通常は `npm run dev` で開発サーバーとバックエンドの両方が起動します。

```powershell
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### データベース (PostgreSQL)
ローカルDBはプロジェクト専用の Docker コンテナ (`docker-compose.local.yml`) として動作します。

#### 初回セットアップ

```powershell
# 1. コンテナ起動
docker compose -f docker-compose.local.yml up -d

# 2. 全テーブルを作成（migrations/ を順番に適用）
cd server
npm run migrate

# 3. テストデータ投入
node scripts/seed_local.js
```

#### 接続情報 (`server/.env`)

- Host: `localhost`
- Port: `54332`
- User: `postgres`
- Pass: `postgres`
- DB: `uver_app_db`

#### 日常操作

```powershell
docker compose -f docker-compose.local.yml up -d    # 起動
docker compose -f docker-compose.local.yml stop     # 一時停止
docker compose -f docker-compose.local.yml down     # 完全停止（データ保持）
```

---

## 🔄 2. 開発ワークフロー & Git運用

安全なデプロイのため、以下のルールに従って開発を行ってください。

### ブランチ戦略
| ブランチ | 用途 | デプロイ先 |
|:---|:---|:---|
| **`feature/xxx`** | 機能追加・修正作業 | ローカルで確認 |
| **`dev`** | 開発版の統合 | 検証環境 (Port 9000) |
| **`main`** | 本番リリース | 本番環境 (Port 8000) |

### 開発サイクル
1. **作業開始**: `dev` から新ブランチを作成 (`git checkout -b feature/new-page`)
2. **実装**: ローカル (`npm run dev`) で動作確認しながらコーディング
3. **PR/マージ**: 作業完了後、`dev` ブランチへマージしてプッシュ
4. **検証**: 自動デプロイされた検証環境で動作チェック
5. **リリース**: 問題なければ `dev` を `main` にマージして本番反映

### 🚫 禁止事項
- **サーバー上での直接ファイル編集**: コンフリクトの原因になります。必ずローカルで編集してプッシュしてください。
- **検証なしの本番反映**: 必ずStaging環境を通してください。

---

## 🛠 トラブルシューティング

### ローカルでデータが表示されない
Dockerコンテナが起動していない可能性があります。
```powershell
docker compose -f docker-compose.local.yml ps
# 起動していない場合
docker compose -f docker-compose.local.yml up -d
```

### ビルドエラーになるが dev では動く
`npm run build` は構文チェックが厳格です。重複したCSSプロパティや unused variable がないか確認してください。

### 新しいパッケージを入れたらエラー
サーバー側の `package.json` が更新されていない可能性があります。デプロイ時に `npm install` が走るようになっていますが、念のため確認してください。
