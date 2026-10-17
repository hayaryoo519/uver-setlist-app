#!/bin/bash
# Prod backup -> owned Staging target only. No automatic service restart.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/common.sh" ]; then
    source "${SCRIPT_DIR}/lib/common.sh"
else
    echo "Error: common.sh not found."
    exit 1
fi
STAGING_DB_NAME="${STAGING_DB_NAME:-uver_setlist_staging}"
if [[ ! "$STAGING_DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
    log_error "STAGING_DB_NAME must be a simple SQL identifier, not a connection string."
    exit 1
fi
if [[ ! "${PGHOST:-}" =~ ^[A-Za-z0-9._:-]+$ ]] || [[ ! "${PGPORT:-}" =~ ^[0-9]{1,5}$ ]] || (( 10#$PGPORT < 1 || 10#$PGPORT > 65535 )); then
    log_error "Set explicit PGHOST (single TCP host) and PGPORT before syncing."
    exit 1
fi
unset PGSERVICE PGSERVICEFILE PGHOSTADDR
export PGPORT=$((10#$PGPORT))
export PGDATABASE="$STAGING_DB_NAME"
BACKUP_FILE="${1:-}"
check_env_safety "destructive"
if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: $0 <path_to_backup_file.dump.gz>"
    exit 1
fi
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi
if [ "${STAGING_OFFLINE_ACK:-}" != "1" ]; then
    log_error "Stop Staging access and background workers first; set STAGING_OFFLINE_ACK=1 to confirm."
    exit 1
fi
ANONYMIZATION_SQL="${SCRIPT_DIR}/sync/anonymize.sql"
if [ ! -f "$ANONYMIZATION_SQL" ]; then
    log_error "Anonymization SQL not found. Sync aborted before database changes."
    exit 1
fi
# devの保護を維持: SQL生成完了まで既存DBを変更せず、復元/匿名化を1 transactionにする。
umask 077
SYNC_SQL=""
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
    if [ -n "$SYNC_SQL" ]; then
        if ! rm -f -- "$SYNC_SQL"; then
            log_error "PRIVATE SQL CLEANUP FAILED: keep Staging offline and remove the private SQL file manually."
            status=1
        fi
    fi
    log_info "Staging services/access are not restarted by this script."
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
SYNC_SQL=$(mktemp)
if ! zcat "$BACKUP_FILE" | pg_restore --exit-on-error --no-owner --no-privileges --file=- > "$SYNC_SQL"; then
    log_error "Restore SQL generation failed. Existing Staging database is unchanged."
    exit 1
fi
printf '\nSET search_path = pg_catalog, public;\n' >> "$SYNC_SQL"
cat "$ANONYMIZATION_SQL" >> "$SYNC_SQL"
log_info "Starting DB sync process to ${STAGING_DB_NAME} (Staging must remain offline)..."
if ! dropdb --if-exists "$STAGING_DB_NAME"; then
    log_error "Could not drop Staging DB. Stop all connections before retrying."
    exit 1
fi
if ! createdb "$STAGING_DB_NAME"; then
    log_error "Could not create Staging DB."
    exit 1
fi
database_created=true
if ! psql -X --set=ON_ERROR_STOP=1 --single-transaction --file="$SYNC_SQL" -d "$STAGING_DB_NAME"; then
    log_error "Restore or anonymization failed."
    exit 1
fi
sync_completed=true
log_info "Sync and Anonymization successfully completed. Run migrations before reopening Staging."
