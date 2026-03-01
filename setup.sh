#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# TrustChecker v9.4 — One-Command Setup
# Usage:  chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════
set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  TrustChecker v9.4 — Automated Setup                     ${NC}"
echo -e "${CYAN}  Enterprise Digital Trust Infrastructure                  ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Check Prerequisites ──────────────────────────────────────────────────
info "Checking prerequisites..."

# Node.js
if ! command -v node &>/dev/null; then
    err "Node.js not found. Install Node.js 20+ from https://nodejs.org"
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    err "Node.js 18+ required (found v$(node -v))"
fi
log "Node.js $(node -v)"

# npm
if ! command -v npm &>/dev/null; then
    err "npm not found"
fi
log "npm $(npm -v)"

# ─── 2. Detect Database Mode ─────────────────────────────────────────────────
DB_MODE="sqlite"
USE_PG=false

# Check if PostgreSQL is available
if command -v psql &>/dev/null; then
    echo ""
    echo -e "${YELLOW}PostgreSQL detected. Choose database mode:${NC}"
    echo "  1) SQLite  (default — zero config, great for dev)"
    echo "  2) PostgreSQL (recommended for production)"
    echo ""
    read -p "Select [1/2] (default: 1): " DB_CHOICE
    if [ "$DB_CHOICE" = "2" ]; then
        USE_PG=true
        DB_MODE="postgresql"
    fi
fi

# ─── 3. Install Dependencies ─────────────────────────────────────────────────
info "Installing dependencies..."
npm install 2>&1 | tail -3
log "Dependencies installed"

# ─── 4. Setup Environment ────────────────────────────────────────────────────
if [ ! -f .env ]; then
    info "Creating .env from .env.example..."
    cp .env.example .env

    # Generate secure secrets
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "tc-dev-jwt-secret-$(date +%s)")
    ENC_KEY=$(openssl rand -hex 16 2>/dev/null || echo "tc-dev-encryption-key-32ch")

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/trustchecker-secret-key-DEV-ONLY/$JWT_SECRET/" .env
        sed -i '' "s/trustchecker-encryption-key-DEV-ONLY/$ENC_KEY/" .env
    else
        sed -i "s/trustchecker-secret-key-DEV-ONLY/$JWT_SECRET/" .env
        sed -i "s/trustchecker-encryption-key-DEV-ONLY/$ENC_KEY/" .env
    fi

    log ".env created with generated secrets"
else
    warn ".env already exists — skipping"
fi

# ─── 5. Setup Database ───────────────────────────────────────────────────────
if [ "$USE_PG" = true ]; then
    info "Setting up PostgreSQL database..."

    read -p "PostgreSQL host (default: localhost): " PG_HOST
    PG_HOST=${PG_HOST:-localhost}
    read -p "PostgreSQL port (default: 5432): " PG_PORT
    PG_PORT=${PG_PORT:-5432}
    read -p "PostgreSQL username (default: trustchecker): " PG_USER
    PG_USER=${PG_USER:-trustchecker}
    read -sp "PostgreSQL password: " PG_PASS
    echo ""
    read -p "Database name (default: trustchecker): " PG_DB
    PG_DB=${PG_DB:-trustchecker}

    DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

    # Try to create database if it doesn't exist
    if command -v createdb &>/dev/null; then
        PGPASSWORD="$PG_PASS" createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" 2>/dev/null || true
    fi

    # Update .env with DATABASE_URL
    if grep -q "^DATABASE_URL=" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
        else
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
        fi
    else
        echo "DATABASE_URL=${DATABASE_URL}" >> .env
    fi

    # Run Prisma migrations
    info "Running Prisma migrations..."
    npx prisma generate 2>&1 | tail -2
    npx prisma db push --accept-data-loss 2>&1 | tail -3
    log "PostgreSQL schema deployed"
else
    info "Using SQLite (file: ./data/trustchecker.db)"
    mkdir -p data
    log "SQLite ready (tables auto-created on first start)"
fi

# ─── 6. Seed Database ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Seed demo data? This creates sample products, users, scan events, etc.${NC}"
read -p "Seed now? [Y/n]: " SEED_CHOICE
SEED_CHOICE=${SEED_CHOICE:-Y}

if [[ "$SEED_CHOICE" =~ ^[Yy]$ ]]; then
    info "Seeding database..."
    node server/seed.js 2>&1
    log "Database seeded"

    # Run additional seed scripts if they exist
    if [ -f "sample-data-seed.js" ]; then
        info "Running extended data seed..."
        node sample-data-seed.js 2>&1 | tail -5
        log "Extended data seeded"
    fi
fi

# ─── 7. Create data directories ──────────────────────────────────────────────
mkdir -p data uploads logs
log "Data directories created"

# ─── 8. Done! ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 TrustChecker Setup Complete!                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Database:${NC}  $DB_MODE"
echo -e "  ${CYAN}Version:${NC}   $(node -e 'console.log(require("./package.json").version)')"
echo ""
echo -e "  ${YELLOW}▶ Start development server:${NC}"
echo -e "    npm run dev"
echo ""
echo -e "  ${YELLOW}▶ Start production server:${NC}"
echo -e "    npm start"
echo ""
echo -e "  ${YELLOW}▶ Start with PM2 (production):${NC}"
echo -e "    pm2 start ecosystem.config.js"
echo ""
echo -e "  ${YELLOW}▶ Start with Docker:${NC}"
echo -e "    docker compose up -d"
echo ""
echo -e "  ${CYAN}Default login:${NC}"
echo -e "    Email:    admin@trustchecker.io"
echo -e "    Password: admin123"
echo ""
echo -e "  ${CYAN}API URL:${NC}     http://localhost:4000"
echo -e "  ${CYAN}Dashboard:${NC}   http://localhost:4000"
echo ""
