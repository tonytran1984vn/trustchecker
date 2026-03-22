# TrustChecker — Digital Trust & Carbon Infrastructure

**Version**: 9.4.1 · **Runtime**: Node.js + Express · **Database**: PostgreSQL (Prisma ORM)  
**Architecture**: Event-Driven SPA · **Engines**: 120+ · **API Endpoints**: 160+  
**License**: Private · **Port**: 4000

> Enterprise-grade supply chain trust, carbon governance, and ESG compliance platform.  
> Multi-tenant architecture with 18 RBAC roles, 143 permissions, and 24 SoD conflict pairs.

---

## Table of Contents

- [Architecture](#architecture)
- [Quick Start (Local)](#quick-start-local)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Seed Data & Demo Accounts](#seed-data--demo-accounts)
- [Project Structure](#project-structure)
- [RBAC Roles](#rbac-roles)
- [Key Modules](#key-modules)
- [Testing](#testing)
- [Production Deployment (VPS)](#production-deployment-vps)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Nginx (reverse proxy)                  │
│                  tonytran.work/trustchecker/              │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│              Node.js + Express (port 4000)                │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Auth &  │  │  72 Route │  │ 120+      │  │ WebSocket│ │
│  │ RBAC    │  │  Files    │  │ Engines   │  │ Events   │ │
│  └─────────┘  └──────────┘  └───────────┘  └──────────┘ │
│                       │                                   │
│               ┌───────▼────────┐                         │
│               │  PostgreSQL    │                         │
│               │  (61 tables)   │                         │
│               │  Prisma ORM    │                         │
│               └────────────────┘                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              Client (SPA — Vanilla JS ES Modules)         │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Router  │  │  Pages   │  │ Components│  │ State &  │ │
│  │ (SPA)   │  │  (30+)   │  │ (shared)  │  │ API      │ │
│  └─────────┘  └──────────┘  └───────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **No build step** — client is plain ES modules served directly via Express static middleware
- **Multi-tenant** — all queries scoped by `org_id` via tenant middleware
- **Engines** — business logic decoupled from routes (carbon, risk, compliance, blockchain, etc.)

---

## Quick Start (Local)

### ⚡ One-Command Setup

```bash
git clone https://github.com/tonytran1984vn/trustchecker.git
cd trustchecker
./setup.sh
```

The setup script automatically:
- ✅ Checks Node.js 18+ and npm
- ✅ Lets you choose **SQLite** (zero config) or **PostgreSQL**
- ✅ Runs `npm install`
- ✅ Creates `.env` with auto-generated secure secrets
- ✅ Runs Prisma migrations (if PostgreSQL)
- ✅ Seeds demo data (products, users, scan events, etc.)
- ✅ Creates required directories

Then start the server:

```bash
npm run dev
```

Server starts at **http://localhost:4000**

### Prerequisites

| Tool        | Version    | Notes                  |
|-------------|------------|------------------------|
| **Node.js** | v18+ LTS   | `node -v` to check     |
| **npm**     | 9+         | Comes with Node.js     |
| **PostgreSQL** | 15+ (optional) | SQLite used by default for dev |

<details>
<summary>📋 Manual Setup Steps (alternative to setup.sh)</summary>

```bash
# 1. Clone
git clone https://github.com/tonytran1984vn/trustchecker.git
cd trustchecker

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Setup PostgreSQL (optional — see Database Setup below)

# 5. Generate Prisma Client (PostgreSQL only)
npx prisma generate

# 6. Push schema to database
npx prisma db push

# 7. Seed demo data
npm run seed

# 8. Start dev server
npm run dev
```

</details>

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=4000
NODE_ENV=development

# Database (REQUIRED)
DATABASE_URL=postgresql://trustchecker:YOUR_PASSWORD@localhost:5432/trustchecker

# Security (REQUIRED — minimum 32 characters each for production)
JWT_SECRET=trustchecker-secret-key-DEV-ONLY
ENCRYPTION_KEY=trustchecker-encryption-key-DEV-ONLY

# CORS (comma-separated origins, or * for dev)
CORS_ORIGINS=*

# Optional
# REDIS_URL=redis://localhost:6379    # For caching (falls back to in-memory)
# AI_API_KEY=sk-...                   # For AI chat features
# SMTP_HOST=smtp.example.com          # For email notifications
```

> ⚠️ **Production**: `JWT_SECRET` and `ENCRYPTION_KEY` MUST be ≥32 characters.

---

## Database Setup

### Option A: Local PostgreSQL

```bash
# Create user and database
sudo -u postgres psql <<SQL
CREATE USER trustchecker WITH PASSWORD 'your_password';
CREATE DATABASE trustchecker OWNER trustchecker;
GRANT ALL PRIVILEGES ON DATABASE trustchecker TO trustchecker;
SQL

# Set DATABASE_URL in .env
# DATABASE_URL=postgresql://trustchecker:your_password@localhost:5432/trustchecker
```

### Option B: Docker PostgreSQL

```bash
docker run -d \
  --name trustchecker-db \
  -e POSTGRES_USER=trustchecker \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=trustchecker \
  -p 5432:5432 \
  postgres:16
```

### Initialize Schema & Data

```bash
# Push Prisma schema to DB (creates 61 tables)
npx prisma db push

# Seed platform accounts + demo data
npm run seed

# Optional: View database in browser UI
npm run db:studio
```

---

## Seed Data & Demo Accounts

After running `npm run seed`, these accounts are created:

### Platform Accounts

| Email                        | Role              | Password    |
|------------------------------|-------------------|-------------|
| `admin@trustchecker.io`      | super_admin       | `admin123`  |
| `security@trustchecker.io`   | platform_security | `admin123`  |
| `datagov@trustchecker.io`    | data_gov_officer  | `admin123`  |

### Demo Tenant Accounts (Demo Corp)

| Email                           | Role               | Password    |
|----------------------------------|---------------------|-------------|
| `admin@demo.trustchecker.io`    | company_admin       | `admin123`  |
| `ceo@demo.trustchecker.io`     | executive           | `admin123`  |
| `ops@demo.trustchecker.io`     | ops_manager         | `admin123`  |
| `risk@demo.trustchecker.io`    | risk_officer        | `admin123`  |
| `compliance@demo.trustchecker.io` | compliance_officer | `admin123`  |
| `scm@demo.trustchecker.io`     | scm_analyst         | `admin123`  |
| `carbon@demo.trustchecker.io`  | carbon_officer      | `admin123`  |
| `blockchain@demo.trustchecker.io` | blockchain_operator | `admin123` |
| `auditor@demo.trustchecker.io` | auditor             | `admin123`  |

> The default seed password is `admin123`. Change it in production.

---

## Project Structure

```
trustchecker/
├── client/                    # Frontend SPA (vanilla JS, ES modules)
│   ├── index.html             # Entry point
│   ├── app.js                 # App shell (sidebar, header, auth gate)
│   ├── main.js                # Bootstrap
│   ├── style.css              # Global styles
│   ├── core/                  # Core modules
│   │   ├── state.js           #   Global state + localStorage hydration
│   │   ├── api.js             #   HTTP client (fetch wrapper)
│   │   ├── router.js          #   SPA router (dynamic import)
│   │   ├── icons.js           #   SVG icon library
│   │   └── features.js        #   Feature flags & role-based menu
│   ├── components/            # Shared UI components
│   ├── pages/                 # Page modules (lazy-loaded)
│   │   ├── dashboard.js       #   Main dashboard
│   │   ├── products.js        #   Product management
│   │   ├── carbon/            #   Carbon Workspace (6 tabs)
│   │   ├── owner/             #   Owner governance
│   │   ├── scm/               #   Supply chain management
│   │   ├── sa/                #   Super Admin workspace
│   │   └── ...                #   30+ page modules
│   └── utils/                 # Utilities (sanitize, format, etc.)
│
├── server/                    # Backend (Express.js)
│   ├── index.js               # Server entry point
│   ├── db.js                  # Database connection (SQLite fallback)
│   ├── prisma-db.js           # Prisma client wrapper
│   ├── auth.js                # JWT auth middleware
│   ├── auth/                  # RBAC system
│   │   └── rbac.js            #   Role definitions & permissions
│   ├── config.js              # App configuration
│   ├── cache.js               # Cache middleware (Redis/in-memory)
│   ├── routes/                # API route handlers (72 files)
│   │   ├── products.js        #   /api/products
│   │   ├── scm-carbon.js      #   /api/scm/carbon
│   │   ├── carbon-officer.js  #   /api/carbon-officer
│   │   ├── scm-carbon-credit.js # /api/scm/carbon-credit
│   │   └── ...
│   ├── engines/               # Business logic engines (120+ files)
│   │   ├── carbon-engine.js   #   Carbon footprint calculation
│   │   ├── risk-radar.js      #   Risk scoring & assessment
│   │   ├── blockchain.js      #   On-chain verification
│   │   ├── compliance-engine.js # Regulatory compliance
│   │   ├── scheduler.js       #   Background jobs (cron)
│   │   └── ...
│   ├── middleware/             # Express middleware
│   │   └── tenant-middleware.js # Multi-tenant query scoping
│   ├── seed.js                # Main seed script
│   ├── seed-accounts.js       # Platform & demo accounts
│   ├── seed-carbon.js         # Carbon data seeder
│   └── ...
│
├── prisma/
│   └── schema.prisma          # Database schema (61 tables)
│
├── prisma.config.js           # Prisma configuration
├── ecosystem.config.js         # PM2 process manager config
├── Dockerfile                  # Docker image
├── docker-compose.yml          # Docker Compose (app + DB)
├── jest.config.js              # Test configuration
├── package.json                # Dependencies & scripts
│
├── docs/                       # Additional documentation
├── tests/                      # Test files
├── scripts/                    # Utility scripts
├── deploy/                     # Deployment scripts
└── infra/                      # Infrastructure configs
```

---

## RBAC Roles (18 Roles × 5 Tiers)

> See [ROLE_REGISTRY.md](ROLE_REGISTRY.md) for full details including 143 permissions, 24 SoD pairs, and lineage ACL matrix.

**Design Principles:** No role has create + approve + deploy power. Platform ≠ Business. Governance ≠ Execution.

```
L5  Platform Layer
     ├── 1. Super Admin (Infrastructure Custodian — NOT business authority)
     ├── 2. Platform Security Officer (10 perms)
     └── 3. Data Governance Officer (7 perms)

L4  Global Governance Layer
     ├── 4. GGC Member (Graph Governance Committee)
     ├── 5. Risk Committee (Decision Logic Owner)
     ├── 6. Compliance Officer (17 perms)
     └── 7. IVU — Independent Validation Unit

L3  Tenant Governance Layer
     ├── 8. Company Admin (Tenant IAM)
     ├── 9. Executive / CEO
     └── 10. Carbon Officer

L2  Operational Layer
     ├── 11. Operations Manager (27 perms)
     ├── 12. Risk Officer
     └── 13. SCM Analyst

L1  Technical Execution Layer
     ├── 14. Developer (8 perms)
     ├── 15. Blockchain Operator (anchor/verify only)
     ├── 16. Operator (day-to-day tasks)
     ├── 17. Auditor (5 perms — read-only)
     └── 18. Viewer (5 perms — read-only)
```

| Layer | Roles | Purpose |
|-------|-------|---------|
| **L5** | Super Admin, Security, Data Gov | Platform infra — cannot approve fraud or mint carbon |
| **L4** | GGC, Risk Committee, Compliance, IVU | Governance — schema, weight, compliance decisions |
| **L3** | Company Admin, CEO, Carbon Officer | Tenant governance — org config, ESG strategy |
| **L2** | Ops Manager, Risk Officer, SCM Analyst | Operational — daily ops, risk investigation, supply chain |
| **L1** | Developer, Blockchain Op, Operator, Auditor, Viewer | Execution — API, anchoring, read-only audit |

---

## Key Modules

### 🌿 Carbon Workspace (Carbon Officer)
6-tab workspace: Overview Dashboard, Emission Tracker, Credit Lifecycle, Carbon Passports, ESG & Compliance, Industry Benchmark

### 📦 Supply Chain Management (SCM Analyst)
Product tracking, digital twins, EPCIS events, partner verification, trust graph, logistics routes

### 🔒 Risk & Governance (Owner / Executive)
Risk radar, anomaly detection, stakeholder management, governance overview, team & people

### 🏗️ Infrastructure (Super Admin)
Platform monitoring, tenant management, critical infrastructure, kill switches, cross-org analysis

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npx jest --coverage

# Run specific test file
npx jest tests/auth.test.js
```

---

## Production Deployment (VPS)

### ⚡ One-Command VPS Deploy (Ubuntu/Debian)

```bash
# SSH to a fresh VPS, then:
git clone https://github.com/tonytran1984vn/trustchecker.git /opt/trustchecker
cd /opt/trustchecker
sudo ./deploy-vps.sh
```

The deploy script automatically installs & configures:
- ✅ **Node.js 22** + PM2 (auto-restart on reboot)
- ✅ **PostgreSQL** (user, database, random password)
- ✅ **Nginx** reverse proxy
- ✅ **SSL** via Let's Encrypt (if domain provided)
- ✅ **UFW** firewall
- ✅ `.env` with production secrets
- ✅ Prisma migrations + data seeding

> See [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) for detailed manual guide.

<details>
<summary>📋 Manual Deploy Steps (alternative to deploy-vps.sh)</summary>

```bash
# 1. SSH to VPS
ssh root@your_vps_ip

# 2. Install prerequisites
apt install -y nodejs npm postgresql nginx
npm install -g pm2

# 3. Setup PostgreSQL
sudo -u postgres createuser -P trustchecker
sudo -u postgres createdb -O trustchecker trustchecker

# 4. Deploy code
git clone <repo> /opt/trustchecker
cd /opt/trustchecker
npm ci --omit=dev

# 5. Configure environment
cp .env.example .env   # Edit DATABASE_URL, JWT_SECRET, etc.

# 6. Initialize database
npx prisma generate && npx prisma db push
npm run seed

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

</details>

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Update Deployment

```bash
# On VPS — pull latest changes and restart
cd /opt/trustchecker
git pull
npm ci --omit=dev
pm2 restart trustchecker
```

---

## Docker

```bash
# Start everything (app + PostgreSQL)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## npm Scripts

| Script              | Description                              |
|---------------------|------------------------------------------|
| `./setup.sh`        | **One-command local setup**              |
| `./deploy-vps.sh`   | **One-command VPS production deploy**    |
| `npm run dev`       | Start dev server (port 4000)             |
| `npm start`         | Start production server                  |
| `npm run seed`      | Seed database with demo data             |
| `npm test`          | Run Jest tests                           |
| `npm run db:generate` | Generate Prisma client                |
| `npm run db:push`   | Push schema to database                  |
| `npm run db:studio` | Open Prisma Studio (DB browser)          |
| `npm run docker:up` | Start Docker Compose                     |
| `npm run docker:down` | Stop Docker Compose                    |

---

## Troubleshooting

### ❌ `FATAL: DATABASE_URL is not set!`
Set `DATABASE_URL` in `.env` file. Example:
```
DATABASE_URL=postgresql://trustchecker:password@localhost:5432/trustchecker
```

### ❌ `JWT_SECRET must be at least 32 characters`
In production, both `JWT_SECRET` and `ENCRYPTION_KEY` must be ≥32 characters.

### ❌ Prisma generate fails
```bash
# Ensure DATABASE_URL is set, then:
npx prisma generate
# If WASM error: add engineType = "library" to schema.prisma generator block
```

### ❌ CORS errors in browser
Add your origin to `CORS_ORIGINS` in `.env`:
```
CORS_ORIGINS=http://localhost:4000,https://yourdomain.com
```

### ❌ Carbon Workspace stuck on "Loading..."
- Check server logs: `pm2 logs trustchecker --lines 50`
- Verify API endpoints respond: `curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/carbon-officer/dashboard`
- Ensure database has seed data: `npm run seed`

### ❌ 502 Bad Gateway on VPS
- Check PM2 status: `pm2 status`
- Check Nginx config points to correct port (4000)
- Check server logs: `pm2 logs trustchecker --err --lines 100`

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) | Detailed VPS deployment guide |
| [SYSTEM_DESCRIPTION.md](SYSTEM_DESCRIPTION.md) | Full system functional description |
| [SYSTEM_FUNCTIONAL_DESCRIPTION.md](SYSTEM_FUNCTIONAL_DESCRIPTION.md) | Detailed module descriptions |
| [ROLE_REGISTRY.md](ROLE_REGISTRY.md) | Complete role & permission registry |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [SCM_MODULE_DESCRIPTION.md](SCM_MODULE_DESCRIPTION.md) | Supply chain module details |
| [CARBON_PASSPORT.md](CARBON_PASSPORT.md) | Carbon passport specification |

---

<p align="center">
  <b>TrustChecker v9.4.1</b> · Built for enterprise supply chain trust & ESG governance
</p>
