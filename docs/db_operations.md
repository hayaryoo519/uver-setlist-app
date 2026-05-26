# データベース運用・同期マニュアル

本ドキュメントでは、本番環境のデータを安全にバックアップし、検証環境（Docker）へ同期する手順を説明します。

## 1. 本番データのバックアップ取得

本番環境（`~/apps/uver-setlist-app`）で、カスタム形式（`-Fc`）のバックアップを取得します。

```bash
# スクリプトを実行
./scripts/backup-db.sh
```

- **出力先**: `backups/backup_YYYYMMDD_HHMMSS.dump.gz`
- **特徴**: データの整合性チェックサム（sha256）の生成と、gzip圧縮が自動で行われます。

---

## 2. 検証環境（Docker）への同期

本番のバックアップファイルを、検証環境の PostgreSQL コンテナに流し込みます。

### 実行コマンド
本番環境のディレクトリ（スクリプトがある場所）で、環境変数を指定して実行します。

```bash
STAGING_DB_NAME=uver_setlist_staging \
PGHOST=127.0.0.1 \
PGPORT=54325 \
PGUSER=postgres \
PGPASSWORD=postgres \
./scripts/sync-db.sh ./backups/backup_YYYYMMDD_HHMMSS.dump.gz
```

### 注意点・工夫したポイント
- **所有者エラーの回避**: `pg_restore` に `--no-owner --no-privileges` を使用しているため、本番（`<server-user>`）と検証（`postgres`）でユーザー名が異なっていても同期可能です。
- **TCP接続の強制**: `PGHOST=127.0.0.1` を指定することで、Dockerのポートマッピング経由での接続を確実にします。
- **自動匿名化**: 同期完了後、以下の処理が自動で実行されます。
  - `users` テーブルのメールアドレス・ユーザー名・パスワード・検証/リセットトークンのダミー化。
  - `corrections` テーブルの自由入力・提案内容・管理者メモの匿名化。
  - `security_logs`, `push_subscriptions`, `collector_logs` 等の機密テーブルのクリア。

---

## 3. スキーマ（テーブル構造）の最新化

検証環境が本番より進んでいる（新しい機能の開発中）場合、同期した本番データには新しいテーブルが存在しません。
同期完了後、必ずマイグレーションを実行してください。

```bash
# 検証環境のディレクトリ（~/apps/uver-setlist-staging）で実行
docker compose exec app-staging npm run migrate
```

- **重要**: これを行わないと、新機能（例: `predictions` テーブルなど）にアクセスする際に API が 500/404 エラーを返します。

---

## 4. メンテナンスモード

現時点の `scripts/sync-db.sh` は、メンテナンスモード切替用の `trap` とログ出力のみを持ち、実際のアクセス制限や告知表示は未実装です。同期中に外部アクセスを止める必要がある場合は、事前に Staging 側の公開停止・Basic認証・メンテナンス表示などを別途設定してください。
