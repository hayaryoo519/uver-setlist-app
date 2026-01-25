#!/bin/bash
TARGET_DIR="apps/uver-setlist-app/server"
ENV_FILE="$TARGET_DIR/.env"

# Create .env file with correct production settings
cat <<EOF > "$ENV_FILE"
VITE_API_URL=http://192.168.0.13:8000
DB_NAME=uver_setlist_prod
DB_USER=haya-ryoo
DB_PASSWORD='A1oaulth!'
DB_HOST=localhost
DB_PORT=5432

# Security
JWT_SECRET=super_secret_jwt_key_uver_setlis
EOF

# Ensure helmet and other deps are relaxed for HTTP if needed (already done in code but just in case)
# Ensure any other env vars are here if needed

# Restart the server
pkill -f 'node server/index.js'
sleep 1
cd apps/uver-setlist-app
nohup node server/index.js > server.log 2>&1 &
echo "Server restarted with PID: $!"
