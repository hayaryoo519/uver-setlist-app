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
# ローカルバックアップの保持期間。既定は30日。
# リモート転送先のファイルはこのスクリプトでは削除しない。
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    log_error "BACKUP_RETENTION_DAYS must be a non-negative integer: $BACKUP_RETENTION_DAYS"
    exit 1
fi

# バックアップ成功後に呼び出す。削除失敗は警告に留め、処理を継続する。
cleanup_old_backups() {
    local current_backup="$1"
    local old_file

    log_info "Cleaning up local backups older than ${BACKUP_RETENTION_DAYS} days..."
    while IFS= read -r -d "" old_file; do
        if [[ "$old_file" == "$current_backup" || "$old_file" == "${current_backup}.sha256" ]]; then
            continue
        fi

        log_info "Deleting expired backup file: $old_file"
        if ! rm -f -- "$old_file"; then
            log_warn "Failed to delete expired backup file: $old_file"
        fi
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type f \
        \( -name "backup_*.dump.gz" -o -name "backup_*.dump.gz.sha256" \) \
        -mtime "+$BACKUP_RETENTION_DAYS" -print0)
}

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

# 4. 圧縮
log_info "Compressing backup file..."
gzip -f "$BACKUP_FILE"
FINAL_BACKUP="${BACKUP_FILE}.gz"
FINAL_BACKUP_NAME="$(basename "$FINAL_BACKUP")"
CHECKSUM_FILE="${FINAL_BACKUP}.sha256"
CHECKSUM_FILE_NAME="$(basename "$CHECKSUM_FILE")"

# 5. 圧縮後ファイルのチェックサム生成
# 保存先に依存せず検証できるよう、チェックサムにはファイル名だけを記録する。
log_info "Generating SHA256 checksum for compressed backup..."
(
    cd "$BACKUP_DIR"
    sha256sum "$FINAL_BACKUP_NAME" > "$CHECKSUM_FILE_NAME"
)

# 6. 外部転送 (rsync)
if [ -n "$REMOTE_BACKUP_SERVER" ]; then
    log_info "Transferring backup to remote server: ${REMOTE_BACKUP_SERVER}"
    # 転送先ディレクトリの作成
    ssh "$REMOTE_BACKUP_SERVER" "mkdir -p -- '$REMOTE_BACKUP_PATH'"
    # バックアップ本体とチェックサムを転送
    if ! rsync -avz "$FINAL_BACKUP" "$CHECKSUM_FILE" "${REMOTE_BACKUP_SERVER}:${REMOTE_BACKUP_PATH}"; then
        log_error "Remote transfer failed."
        notify_error "Remote transfer failed"
        exit 1
    fi
    log_info "Transfer completed successfully."

    # 転送先でチェックサムを検証。失敗時は世代管理へ進まない。
    log_info "Verifying transferred backup checksum..."
    if ! ssh "$REMOTE_BACKUP_SERVER" "cd '$REMOTE_BACKUP_PATH' && sha256sum -c '$CHECKSUM_FILE_NAME'"; then
        log_error "Remote checksum verification failed."
        notify_error "Remote checksum verification failed"
        exit 1
    fi
    log_info "Remote checksum verification completed successfully."
fi

# 7. ローカルバックアップの世代管理
cleanup_old_backups "$FINAL_BACKUP"

log_info "Backup process successfully finished: ${FINAL_BACKUP}"
