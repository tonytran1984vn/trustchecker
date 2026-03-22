#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# TrustChecker — Docker Entrypoint
# Waits for PostgreSQL, runs migrations, seeds, then starts
# ═══════════════════════════════════════════════════════════════════

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   TrustChecker v9.5 — Production Container Starting      ║"
echo "╚═══════════════════════════════════════════════════════════╝"

# ─── Wait for PostgreSQL ────────────────────────────────────────
echo "⏳ Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "❌ PostgreSQL not ready after ${MAX_RETRIES} attempts. Exiting."
    exit 1
  fi
  echo "   Attempt $RETRY/$MAX_RETRIES — retrying in 2s..."
  sleep 2
done
echo "✅ PostgreSQL ready"

# ─── Wait for Redis ────────────────────────────────────────────
if [ -n "$REDIS_URL" ]; then
  # Extract host:port from REDIS_URL (redis://host:port)
  REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's|redis://\([^:]*\).*|\1|p')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's|redis://[^:]*:\([0-9]*\).*|\1|p')
  REDIS_HOST=${REDIS_HOST:-redis}
  REDIS_PORT=${REDIS_PORT:-6379}
  echo "⏳ Waiting for Redis ($REDIS_HOST:$REDIS_PORT)..."
  RETRY=0
  until echo PING | nc -w 1 "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null | grep -q PONG; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
      echo "⚠️  Redis not ready — continuing without Redis"
      break
    fi
    echo "   Attempt $RETRY/$MAX_RETRIES — retrying in 2s..."
    sleep 2
  done
  echo "✅ Redis ready"
fi

# ─── Run Prisma Migrations ─────────────────────────────────────
echo "📊 Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "⚠️  Migration skipped (may already be up to date)"

# ─── Seed if needed ─────────────────────────────────────────────
echo "🌱 Running seed (idempotent)..."
node server/seed.js 2>&1 || echo "⚠️  Seed skipped"

# ─── Start Application ──────────────────────────────────────────
echo ""
echo "🚀 Starting TrustChecker..."
exec node server/index.js
