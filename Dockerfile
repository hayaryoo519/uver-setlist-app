# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build frontend
COPY . .
RUN npm run build

# Runner stage
FROM node:20-slim

WORKDIR /app

# Install production dependencies only if possible, or just copy from builder
COPY --from=builder /app/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8000

CMD ["node", "server/index.js"]
