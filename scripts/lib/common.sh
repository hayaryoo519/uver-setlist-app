#!/bin/bash
# common.sh - 共通ユーティリティライブラリ

set -euo pipefail

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログ出力
log_info() {
    echo -e "${GREEN}[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" >&2
}

# 通知 (Discord Webhook)
notify_error() {
    local message="$1"
    if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        curl -H "Content-Type: application/json" -X POST -d "{\"content\": \"❌ **DB Operation Failed!**\nEnvironment: ${APP_ENV:-unknown}\nMessage: ${message}\"}" "$DISCORD_WEBHOOK_URL" || log_error "Failed to send notification"
    fi
}

# 環境ガード
# $1: 操作の性質 ("destructive" を指定すると本番での実行を拒否)
check_env_safety() {
    local target_db_host="${PGHOST:-${DB_HOST:-}}"
    local target_db_port="${PGPORT:-${DB_PORT:-}}"
    local target_db_name="${PGDATABASE:-${STAGING_DB_NAME:-${DB_NAME:-}}}"
    local prod_db_host="${PROD_DB_HOST:-prod-db.uver-setlist-archive.org}"
    local prod_db_port="${PROD_DB_PORT:-5432}"
    local prod_db_name="${PROD_DB_NAME:-uver_setlist_prod}"

    # 破壊的操作を行う場合の追加チェック
    if [[ "${1:-}" == "destructive" ]]; then
        if [[ "${APP_ENV:-}" == "production" ]] \
            || [[ "$target_db_host" == "$prod_db_host" ]] \
            || [[ "$target_db_name" == "$prod_db_name" ]] \
            || [[ "$target_db_host" == "127.0.0.1" && "$target_db_port" == "$prod_db_port" && "$target_db_name" != "uver_setlist_staging" ]]; then
            log_error "Destructive operation blocked on PRODUCTION environment/database!"
            notify_error "Destructive operation blocked on Production."
            exit 1
        fi
    fi
}

# ディスク容量チェック (1GB閾値)
check_disk_space() {
    local backup_dir="$1"
    # ディレクトリが存在しない場合は作成を試みる
    mkdir -p "$backup_dir"
    local available_kb=$(df -k "$backup_dir" | awk 'NR==2 {print $4}')
    local threshold_kb=1048576 # 1GB

    if [ "$available_kb" -lt "$threshold_kb" ]; then
        log_error "Insufficient disk space on $backup_dir (Available: $((available_kb / 1024))MB)"
        notify_error "Disk space critical: $((available_kb / 1024))MB available."
        exit 1
    fi
}
