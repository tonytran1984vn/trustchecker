# ═══════════════════════════════════════════════════════════════════
# TrustChecker v9.5 — Production Dockerfile
# Multi-stage build: deps → production
# ═══════════════════════════════════════════════════════════════════

# ─── Stage 1: Install dependencies ──────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: Production image ──────────────────────────────────
FROM node:22-alpine AS production

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init curl

# Security: run as non-root user
RUN addgroup -g 1001 -S trustchecker && \
    adduser -S trustchecker -u 1001 -G trustchecker

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY server/ ./server/
COPY client/ ./client/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Create required directories with correct permissions
RUN mkdir -p /app/uploads /app/data/evidence /app/logs && \
    chown -R trustchecker:trustchecker /app

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER trustchecker

EXPOSE 4000

# Health check — matches actual endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:4000/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/docker-entrypoint.sh"]
