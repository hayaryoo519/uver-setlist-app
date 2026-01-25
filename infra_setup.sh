#!/bin/bash
set -e

HOME_DIR="/home/haya-ryoo"
APP_PROD="$HOME_DIR/apps/uver-setlist-app"
APP_STAGING="$HOME_DIR/apps/uver-setlist-staging"

echo "--- Step 1: Clone Production to Staging ---"
if [ ! -d "$APP_STAGING" ]; then
    echo "Cloning $APP_PROD to $APP_STAGING..."
    cp -r "$APP_PROD" "$APP_STAGING"
else
    echo "Staging directory already exists."
fi

echo "--- Step 2: Configure Staging Environment ---"
# Create staging .env with Port 9000 and Staging DB
cat <<EOF > "$APP_STAGING/server/.env"
VITE_API_URL=http://192.168.0.13:9000
DB_NAME=uver_setlist_staging
DB_USER=haya-ryoo
DB_PASSWORD='A1oaulth!'
DB_HOST=localhost
DB_PORT=5432

# Security
JWT_SECRET=super_secret_jwt_key_uver_setlis
EOF
echo "Staging .env created."

echo "--- Step 3: Prepare systemd Service Files ---"
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

cat <<EOF > "$HOME_DIR/uver-app-staging.service"
[Unit]
Description=UVERworld Setlist App (Staging)
After=network.target postgresql.service

[Service]
Type=simple
User=haya-ryoo
WorkingDirectory=$APP_STAGING
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=staging

[Install]
WantedBy=multi-user.target
EOF
echo "Service files prepared in $HOME_DIR."

echo "--- Step 4: Prepare Backup Script ---"
mkdir -p "$HOME_DIR/scripts"
cat <<'EOF' > "$HOME_DIR/scripts/backup_db.sh"
#!/bin/bash
BACKUP_DIR="/home/haya-ryoo/backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup Production
echo "Starting backup of uver_setlist_prod..."
pg_dump -U haya-ryoo -h localhost -d uver_setlist_prod -f "$BACKUP_DIR/uver_prod_$DATE.sql"

# Cleanup old backups (7 days)
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
echo "Backup completed: $BACKUP_DIR/uver_prod_$DATE.sql"
EOF
chmod +x "$HOME_DIR/scripts/backup_db.sh"
echo "Backup script created in $HOME_DIR/scripts/."

echo "--- SETUP LOGIC COMPLETED ---"
echo ""
echo "Please run the following commands on the server to finalize:"
echo "1. Create Staging DB:"
echo "   sudo -u postgres psql -c 'CREATE DATABASE uver_setlist_staging OWNER \"haya-ryoo\";'"
echo "   sudo -u postgres psql -d uver_setlist_staging -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"haya-ryoo\";'"
echo "2. Install systemd services:"
echo "   sudo mv ~/uver-app-prod.service /etc/systemd/system/"
echo "   sudo mv ~/uver-app-staging.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable --now uver-app-prod"
echo "   sudo systemctl enable --now uver-app-staging"
echo "3. Setup Cron for backup (Run this as haya-ryoo):"
echo "   (crontab -l 2>/dev/null; echo \"0 3 * * * $HOME_DIR/scripts/backup_db.sh\") | crontab -"
echo ""
echo "Note: I will try to run Step 3 for you if possible."
