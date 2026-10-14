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
# DB名をlibpq接続文字列やCLIオプションとして解釈させない。
if [[ ! "$STAGING_DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
    log_error "STAGING_DB_NAME must be a simple SQL identifier, not a connection string."
    exit 1
fi
if [[ ! "${PGHOST:-}" =~ ^[A-Za-z0-9._:-]+$ ]] || [[ ! "${PGPORT:-}" =~ ^[0-9]{1,5}$ ]] || (( 10#$PGPORT < 1 || 10#$PGPORT > 65535 )); then
    log_error "Set explicit PGHOST (single TCP host) and PGPORT before syncing."
    exit 1
fi
# ガードで確認した接続先を、別のlibpq設定から暗黙に変更させない。
unset PGSERVICE PGSERVICEFILE PGHOSTADDR
export PGPORT=$((10#$PGPORT))
export PGDATABASE="$STAGING_DB_NAME"
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

# 復元と匿名化の間は生データが存在する。公開停止とバックグラウンド処理停止を必須にする。
# この確認はサービスを自動停止しない。失敗時も自動再開しない。
if [ "${STAGING_OFFLINE_ACK:-}" != "1" ]; then
    log_error "Stop Staging access and background workers first; set STAGING_OFFLINE_ACK=1 to confirm."
    exit 1
fi
ANONYMIZATION_SQL="${SCRIPT_DIR}/sync/anonymize.sql"
if [ ! -f "$ANONYMIZATION_SQL" ]; then
    log_error "Anonymization SQL not found. Sync aborted before database changes."
    exit 1
fi

# set -eやシグナルでも未匿名化DBを放置しない。解除/サービス再開は運用者が成功確認後に行う。
database_created=false
sync_completed=false
cleanup() {
    local status=$?
    trap - EXIT INT TERM
    if [ "$database_created" = true ] && [ "$sync_completed" != true ]; then
        log_error "Sync incomplete. Dropping database to prevent raw data exposure."
        if ! dropdb --if-exists --force "$STAGING_DB_NAME"; then
            log_error "SAFETY CLEANUP FAILED: raw data may remain. Keep Staging offline and remove the database manually."
        fi
    fi
    log_info "Staging services/access are not restarted by this script."
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

log_info "Starting DB sync process to ${STAGING_DB_NAME} (Staging must remain offline)..."

# DB再初期化。削除できない既存DBへの上書きは行わない。
if ! dropdb --if-exists "$STAGING_DB_NAME"; then
    log_error "Could not drop Staging DB. Stop all connections before retrying."
    exit 1
fi
if ! createdb "$STAGING_DB_NAME"; then
    log_error "Could not create Staging DB."
    exit 1
fi
database_created=true

log_info "Importing data from ${BACKUP_FILE}..."
if ! zcat "$BACKUP_FILE" | pg_restore --exit-on-error --single-transaction --no-owner --no-privileges -d "$STAGING_DB_NAME"; then
    log_error "Import failed."
    exit 1
fi

# SQLエラーで必ず失敗させる。既存のpsqlrcは読まず、全匿名化を単一トランザクションで適用する。
log_info "Executing anonymization queries for privacy..."
if ! psql -X --set=ON_ERROR_STOP=1 --single-transaction -d "$STAGING_DB_NAME" -f "$ANONYMIZATION_SQL"; then
    log_error "Anonymization failed."
    exit 1
fi
sync_completed=true
log_info "Sync and Anonymization successfully completed. Run migrations before reopening Staging."
