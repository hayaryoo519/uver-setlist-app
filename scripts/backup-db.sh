#!/bin/bash
# backup-db.sh - プロフェッショナル仕様のDBバックアップスクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 共通ライブラリの読み込み
if [ -f "${SCRIPT_DIR}/lib/common.sh" ]; then
    source "${SCRIPT_DIR}/lib/common.sh"
else
    echo "Error: common.sh not found."
    exit 1
fi

# 設定（環境変数で上書き可能）
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
DB_NAME="${DB_NAME:-uver_setlist_prod}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"
REMOTE_BACKUP_SERVER="${REMOTE_BACKUP_SERVER:-}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/backups/$(date +%Y-%m-%d)/}"

# ロック制御
LOCK_FILE="/tmp/db_backup.lock"
exec 200>"$LOCK_FILE"
flock -n 200 || { log_error "Another backup process is already running."; exit 1; }
trap 'rm -f "$LOCK_FILE"' EXIT

log_info "Starting DB backup for ${DB_NAME}..."

# 1. 準備チェック
# DBの稼働確認
pg_isready -d "$DB_NAME" || { log_error "Database ${DB_NAME} is not ready."; notify_error "DB not ready"; exit 1; }
# ディスク容量確認 (1GB)
check_disk_space "$BACKUP_DIR"

# 2. pg_dump 実行 (Custom format: -Fc)
log_info "Executing pg_dump (Custom format)..."
if ! pg_dump -Fc -d "$DB_NAME" -f "$BACKUP_FILE"; then
    log_error "pg_dump failed."
    notify_error "pg_dump failed"
    exit 1
fi

# 3. 整合性検証 (軽量チェック)
log_info "Verifying dump file structure (pg_restore --list)..."
if ! pg_restore --list "$BACKUP_FILE" > /dev/null; then
    log_error "Dump file is corrupted (verification failed)."
    notify_error "Dump verification failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 4. チェックサム生成
log_info "Generating SHA256 checksum..."
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"

# 5. 圧縮
log_info "Compressing backup file..."
gzip -f "$BACKUP_FILE"
FINAL_BACKUP="${BACKUP_FILE}.gz"

# 6. 外部転送 (rsync)
if [ -n "$REMOTE_BACKUP_SERVER" ]; then
    log_info "Transferring backup to remote server: ${REMOTE_BACKUP_SERVER}"
    # 転送先ディレクトリの作成
    ssh "$REMOTE_BACKUP_SERVER" "mkdir -p $REMOTE_BACKUP_PATH"
    # チェックサム検証付き転送を模した rsync
    if ! rsync -avz "$FINAL_BACKUP" "${BACKUP_FILE}.sha256" "${REMOTE_BACKUP_SERVER}:${REMOTE_BACKUP_PATH}"; then
        log_error "Remote transfer failed."
        notify_error "Remote transfer failed"
        exit 1
    fi
    log_info "Transfer completed successfully."
fi

log_info "Backup process successfully finished: ${FINAL_BACKUP}"
