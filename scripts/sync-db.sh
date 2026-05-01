#!/bin/bash
# sync-db.sh - プロフェッショナル仕様のDB同期スクリプト (Prod -> Staging)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 共通ライブラリの読み込み
if [ -f "${SCRIPT_DIR}/lib/common.sh" ]; then
    source "${SCRIPT_DIR}/lib/common.sh"
else
    echo "Error: common.sh not found."
    exit 1
fi

# 設定
STAGING_DB_NAME="${STAGING_DB_NAME:-uver_setlist_staging}"
BACKUP_FILE="${1:-}" # コマンドライン引数からバックアップファイルを指定

# 1. 二段階 Safety Guard
log_info "Verifying execution environment..."
# APP_ENV が production でないこと、かつ接続先が本番でないことを確認
check_env_safety "destructive"

if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: $0 <path_to_backup_file.dump.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# 2. リカバリ設定
# 異常終了時にメンテナンスモード解除などを確実に行うための trap
# (実際のメンテナンスモード切替コマンドは環境に合わせて実装)
cleanup() {
    log_info "Cleaning up and disabling maintenance mode (if enabled)..."
    # ここにメンテナンス解除コマンドを記述
}
trap cleanup EXIT INT TERM

log_info "Starting DB sync process to ${STAGING_DB_NAME}..."

# 3. メンテナンスモード開始 (仮想)
log_info "Switching Staging environment to Maintenance Mode..."
# 例: ssh staging-server "touch /tmp/maintenance.lock"

# 4. DB再初期化とインポート
log_info "Dropping and creating Staging DB: ${STAGING_DB_NAME}..."
dropdb --if-exists "$STAGING_DB_NAME" || log_warn "Failed to drop DB (maybe in use)"
createdb "$STAGING_DB_NAME"

log_info "Importing data from ${BACKUP_FILE}..."
# 圧縮ファイルを解凍しながら pg_restore
zcat "$BACKUP_FILE" | pg_restore -d "$STAGING_DB_NAME" || {
    log_error "Import failed. Dropping inconsistent database to prevent raw data exposure."
    dropdb --if-exists "$STAGING_DB_NAME"
    exit 1
}

# 5. 匿名化処理 (Anonymization)
log_info "Executing anonymization queries for privacy..."
psql -d "$STAGING_DB_NAME" <<EOF
-- ユーザー情報の匿名化
UPDATE users SET 
    email = 'dummy_' || id || '@example.com',
    username = 'user_' || id,
    password = 'anonymized_hash',
    verification_token = NULL,
    reset_password_token = NULL,
    reset_password_expires = NULL;

-- セキュリティログ、プッシュ通知設定、生ログのクリア
TRUNCATE TABLE security_logs CASCADE;
TRUNCATE TABLE push_subscriptions CASCADE;
TRUNCATE TABLE collector_logs CASCADE;

-- 修正申請などの自由入力項目があればクリア (テーブルが存在する場合のみ)
DO \$\$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'corrections' AND column_name = 'comment') THEN
        UPDATE corrections SET comment = '（非公開）';
    END IF;
END \$\$;
EOF

if [ $? -ne 0 ]; then
    log_error "Anonymization failed. Dropping database for safety."
    dropdb --if-exists "$STAGING_DB_NAME"
    exit 1
fi

log_info "Sync and Anonymization successfully completed."
