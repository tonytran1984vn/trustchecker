# TrustChecker — VPS Deployment Guide

> Hướng dẫn cài đặt TrustChecker v9.4 trên VPS từ đầu.
> Stack: **Node.js 20 + PostgreSQL 16 + Nginx + PM2**

---

## 1. Yêu Cầu Hệ Thống

| Component | Minimum |
|-----------|---------|
| OS | Debian 12 / Ubuntu 22.04+ |
| Node.js | v20.x LTS |
| PostgreSQL | 15+ |
| RAM | 512MB+ |
| Disk | 10GB+ |
| Port | 4000 (app), 80/443 (nginx) |

---

## 2. Cài Đặt Dependencies

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Nginx + PM2
apt install -y nginx
npm install -g pm2
```

---

## 3. Setup PostgreSQL

```bash
# Tạo user + database
sudo -u postgres psql << SQL
CREATE USER trustchecker WITH PASSWORD 'YOUR_DB_PASSWORD';
CREATE DATABASE trustchecker OWNER trustchecker;
GRANT ALL PRIVILEGES ON DATABASE trustchecker TO trustchecker;
SQL

# Test kết nối
psql -U trustchecker -h localhost -d trustchecker -c "SELECT 1;"
```

---

## 4. Deploy Code

```bash
# Clone repo
cd /var/www
git clone https://github.com/tonytran1984vn/trustchecker.git
cd trustchecker

# Cài packages
npm install

# Cài thêm 2 package cho PostgreSQL adapter
npm install pg @prisma/adapter-pg

# Generate Prisma Client
# ⚠️ PHẢI set DATABASE_URL trước khi generate
export DATABASE_URL="postgresql://trustchecker:YOUR_DB_PASSWORD@localhost:5432/trustchecker"
npx prisma generate
```

### ⚠️ Prisma 7.x: Schema không có `url`

Prisma v7+ **không cho phép** `url` trong `schema.prisma`. URL được config trong `prisma.config.ts`:

```ts
// prisma.config.ts (đã có sẵn trong repo)
export default defineConfig({
    migrate: {
        url: process.env.DATABASE_URL ?? 'postgresql://trustchecker:...',
    },
});
```

Nếu `prisma generate` báo lỗi `url is no longer supported`, xóa dòng `url = env("DATABASE_URL")` trong `prisma/schema.prisma`.

---

## 5. Seed Database

```bash
# Seed dữ liệu chính (users, products, roles...)
npm run seed

# Seed emission factors (CIE v3.0)
DATABASE_URL="postgresql://trustchecker:YOUR_DB_PASSWORD@localhost:5432/trustchecker" \
  node server/seed-emission-factors.js
```

---

## 6. Cấu Hình PM2

Tạo `ecosystem.config.js`:

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
    apps: [{
        name: 'trustchecker',
        script: 'server/index.js',
        cwd: '/var/www/trustchecker',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production',
            PORT: 4000,
            DATABASE_URL: 'postgresql://trustchecker:YOUR_DB_PASSWORD@localhost:5432/trustchecker',
            JWT_SECRET: 'THAY_BANG_RANDOM_HEX_128',
            ENCRYPTION_KEY: 'THAY_BANG_RANDOM_HEX_64',
            CORS_ORIGINS: 'https://your-domain.com'
        }
    }]
};
EOF
```

### Generate secrets:

```bash
# JWT Secret (128 chars hex)
openssl rand -hex 64

# Encryption Key (64 chars hex)
openssl rand -hex 32
```

### Khởi động:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Tự khởi động khi reboot
```

---

## 7. Cấu Hình Nginx (Reverse Proxy)

Thêm vào `/etc/nginx/sites-enabled/default` (hoặc file config riêng):

```nginx
# TrustChecker — Reverse Proxy
location /trustchecker/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
location = /trustchecker {
    return 301 /trustchecker/;
}
```

```bash
nginx -t && systemctl reload nginx
```

---

## 8. Kiểm Tra

```bash
# PM2 status
pm2 status

# Health check
curl http://localhost:4000/api/health | python3 -m json.tool

# Kết quả mong đợi:
# "status": "healthy"
# "database": "postgresql"
```

---

## 9. Các Lệnh Hay Dùng

| Lệnh | Mô tả |
|-------|--------|
| `pm2 status` | Xem trạng thái app |
| `pm2 logs trustchecker` | Xem logs realtime |
| `pm2 restart trustchecker` | Restart app |
| `pm2 flush` | Xóa log files |
| `pm2 monit` | Monitor CPU/RAM |

---

## 10. Troubleshooting

### App crash-loop (PM2 errored)

```bash
# Xem error log
pm2 logs trustchecker --err --lines 30

# Hard reset PM2
pm2 kill && pm2 start ecosystem.config.js && pm2 save
```

### Missing env vars

Nếu log hiện `❌ Configuration errors: Missing required env var`, kiểm tra `ecosystem.config.js` có đầy đủ:
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `CORS_ORIGINS`

### Prisma generate fails

```bash
# Lỗi "Cannot find module '.prisma/client/default'"
DATABASE_URL="postgresql://..." npx prisma generate

# Lỗi "url is no longer supported"
# → Xóa dòng `url = env("DATABASE_URL")` trong prisma/schema.prisma
```

### Disk full

```bash
# Dọn logs + cache
journalctl --vacuum-size=50M
apt clean
pm2 flush
find /var/log -name '*.gz' -delete
```

---

## 11. Cập Nhật Code

Khi có code mới từ GitHub:

```bash
cd /var/www/trustchecker
git pull origin master
npm install              # Nếu có package mới
npx prisma generate      # Nếu schema thay đổi
pm2 restart trustchecker
```

Hoặc dùng rsync từ local:

```bash
# Từ máy local
rsync -avz --exclude node_modules --exclude .git \
  ./  root@YOUR_VPS_IP:/var/www/trustchecker/
ssh root@YOUR_VPS_IP "cd /var/www/trustchecker && npm install && pm2 restart trustchecker"
```
