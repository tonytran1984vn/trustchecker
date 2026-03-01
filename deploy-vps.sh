#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# TrustChecker v9.4 — VPS Production Deploy (Ubuntu/Debian)
# Usage:  curl -sSL <raw-github-url>/deploy-vps.sh | bash
#    or:  chmod +x deploy-vps.sh && ./deploy-vps.sh
# ═══════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# Must be root
[ "$(id -u)" -ne 0 ] && err "Run as root: sudo ./deploy-vps.sh"

APP_DIR="/opt/trustchecker"
DB_NAME="trustchecker"
DB_USER="trustchecker"
DB_PASS=$(openssl rand -hex 16)
DOMAIN=""

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  TrustChecker v9.4 — VPS Production Deploy               ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Domain name (e.g. trustchecker.example.com, leave empty for IP): " DOMAIN
read -p "Git repo URL (default: https://github.com/tonytran1984vn/trustchecker.git): " GIT_URL
GIT_URL=${GIT_URL:-https://github.com/tonytran1984vn/trustchecker.git}

# ─── 1. System packages ──────────────────────────────────────────────────────
info "Installing system packages..."
apt-get update -qq
apt-get install -y -qq curl git nginx ufw postgresql postgresql-contrib 2>&1 | tail -3
log "System packages installed"

# ─── 2. Node.js 22 via NodeSource ────────────────────────────────────────────
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
    info "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 2>&1 | tail -3
    apt-get install -y -qq nodejs 2>&1 | tail -2
fi
log "Node.js $(node -v)"

# PM2
if ! command -v pm2 &>/dev/null; then
    npm install -g pm2 2>&1 | tail -2
fi
log "PM2 $(pm2 -v)"

# ─── 3. PostgreSQL Setup ─────────────────────────────────────────────────────
info "Setting up PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create user and database
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
log "PostgreSQL: database '${DB_NAME}' ready"

# ─── 4. Clone & Install App ──────────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
    warn "Existing installation found at $APP_DIR"
    cd "$APP_DIR"
    git pull --ff-only 2>&1 | tail -3
else
    info "Cloning repo..."
    git clone "$GIT_URL" "$APP_DIR" 2>&1 | tail -3
    cd "$APP_DIR"
fi

info "Installing dependencies..."
npm ci --omit=dev 2>&1 | tail -3
log "Dependencies installed"

# ─── 5. Environment File ─────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 64)
ENC_KEY=$(openssl rand -hex 32)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

cat > "$APP_DIR/.env" <<EOF
# TrustChecker Production Environment — Auto-generated $(date)
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENC_KEY}
CORS_ORIGINS=http://localhost:3000$([ -n "$DOMAIN" ] && echo ",https://${DOMAIN},http://${DOMAIN}")
EOF
log ".env created"

# ─── 6. Database Migration & Seed ────────────────────────────────────────────
info "Running Prisma migrations..."
npx prisma generate 2>&1 | tail -2
npx prisma db push --accept-data-loss 2>&1 | tail -3
log "Schema deployed"

info "Seeding database..."
node server/seed.js 2>&1 | tail -10
[ -f sample-data-seed.js ] && node sample-data-seed.js 2>&1 | tail -5
log "Database seeded"

# ─── 7. Create directories ───────────────────────────────────────────────────
mkdir -p data uploads logs

# ─── 8. PM2 Setup ────────────────────────────────────────────────────────────
info "Starting with PM2..."
pm2 delete trustchecker 2>/dev/null || true
pm2 start ecosystem.config.js --env production 2>&1 | tail -5
pm2 save
pm2 startup systemd -u root --hp /root 2>&1 | tail -3
log "PM2 configured (auto-start on reboot)"

# ─── 9. Nginx Reverse Proxy ──────────────────────────────────────────────────
info "Configuring Nginx..."
SERVER_NAME="${DOMAIN:-_}"

cat > /etc/nginx/sites-available/trustchecker <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/trustchecker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t && systemctl reload nginx
log "Nginx configured"

# ─── 10. Firewall ────────────────────────────────────────────────────────────
ufw allow 'Nginx Full' 2>/dev/null || true
ufw allow OpenSSH 2>/dev/null || true
log "Firewall rules set"

# ─── 11. SSL (optional) ──────────────────────────────────────────────────────
if [ -n "$DOMAIN" ]; then
    echo ""
    read -p "Setup free SSL with Let's Encrypt? [Y/n]: " SSL_CHOICE
    SSL_CHOICE=${SSL_CHOICE:-Y}
    if [[ "$SSL_CHOICE" =~ ^[Yy]$ ]]; then
        apt-get install -y -qq certbot python3-certbot-nginx
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" 2>&1 | tail -5
        log "SSL certificate installed for ${DOMAIN}"
    fi
fi

# ─── Done! ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 TrustChecker Production Deploy Complete!              ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}App:${NC}       $APP_DIR"
echo -e "  ${CYAN}Database:${NC}  PostgreSQL (${DB_NAME})"
echo -e "  ${CYAN}DB Pass:${NC}   ${DB_PASS}"
echo -e "  ${CYAN}URL:${NC}       http://${DOMAIN:-$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')}"
echo ""
echo -e "  ${YELLOW}Management:${NC}"
echo -e "    pm2 status          # Check status"
echo -e "    pm2 logs            # View logs"
echo -e "    pm2 restart all     # Restart"
echo ""
echo -e "  ${CYAN}Default login:${NC}"
echo -e "    Email:    admin@trustchecker.io"
echo -e "    Password: admin123"
echo ""
echo -e "  ${RED}⚠️  IMPORTANT: Save your DB password: ${DB_PASS}${NC}"
echo -e "  ${RED}   Change default passwords immediately!${NC}"
echo ""
