#!/bin/bash
set -e

HOME_DIR="/home/haya-ryoo"
APP_PROD="$HOME_DIR/apps/uver-setlist-app"
APP_STAGING="$HOME_DIR/apps/uver-setlist-staging"

echo "--- Step 1: Prepare Staging (Docker) ---"
mkdir -p "$APP_STAGING"
# Move Docker files to staging area
cp "$HOME_DIR/Dockerfile" "$APP_STAGING/"
cp "$HOME_DIR/docker-compose.yml" "$APP_STAGING/"

# Sync source code for staging build
rsync -av --exclude 'node_modules' --exclude 'dist' --exclude '.git' "$APP_PROD/" "$APP_STAGING/"

echo "--- Step 2: Prepare Production Service (systemd) ---"
cat <<EOF > "$HOME_DIR/uver-app-prod.service"
[Unit]
Description=UVERworld Setlist App (Production)
After=network.target postgresql.service

[Service]
Type=simple
User=haya-ryoo
WorkingDirectory=$APP_PROD
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "--- Step 3: Prepare Backup Script ---"
mkdir -p "$HOME_DIR/scripts"
cat <<'EOF' > "$HOME_DIR/scripts/backup_prod_db.sh"
#!/bin/bash
BACKUP_DIR="/home/haya-ryoo/backups/production"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup Production Database (Host)
echo "Starting backup of production database..."
pg_dump -U haya-ryoo -h localhost -d uver_setlist_prod -f "$BACKUP_DIR/uver_prod_$DATE.sql"

# Keep only 7 days
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
echo "Backup saved: $BACKUP_DIR/uver_prod_$DATE.sql"
EOF
chmod +x "$HOME_DIR/scripts/backup_prod_db.sh"

echo "--- SETUP READY ---"
echo ""
echo "Final steps to run manually via sudo:"
echo "1. Setup systemd for Production:"
echo "   sudo mv ~/uver-app-prod.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable --now uver-app-prod"
echo ""
echo "2. Launch Staging via Docker:"
echo "   cd $APP_STAGING"
echo "   docker compose up -d --build"
echo ""
echo "3. Setup Cron for Production Backup:"
echo "   (crontab -l 2>/dev/null; echo \"0 3 * * * $HOME_DIR/scripts/backup_prod_db.sh\") | crontab -"
echo ""
echo "4. Cleanup old processes:"
echo "   pkill -f 'node server/index.js'"
