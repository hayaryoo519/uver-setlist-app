# 環境・データベース仕様書 (Environment & Database Specifications)

UVERworld Setlist Archive の稼働環境と、それぞれのデータベース構成についてまとめます。

## 🌎 1. 環境一覧

このプロジェクトは、開発・検証・運用のために3つの独立した環境で構成されています。

| 環境名 | 用途 | アクセスURL | データベース | DBポート | DB名 | ブランチ |
|:---|:---|:---|:---|:---|:---|:---|
| **ローカル (Local)** | 個人開発・機能実装 | `http://localhost:8000` | Docker Supabase | `54332` | `uver_app_db` | `feature/*` |
| **検証 (Staging)** | 統合テスト・検証 | `http://192.168.0.13:9001` | Docker PostgreSQL | `54325` | `uver_setlist_staging` | `dev` |
| **本番 (Production)** | ユーザー向け公開 | `https://uver-setlist-archive.org` | Host PostgreSQL | `5432` | `uver_setlist_prod` | `main` |

---

## 🗄️ 2. データベース詳細

### 🏠 ローカル環境 (Local)
- **構成**: Docker Desktop 上で動作する Supabase コンテナ (`supabase_db_marumie`) を使用。
- **特徴**: 手軽に起動・リセットが可能。開発者ごとに独立したデータを持ちます。
- **管理**: `server/.env` の `DB_HOST=localhost`, `DB_PORT=54332` で接続。

### 🧪 検証環境 (Staging)
- **構成**: サーバー (`192.168.0.13`) 上の Docker コンテナとして動作。
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
