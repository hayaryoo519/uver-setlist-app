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

# 2. 復元SQLは秘密値を含むため、本人だけが読める一時ファイルへ出力する。
umask 077
SYNC_SQL=$(mktemp)
cleanup() {
    rm -f -- "$SYNC_SQL"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

log_info "Starting DB sync process to ${STAGING_DB_NAME}..."

# 3. DBを変更する前に復元SQLを完成させ、生成失敗時は既存DBを維持する。
if ! zcat "$BACKUP_FILE" | pg_restore --exit-on-error --no-owner --no-privileges --file=- > "$SYNC_SQL"; then
    log_error "Restore SQL generation failed. Existing Staging database is unchanged."
    exit 1
fi

# 4. 復元と匿名化を同じトランザクションで実行するため、SQLを連結する。
cat >> "$SYNC_SQL" <<EOF
-- pg_restoreが空にした検索パスを、匿名化対象のpublicスキーマへ戻す。
SET search_path = pg_catalog, public;

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

-- 本番の外部連携情報を検証環境へ残さない（連携導入前のバックアップにも対応）
DO \$\$
DECLARE
    integration_table TEXT;
BEGIN
    FOREACH integration_table IN ARRAY ARRAY['user_spotify_tokens', 'user_google_tokens', 'playlist_history'] LOOP
        IF to_regclass('public.' || integration_table) IS NOT NULL THEN
            EXECUTE format('TRUNCATE TABLE public.%I', integration_table);
        END IF;
    END LOOP;
END;
\$\$;

-- 修正申請の自由入力・提案内容を匿名化
UPDATE corrections SET
    description = '（非公開）',
    suggested_data = NULL,
    admin_note = NULL;
EOF

# 5. 再作成は確実に成功した場合のみ先へ進む（接続中なら停止する）。
log_info "Dropping and creating Staging DB: ${STAGING_DB_NAME}..."
dropdb --if-exists "$STAGING_DB_NAME"
createdb "$STAGING_DB_NAME"

# 6. 別の接続へ未加工データを公開せず、匿名化まで成功してからコミットする。
log_info "Executing restore and anonymization in one transaction..."
if ! psql -X --set=ON_ERROR_STOP=1 --single-transaction --file="$SYNC_SQL" -d "$STAGING_DB_NAME"; then
    log_error "Restore or anonymization failed. Dropping database for safety."
    dropdb --if-exists "$STAGING_DB_NAME"
    exit 1
fi

log_info "Sync and Anonymization successfully completed."
