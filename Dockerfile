# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# ビルド時引数として環境変数を受け取る
ARG VITE_APP_ENV=production
ARG NODE_ENV=production

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --include=dev --legacy-peer-deps

# Copy source and build frontend
COPY . .

# ビルド時に環境変数を設定
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV NODE_ENV=${NODE_ENV}

RUN npm run build

# Runner stage
FROM node:20-slim

WORKDIR /app

# X セトリ収集で使う twitter-cli (Python製)。
# Debian の PEP 668 を避けるため専用の venv に隔離する。
# server/scripts/twitter-search.py が TWITTER_CLI_PYTHON 経由でこの venv を使う。
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/twitter-cli \
    && /opt/twitter-cli/bin/pip install --no-cache-dir twitter-cli \
    && mkdir -p /var/backups/postgres

ENV TWITTER_CLI_PYTHON=/opt/twitter-cli/bin/python3
ENV TWITTER_CLI_BIN=/app/server/scripts/twitter-search.py

# Install production dependencies for the runtime image.
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# server 専用の依存関係をインストール
RUN cd server && npm ci --omit=dev

EXPOSE 8000

CMD ["node", "server/index.js"]
