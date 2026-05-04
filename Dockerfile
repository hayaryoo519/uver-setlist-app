# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# ビルド時引数として環境変数を受け取る
ARG VITE_APP_ENV=production
ARG NODE_ENV=production

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps

# Copy source and build frontend
COPY . .

# ビルド時に環境変数を設定
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV NODE_ENV=${NODE_ENV}

RUN npm run build

# Runner stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# server 専用の依存関係をインストール
RUN cd server && npm install --production

EXPOSE 8000

CMD ["node", "server/index.js"]
