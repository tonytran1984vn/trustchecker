# MÔ TẢ CHI TIẾT CHỨC NĂNG HỆ THỐNG — TrustChecker v9.4

> **Distributed Event-Driven Enterprise Trust & Risk Intelligence Platform**
>
> Phiên bản: v9.4 • Ngày cập nhật: 17/02/2026
> Kiến trúc: Clean Architecture + CQRS + Event-Driven + WAF + Observability + ES6 Modular Frontend + Python AI Microservices
> License: Enterprise / On-Premise / SaaS Multi-Tenant

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Technology Stack](#2-technology-stack)
3. [Database & Data Model](#3-database--data-model)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Multi-Tenancy Architecture](#5-multi-tenancy-architecture)
6. [Chức năng chính — Route Modules](#6-chức-năng-chính--route-modules)
7. [AI / Risk Intelligence Layer](#7-ai--risk-intelligence-layer)
8. [Supply Chain Management (SCM)](#8-supply-chain-management-scm)
9. [ESG & Carbon Compliance](#9-esg--carbon-compliance)
10. [Blockchain & NFT Layer](#10-blockchain--nft-layer)
11. [Billing & Monetization](#11-billing--monetization)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Security Architecture](#13-security-architecture)
14. [Event Bus & Domain Events](#14-event-bus--domain-events)
15. [Observability & SLO](#15-observability--slo)
16. [Data Partitioning](#16-data-partitioning)
17. [Domain Layer — Clean Architecture (v9.4)](#17-domain-layer--clean-architecture-v94)
18. [CQRS & Read Replica (v9.4)](#18-cqrs--read-replica-v94)
19. [WAF & API Gateway (v9.4)](#19-waf--api-gateway-v94)
20. [Deployment & Infrastructure](#20-deployment--infrastructure)
21. [On-Premise / Self-Hosted](#21-on-premise--self-hosted)
22. [Testing & Verification](#22-testing--verification)
23. [Khuyến nghị chiến lược](#23-khuyến-nghị-chiến-lược)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: ES6 Modular SPA + PWA (53 modules, 4226 LOC)     │
│  ┌──────────┬──────────┬──────────┬─────────┬────────────┐  │
│  │ core/    │ services/│ compo-   │ pages/  │ i18n/      │  │
│  │ api,state│ auth,i18n│ nents/   │ 36 lazy │ EN + VI    │  │
│  │ router   │ branding │ skeleton │ loaded  │ 70 keys    │  │
│  └──────────┴──────────┴──────────┴─────────┴────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Observability: Tracing + Metrics + SLO + Structured Logs   │
│  ┌──────────┬──────────┬──────────┬────────────────────┐   │
│  │ W3C      │ Prome-   │ 6 SLOs + │ JSON Structured    │   │
│  │ Trace    │ theus    │ Error    │ Logger (ECS)       │   │
│  │ Context  │ Metrics  │ Budgets  │ 5 log levels       │   │
│  └──────────┴──────────┴──────────┴────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  API Gateway: Express.js + Security + Versioning (/api/v1/) │
│  ┌─────────┬──────────┬───────────┬───────────────────────┐ │
│  │ Auth    │ Tenant   │ Feature   │ Rate Limit + Metering │ │
│  │ JWT/MFA │ Context  │ Gate      │ API Version Headers   │ │
│  └─────────┴──────────┴───────────┴───────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Route Layer: 36 modules • 275 endpoints • /api/ + /api/v1/ │
│  ┌──────────┬──────────┬──────────┬──────────────┬─────┐   │
│  │ Core     │ SCM (10) │ AI/Risk  │ Compliance   │Admin│   │
│  │ QR/Scan  │ EPCIS    │ Radar    │ GDPR / KYC   │     │   │
│  │ Products │ Logistics│ Twin     │ ESG / Carbon  │     │   │
│  └──────────┴──────────┴──────────┴──────────────┴─────┘   │
├─────────────────────────────────────────────────────────────┤
│  Event Bus: Redis Streams + Schema Registry + DLQ           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 15 domain events • 5 domains • XADD/XREADGROUP     │   │
│  │ At-least-once • Consumer groups • Retry+backoff     │   │
│  │ Dead Letter Queue (inspect/replay/purge)            │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Worker Layer: Priority Queue + Per-Tenant Throttle         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 11 queues • Enterprise>Pro>Core>Free ordering       │   │
│  │ Token bucket throttle • 3 retries + DLQ fallback    │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Engine Layer: 17 JS engines + 3 Python AI services         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Circuit Breaker (CLOSED/OPEN/HALF_OPEN) per service │   │
│  │ Monte Carlo • Digital Twin • Risk Radar • CUSUM     │   │
│  │ Holt-Winters • TrustGraph • Advanced SCM AI         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ┌──────────────────┬─────────┬──────────────┐             │
│  │ PostgreSQL (41   │ Redis   │ WebSocket    │             │
│  │ models) + RLS    │ Streams │ Events       │             │
│  │ + Partitioned    │ + DLQ   │              │             │
│  └──────────────────┴─────────┴──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

| Metric | Giá trị |
|--------|---------|
| **Route modules** | 36 files |
| **API endpoints** | 283 (+ `/api/v1/` aliases) |
| **JS Engines** | 17 |
| **Python AI services** | 3 (19 files) |
| **Prisma models** | 41 |
| **Middleware stack** | 14 layers (+WAF, +API gateway, +tracing, +metrics, +SLO) |
| **Frontend modules** | 58 ES6 modules (5,200+ LOC) |
| **i18n** | 2 languages (EN + VI), 70 keys |
| **Domain event types** | 15 events across 5 domains |
| **Bounded contexts** | **v9.4** — 6 (Product Authenticity, Supply Chain, Risk Intelligence, ESG, Identity, Billing) |
| **Domain invariants** | **v9.4** — 30 business rules |
| **Saga definitions** | **v9.4** — 3 (ScanVerification, ShipmentLifecycle, FraudInvestigation) |
| **CQRS materialized views** | **v9.4** — 4 (Dashboard, Scan, SCM Timeline, Fraud) |
| **Job queues** | 11 named queues with priority ordering |
| **SLO definitions** | 6 (availability, latency p95/p99, error rate, events, AI) |
| **Partitioned tables** | 3 (scan_events, audit_log, shipment_checkpoints) |
| **WAF detection layers** | **v9.4** — 6 (SQLi, XSS, traversal, bot, headers, rate) |

---

## 2. Technology Stack

### Backend (Node.js)

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| ORM | Prisma 5.x |
| Database | PostgreSQL (prod, **partitioned**) / SQLite (dev) |
| Cache + Events | Redis 7.x (**Streams** + Sorted Sets) |
| Auth | JWT + bcrypt + TOTP (otplib) |
| WebSocket | ws (native) |
| Crypto | Ed25519 (license), SHA-256, RSA |
| **Event Bus** | **v9.3** — Redis Streams (XADD/XREADGROUP/XACK) |
| **Metrics** | **v9.3** — Prometheus-compatible (Counter/Gauge/Histogram) |
| **Tracing** | **v9.3** — W3C Trace Context (traceparent) |
| **Logging** | **v9.3** — Structured JSON (ECS format) |
| **Domain Layer** | **v9.4** — Domain Registry + Saga Orchestrator + Unit of Work |
| **CQRS** | **v9.4** — Query Store (4 materialized views) + Read Replica |
| **WAF** | **v9.4** — 6-layer Web Application Firewall |
| **API Gateway** | **v9.4** — Quota + Key management + Response sanitization |

### Python AI Services

| Service | Port | Engine |
|---------|------|--------|
| AI Simulation (Monte Carlo) | 5001 | NumPy vectorized, Gunicorn |
| AI Detection (Fraud/Anomaly) | 5002 | scikit-learn, Gunicorn |
| AI Analytics (Forecasting) | 5003 | Holt-Winters, Gunicorn |

### Frontend

| Component | Technology |
|-----------|-----------|
| Architecture | **v9.2** — ES6 Modules (58 modules) |
| Entry Point | `main.js` → `<script type="module">` |
| Routing | Dynamic `import()` lazy loading |
| State Management | **v9.4** — Reactive store (Proxy-based, subscriptions, batching) |
| Virtualization | **v9.4** — Viewport-recycling table (100k+ rows) |
| Charts | **v9.4** — Lazy chart (Intersection Observer, destroy on scroll-out) |
| i18n | **v9.2** — JSON-based (EN + VI, 70 keys) |
| Offline | PWA + Service Worker |
| Styling | Custom CSS Design System (dark theme) |
| Loading States | **v9.2** — Skeleton shimmer components |

---

## 3. Database & Data Model

**41 Prisma models** — PostgreSQL production, SQLite dev fallback.

### Core Models

| Model | Mô tả |
|-------|--------|
| `User` | Tài khoản (username, email, password_hash, role, **org_id** FK) |
| `Organization` | **v9.1** — Multi-tenant org (name, slug, plan, schema_name, settings) |
| `Product` | Sản phẩm đăng ký (name, SKU, hash_seal, org_id) |
| `QRCode` | Mã QR unique per product |
| `ScanEvent` | Lịch sử scan (location, device, trust_score) |
| `FraudAlert` | Cảnh báo gian lận (severity, status, resolved_by) |
| `TrustScore` | Điểm tin cậy tổng hợp |

### Supply Chain Models

| Model | Mô tả |
|-------|--------|
| `SupplyChainEvent` | Sự kiện chuỗi cung ứng |
| `Inventory` | Quản lý tồn kho |
| `Partner` | Đối tác chuỗi cung ứng |
| `Shipment` | Lô hàng vận chuyển |
| `ShipmentCheckpoint` | Vị trí tracking |
| `EPCISEvent` | Events theo chuẩn GS1 EPCIS 2.0 |
| `DigitalTwinState` | Trạng thái Digital Twin |

### Compliance & Security

| Model | Mô tả |
|-------|--------|
| `KYCBusiness` | Know Your Customer |
| `Certification` | Chứng nhận (ISO, FDA, EU...) |
| `Evidence` | Bằng chứng tamper-proof |
| `AuditLog` | Audit trail |
| `BlockchainSeal` | Hash sealed on-chain |
| `SustainabilityScore` | ESG / Carbon metrics |
| `DataProcessingRecord` | GDPR processing records |
| `ConsentRecord` | GDPR consent tracking |
| `DPIARecord` | Data Protection Impact Assessment |

### System / Billing

| Model | Mô tả |
|-------|--------|
| `Session` | User sessions |
| `RefreshToken` | JWT rotation |
| `PasskeyCredential` | WebAuthn / FIDO2 |
| `BillingPlan` | Stripe integration |
| `Invoice` / `Payment` | Thanh toán |
| `UsageMeter` | API metering per endpoint |
| `WebhookEndpoint` / `WebhookEvent` | Webhook delivery |

### v9.1 — Row-Level Security (RLS)

> [!IMPORTANT]
> 15 bảng đã được cấu hình RLS policies. Mọi query tự động filter theo `org_id` thông qua `SET app.current_tenant`.

```sql
-- Shared-schema tenancy (Free/Core/Pro):
SELECT set_config('app.current_tenant', $1, true);

-- Enterprise schema isolation:
SELECT set_config('search_path', $1 || ', public', true);
```

---

## 4. Authentication & Authorization

### Auth Flow

```
Login → Password check → MFA (nếu enabled) → generateTokenPair()
                                                ├── JWT (1h) + orgId/orgSlug/orgPlan
                                                └── Refresh token (7 days, rotated)
```

### JWT Payload (v9.1.1)

```json
{
  "id": "user-uuid",
  "username": "admin",
  "role": "admin",
  "session_id": "session-uuid",
  "plan": "pro",
  "orgId": "org-uuid",
  "orgSlug": "acme-corp",
  "orgPlan": "pro",
  "orgSchema": null
}
```

### Endpoints (22 endpoints)

| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/api/auth/register` | Đăng ký (password 12+ chars, 4 loại ký tự) |
| POST | `/api/auth/login` | Đăng nhập (lockout 5 attempts / 15 min) |
| POST | `/api/auth/refresh` | Đổi token (rotation) |
| POST | `/api/auth/mfa/setup` | Cài đặt TOTP MFA |
| POST | `/api/auth/mfa/verify` | Xác nhận MFA |
| POST | `/api/auth/mfa/disable` | Tắt MFA |
| POST | `/api/auth/password` | Đổi mật khẩu |
| POST | `/api/auth/forgot-password` | Yêu cầu reset |
| POST | `/api/auth/reset-password` | Reset với token |
| GET | `/api/auth/me` | **v9.1** — Profile + org + feature_flags |
| GET | `/api/auth/sessions` | Danh sách sessions |
| POST | `/api/auth/revoke` | Thu hồi session |
| GET | `/api/auth/users` | List users (admin) |
| PUT | `/api/auth/users/:id/role` | Đổi role |
| POST | `/api/auth/passkey/register` | WebAuthn đăng ký |
| POST | `/api/auth/passkey/authenticate` | WebAuthn xác thực |
| GET | `/api/auth/passkey/list` | Danh sách passkeys |
| DELETE | `/api/auth/passkey/:id` | Xóa passkey |
| GET | `/api/auth/oauth/google/url` | OAuth Google |
| POST | `/api/auth/oauth/google/callback` | OAuth Google callback |
| POST | `/api/auth/oauth/github/callback` | OAuth GitHub callback |

### RBAC

```
admin (4) > manager (3) > operator (2) > viewer (1)
```

---

## 5. Multi-Tenancy Architecture

### v9.1 — Organization Model

| Field | Type | Mô tả |
|-------|------|--------|
| `id` | UUID | Primary key |
| `name` | String | Tên tổ chức |
| `slug` | String | Unique, dùng cho subdomain (`acme.trustchecker.com`) |
| `plan` | Enum | `free` / `core` / `pro` / `enterprise` |
| `schema_name` | String? | Enterprise: schema riêng (`tenant_acme`) |
| `settings` | JSON | Cài đặt tùy chỉnh |

### Tenant Context Flow

```
Request → tenantMiddleware → Extract from:
  1. JWT claims (orgId) ← primary
  2. X-Tenant-ID header (service-to-service, UUID validated)
  3. Subdomain (acme.trustchecker.com, slug validated)
  → req.tenantId / req.tenantSlug / req.tenantPlan
```

### Security (v9.1.1)

- **SQL injection fix**: Tất cả queries dùng parameterized (`$1`, `$2`...)
- **UUID validation**: `X-Tenant-ID` header phải match UUID regex
- **Slug validation**: Subdomain phải match `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$`
- **RLS bypass**: `trustchecker_admin` role cho migrations

### Organization Routes (7 endpoints)

| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/api/org` | Thông tin org hiện tại |
| POST | `/api/org` | Tạo org mới |
| PUT | `/api/org` | Cập nhật org |
| POST | `/api/org/invite` | Mời thành viên |
| POST | `/api/org/remove` | Xóa thành viên |
| GET | `/api/org/members` | Danh sách thành viên |
| POST | `/api/org/provision` | Provisioning Enterprise schema |

---

## 6. Chức năng chính — Route Modules

### 6.1. Core Platform (39 endpoints)

| Module | Endpoints | Chức năng chính |
|--------|-----------|----------------|
| `products.js` | 6 | CRUD sản phẩm, hash seal, QR generation |
| `qr.js` | 10 | Scan, verify, dashboard stats, fraud alerts |
| `public.js` | 13 | Public verification, insights, stats |
| `reports.js` | 9 | PDF/JSON reports, trend analysis |
| `notifications.js` | 8 | Push notifications, preferences |

### 6.2. Supply Chain (10 modules, ~60 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `scm-tracking.js` | 8 | Event tracking, timeline |
| `scm-inventory.js` | 4 | Inventory levels, alerts |
| `scm-logistics.js` | 8 | Shipments, checkpoints, ETAs |
| `scm-partners.js` | 6 | Partner management, scoring |
| `scm-leaks.js` | 6 | Unauthorized leak detection |
| `scm-trustgraph.js` | 8 | Network visualization, anomalies |
| `scm-epcis.js` | 5 | GS1 EPCIS 2.0 events |
| `scm-risk-radar.js` | 4 | Multi-factor risk scoring |
| `scm-carbon.js` | 5 | Carbon footprint, Scope 1/2/3 |
| `scm-digital-twin.js` | 4 | Digital Twin simulation |

### 6.3. Compliance & KYC (45 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `kyc.js` | 12 | Business verification, document upload |
| `evidence.js` | 15 | Evidence vault, tamper-proof storage |
| `compliance-gdpr.js` | 14 | GDPR: DPIA, consent, SAR, breach notification |
| `anomaly.js` | 4 | Real-time anomaly detection |

### 6.4. Commerce & Integration (46 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `nft.js` | 6 | NFT certificate minting |
| `wallet-payment.js` | 10 | Crypto wallet, Stripe payments |
| `billing.js` | 19 | Plans, invoices, usage, Stripe webhook |
| `branding.js` | 5 | White-label configuration |
| `integrations.js` | 5 | API keys, webhook setup |
| `webhooks.js` | 6 | Outbound webhook delivery |

### 6.5. AI & Analytics (10 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `scm-advanced-ai.js` | 5 | Demand sensing, what-if, Monte Carlo |
| `ai-chat.js` | 5 | AI assistant, context-aware Q&A |

### 6.6. Admin & System (29 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `admin.js` | 9 | User management, system stats |
| `system.js` | 6 | Health, version, config |
| `stakeholder.js` | 13 | Trust ratings, reviews |
| `sustainability.js` | 5 | ESG scoring |
| `email.js` | 4 | Transactional email |
| `support.js` | 8 | Ticket system |
| `api-docs.js` | 2 | OpenAPI spec |

### 6.7. v9.1 New Modules (13 endpoints)

| Module | Endpoints | Chức năng |
|--------|-----------|-----------|
| `organizations.js` | 7 | Multi-tenant org management |
| `license.js` | 6 | On-prem license (Ed25519 signed) |

---

## 7. AI / Risk Intelligence Layer

### 17 JavaScript Engines

| Engine | Chức năng |
|--------|-----------|
| `monte-carlo-worker.js` | Monte Carlo simulation (fallback JS) |
| `digital-twin.js` | Digital twin state management |
| `advanced-scm-ai.js` | Demand sensing, what-if scenarios |
| `scm-ai.js` | SCM optimization, routing |
| `forecast-engine.js` | Holt-Winters time series |
| `anomaly-engine.js` | Statistical anomaly detection |
| `risk-engine.js` | Multi-factor risk scoring |
| `trust-score.js` | Trust score calculation |
| `engine-client.js` | Python service discovery + fallback |
| `fraud-detection.js` | Pattern-based fraud detection |
| + 7 utility engines | Caching, validation, transformations |

### 3 Python AI Services (NumPy Vectorized)

| Service | Algorithms | Config |
|---------|-----------|--------|
| **Simulation** | Monte Carlo (200K sims, CVaR-95), NumPy vectorized | Gunicorn 4 workers |
| **Detection** | CUSUM, Isolation Forest, Z-score | Gunicorn 4 workers |
| **Analytics** | Holt-Winters, exponential smoothing | Gunicorn 4 workers |

### Engine Client + Circuit Breaker (v9.2)

> [!IMPORTANT]
> **v9.2 nâng cấp**: Thay thế simple health-check cache bằng Circuit Breaker đầy đủ.

**Circuit Breaker State Machine:**

```
CLOSED ──(3 failures/60s)──→ OPEN ──(30s wait)──→ HALF_OPEN ──(2 successes)──→ CLOSED
                                                      │
                                                      └──(any failure)──→ OPEN
```

| Config | Giá trị |
|--------|---------|
| Failure threshold | 3 failures trong rolling window 60s |
| Open duration | 30s trước khi probe |
| Success threshold | 2 successes liên tiếp để close |
| Timeout per request | 30s |

- **Per-service breakers**: Mỗi Python service (simulation, detection, analytics) có circuit breaker riêng
- **Fallback**: OPEN state → auto-switch sang JS engine (zero-downtime)
- **Diagnostics**: `/api/health` hiển thị trạng thái circuit breaker cho mỗi service
- **Registry**: `getBreaker(name)` — shared instances, `getAllBreakerStatus()` cho monitoring

### ⚠️ Khuyến nghị AI Layer

| # | Khuyến nghị | Mức độ |
|---|-------------|--------|
| 1 | **Model lifecycle management** — Versioning, A/B testing, rollback | Cao |
| 2 | **Backtesting framework** — Validate predictions vs actuals | Cao |
| 3 | **Drift detection** — Alert khi model accuracy giảm | Trung bình |
| 4 | **Explainability** — SHAP/LIME cho enterprise audit | Trung bình |
| 5 | **Metrics tracking** — MAPE, RMSE per model per tenant | Cao |

---

## 8. Supply Chain Management (SCM)

### Core Capabilities

| Capability | Mô tả | Plan |
|------------|--------|------|
| Event Tracking | Lifecycle events, timeline | Core |
| Inventory Management | Real-time levels, reorder alerts | Pro |
| Logistics | Shipment tracking, checkpoints, ETAs | Pro |
| Partner Management | Scoring, certification tracking | Pro |
| Leak Detection | Unauthorized reselling detection | Pro |
| TrustGraph | Network visualization, anomaly mapping | Pro |
| EPCIS 2.0 | GS1 standard event capture | Enterprise |
| Risk Radar | Multi-factor risk scoring | Pro |
| Digital Twin | Warehouse/facility simulation | Enterprise |
| Carbon Footprint | Scope 1/2/3, emissions tracking | Enterprise |

### ⚠️ Khuyến nghị SCM

| # | Khuyến nghị | Trạng thái |
|---|-------------|-------|
| ~~1~~ | ~~Event-driven architecture~~ | ✅ **Hoàn thành v9.3** — Redis Streams event bus, 15 domain events |
| ~~2~~ | ~~CQRS — Tách read/write cho tracking queries~~ | ✅ **Hoàn thành v9.4** — Query Store, 4 materialized views, Read Replica Manager |
| ~~3~~ | ~~Worker compute layer~~ | ✅ **Hoàn thành v9.3** — Worker manager + priority queue |
| ~~4~~ | ~~Message queue~~ | ✅ **Hoàn thành v9.3** — 11 named queues, priority, retry+DLQ |

---

## 9. ESG & Carbon Compliance

### Chức năng hiện tại

| Feature | Mô tả |
|---------|--------|
| Scope 1/2/3 Tracking | Direct, indirect, value chain emissions |
| Carbon Passport | Per-product carbon footprint certificate |
| Sustainability Score | Multi-criteria ESG scoring |
| Supplier Evaluation | Environmental compliance scoring |

### ⚠️ Khuyến nghị ESG (Cơ hội moat lớn nhất)

> [!TIP]
> ESG/Carbon là unique differentiator cho thị trường **SME xuất khẩu ASEAN → EU**. Đây là cơ hội tạo moat thật sự.

| # | Khuyến nghị | Tác động |
|---|-------------|---------|
| 1 | **Chuẩn hóa GHG Protocol** — Tính toán emissions theo protocol đầy đủ | Bắt buộc cho CBAM compliance |
| 2 | **ISO 14064** — Data format chuẩn hoá | Chấp nhận bởi kiểm toán quốc tế |
| 3 | **Immutable audit log** — Blockchain-anchored emissions data | Tamper-proof cho third-party audit |
| 4 | **Third-party integration** — API cho kiểm toán bên thứ ba | Yêu cầu cho EU |
| 5 | **Tập trung ngành cụ thể** — Thủy sản, cà phê, mỹ phẩm | Dominate niche trước khi mở rộng |

---

## 10. Blockchain & NFT Layer

### Chức năng

| Feature | Mô tả |
|---------|--------|
| Hash Seal | SHA-256 tamper-evidence cho sản phẩm |
| NFT Certificates | Mint trên blockchain |
| Smart Contract | Product verification |
| Verification | Public API kiểm tra authenticity |

### ⚠️ Khuyến nghị Blockchain

> Chuyển blockchain thành **Trust Anchor Layer**: chỉ anchor hash định kỳ (batch), không dùng cho mọi transaction. Tiết kiệm gas, tăng throughput.

---

## 11. Billing & Monetization

### Plan Tiers

| Plan | Giá | Features |
|------|-----|----------|
| **Free** | $0 | Products, QR, Dashboard |
| **Core** | $29/mo | + Fraud detection, Reports, SCM Tracking |
| **Pro** | $79/mo | + AI Analytics, Risk Radar, Inventory, KYC |
| **Enterprise** | $199/mo | + Carbon/ESG, Digital Twin, EPCIS, NFT, White-label |

### Feature Gate System (v9.1.1)

**Backend** — `featureGate.js`:
```js
requireFeature('risk_radar')  // returns 403 if user plan < Pro
```

**Frontend** — `core/features.js` (v9.2 modular):
```js
import { hasFeature, showUpgradeModal } from './core/features.js';
hasFeature('risk_radar')       // check if feature enabled
showUpgradeModal('risk_radar') // show upgrade prompt
```

| Tính năng | Hoạt động |
|-----------|-----------|
| Sidebar nav items | 🔒 Locked icon + dimmed cho features ngoài plan |
| Navigate guard | Block navigation, show upgrade modal |
| `/api/auth/me` | Trả `feature_flags` object cho FE |
| Upgrade CTA | Modal "View Plans & Upgrade" → `/pricing` |

---

## 12. Frontend Architecture

### v9.2 — ES6 Modular Architecture

> [!IMPORTANT]
> **v9.2**: Monolithic `app.js` (3,742 LOC) đã được tách thành **53 ES6 modules** (4,226 LOC) với lazy loading, i18n, và skeleton states.

#### Module Structure

```
client/
├── main.js                 ← Entry point (97 LOC)
├── core/                   ← 6 modules, 780 LOC
│   ├── api.js              ← API client, token refresh
│   ├── state.js            ← Global state + render injection
│   ├── store.js            ← v9.4: Reactive store (Proxy, subscriptions, batch, dispatch)
│   ├── features.js         ← Feature flags, plan gating, upgrade modal
│   ├── websocket.js        ← WebSocket real-time events
│   └── router.js           ← Page routing + lazy loading (dynamic import)
├── services/               ← 4 modules, 279 LOC
│   ├── auth.js             ← Login, MFA, logout flows
│   ├── branding.js         ← White-label CSS variable injection
│   ├── csv-export.js       ← CSV export (products, scans, evidence, fraud)
│   └── i18n.js             ← Internationalization (EN + VI)
├── components/             ← 8 modules, 880 LOC
│   ├── sidebar.js          ← Feature-gated navigation
│   ├── header.js           ← Page header + locale switcher (🇺🇸/🇻🇳)
│   ├── toast.js            ← Toast notifications
│   ├── notifications.js    ← Notification center + badge
│   ├── search.js           ← Global cross-entity search
│   ├── skeleton.js         ← Shimmer loading states (5 types)
│   ├── virtual-table.js    ← v9.4: Viewport-recycling table (100k+ rows)
│   └── lazy-chart.js       ← v9.4: Intersection Observer lazy charts
├── utils/
│   └── helpers.js          ← Utility functions (44 LOC)
├── pages/                  ← 27 page modules, 2,650 LOC
│   ├── dashboard.js, scanner.js, products.js, ...
│   ├── audit-view.js       ← v9.4: Enterprise audit trail viewer
│   ├── analytics-compare.js ← v9.4: Period comparison analytics
│   └── scm/                ← 11 SCM page modules, 739 LOC
│       ├── dashboard.js, inventory.js, logistics.js, ...
│       └── digital-twin.js, carbon.js, ai.js
├── i18n/                   ← Translation files
│   ├── en.json             ← English (70 keys)
│   └── vi.json             ← Vietnamese (70 keys)
├── style.css               ← Dark theme design system (~2575 LOC)
├── app.js                  ← Legacy (kept as backup, not loaded)
├── check.html              ← Public verification page
├── sw.js                   ← Service Worker (PWA)
└── manifest.json           ← PWA manifest
```

#### Key Features (v9.2)

| Feature | Implementation |
|---------|----------------|
| **ES6 Modules** | `<script type="module" src="main.js">` — tree-shakeable imports |
| **Lazy Loading** | `router.js` sử dụng dynamic `import()` cho heavy pages |
| **Skeleton States** | 5 loại: dashboard, table, chart, card, list (shimmer animation) |
| **i18n** | `t('key')` + `{{param}}` interpolation, JSON files, locale persisted |
| **Locale Switcher** | Dropdown trong header: 🇺🇸 English / 🇻🇳 Tiếng Việt |
| **Feature Flags** | `core/features.js` — `hasFeature()`, `showUpgradeModal()` |
| **Sidebar Gating** | `components/sidebar.js` — locked items show 🔒 |
| **Navigate Guard** | `core/router.js` — checks `PAGE_FEATURE_MAP` before rendering |
| **White-Label** | `services/branding.js` → CSS variables + logo injection |
| **State Management** | `core/state.js` — centralized, `setRenderFn()` avoids circular deps |
| **Window Exports** | `window.functionName` cho inline `onclick` handlers |

#### Circular Dependency Solution

```js
// state.js exports setRenderFn() — main.js injects mainRender()
import { setRenderFn } from './core/state.js';
setRenderFn(mainRender); // No circular import
```

### ⚠️ Khuyến nghị Frontend (cập nhật)

| # | Khuyến nghị | Trạng thái |
|---|-------------|------------|
| ~~1~~ | ~~Tách ES6 modules~~ | ✅ **Hoàn thành v9.2** — 53 modules |
| ~~2~~ | ~~Dynamic import / Lazy load~~ | ✅ **Hoàn thành v9.2** — `router.js` |
| ~~3~~ | ~~i18n Vietnamese + English~~ | ✅ **Hoàn thành v9.2** — 70 keys |
| 4 | **Offline queue** — Queue QR scan khi mất mạng, sync khi online | Thấp |
| 5 | **Accessibility** — ARIA labels, focus management | Thấp |

---

## 13. Security Architecture

### Middleware Stack (theo thứ tự apply)

```
Request → WAF (v9.4) → rateLimiter → securityHeaders → sanitizeRequest
        → requestLogger → traceMiddleware (v9.3)
        → structuredLoggerMiddleware (v9.3)
        → metricsMiddleware (v9.3) → sloMiddleware (v9.3)
        → apiVersionMiddleware (v9.2)
        → apiMeteringMiddleware → apiGatewayPolicy (v9.4)
        → tenantMiddleware
        → authMiddleware → requireRole → requireFeature
        → Route Handler (/api/* + /api/v1/*)
```

### Có (✅)

| Layer | Chi tiết |
|-------|---------|
| JWT + Refresh Token | 1h access, 7d refresh, rotation |
| MFA / TOTP | otplib, 6-digit codes |
| WebAuthn / Passkey | FIDO2 registration + authentication |
| OAuth2 | Google, GitHub (simulated) |
| RBAC | 4-level hierarchy, requireRole middleware |
| Rate Limiting | Configurable per endpoint |
| Input Sanitization | XSS prevention, request sanitizer |
| CSRF Headers | Security headers middleware |
| Password Policy | 12+ chars, uppercase/lowercase/number/special |
| Account Lockout | 5 attempts → 15 min lockout |
| Audit Logging | Every security action logged |
| **Parameterized SQL** | **v9.1.1** — tenant.js fully parameterized |
| **Ed25519 License** | **v9.1.1** — Signed license keys |
| **Circuit Breaker** | **v9.2** — CLOSED/OPEN/HALF_OPEN per AI service |
| **API Versioning** | **v9.2** — URL prefix `/api/v1/` + Accept-Version header |
| **Distributed Tracing** | **v9.3** — W3C Trace Context, per-request spans |
| **Structured Logging** | **v9.3** — JSON ECS format, 5 log levels, context propagation |
| **Metrics Collection** | **v9.3** — 24 Prometheus-compatible metrics |
| **SLO Tracking** | **v9.3** — 6 SLOs, error budget, 30-day sliding window |
| **WAF** | **v9.4** — 6-layer detection (SQLi, XSS, path traversal, bot, headers, rate) |
| **API Gateway** | **v9.4** — Quota management, API key + IP whitelist/blacklist, response sanitization |
| **Domain Invariants** | **v9.4** — 30 business rules enforced at domain layer |

### Thiếu / Cần cải thiện (⚠️)

| # | Gap | Khuyến nghị |
|---|-----|-------------|
| 1 | **Secrets vault** | Chuyển JWT_SECRET, DB creds sang HashiCorp Vault / AWS Secrets Manager |
| 2 | **Encryption at rest** | PostgreSQL TDE hoặc application-level encryption cho PII |
| 3 | **KMS** | Key management cho license signing, hash sealing |
| ~~4~~ | ~~SOC2 readiness~~ | ✅ **v9.4** — Audit trail viewer + JSON/CSV export + trace detail |
| 5 | **Incident response** | Framework xử lý security incidents |
| 6 | **JWT storage** | Chuyển từ localStorage sang HttpOnly cookie |

---

## 14. Event Bus & Domain Events

> [!IMPORTANT]
> **v9.3 nâng cấp**: Thêm enterprise event bus dựa trên Redis Streams với schema registry, dead letter queue, và consumer groups. Chuyển từ request-response sang event-driven cho các core flows.

### Architecture

```
Publisher → Schema Validation → XADD → Redis Stream
                                         ↓
                                   Consumer Group
                                   (XREADGROUP)
                                         ↓
                              Handler (retry 3x)
                              ├── Success → XACK
                              └── Fail → DLQ (inspect/replay)
```

### 15 Domain Event Types — 5 Domains

| Domain | Event | Mô tả |
|--------|-------|--------|
| **Scan** | `scan.created` | Scan mới được thực hiện |
| | `scan.verified` | Kết quả xác minh sản phẩm |
| | `scan.fraud_detected` | Phát hiện hàng giả |
| **SCM** | `shipment.created` | Lô hàng mới tạo |
| | `shipment.checkpoint` | Checkpoint tracking |
| | `shipment.delivered` | Giao hàng thành công |
| | `inventory.alert` | Cảnh báo tồn kho |
| **AI** | `ai.job.queued` | AI job vào queue |
| | `ai.job.completed` | AI job hoàn thành |
| | `ai.job.failed` | AI job thất bại |
| **Fraud** | `fraud.alert.created` | Alert phát hiện gian lận |
| | `fraud.alert.resolved` | Alert đã giải quyết |
| **System** | `system.health.degraded` | Hệ thống suy giảm |
| | `system.health.recovered` | Hệ thống phục hồi |

### Schema Registry

- **JSON Schema** cho mỗi event type với required fields
- **Versioning**: mỗi schema có version number (`v1`, `v2`...)
- **Validation trước publish**: reject event nếu không match schema
- **Event Envelope**: `{ id, type, version, data, context, timestamp }`

### Dead Letter Queue (DLQ)

| Chức năng | Mô tả |
|-----------|--------|
| **Push** | Auto-push sau 3 retries thất bại |
| **Inspect** | Xem DLQ entries per consumer group (limit 50) |
| **Replay** | Replay single entry hoặc bulk qua handler |
| **Purge** | Admin-only cleanup |
| **Auto-expiry** | 30 ngày trong Redis |
| **Depth monitoring** | Tích hợp `/api/health` |

### Worker Manager + Priority Queue

**Per-tenant throttling** (Token Bucket):

| Plan | Burst Limit | Sustained Rate |
|------|------------|----------------|
| Enterprise | 100 requests | 20/sec |
| Pro | 50 requests | 10/sec |
| Core | 20 requests | 5/sec |
| Free | 5 requests | 1/sec |

**11 Named Queues**:

`BLOCKCHAIN` • `TRUST_SCORE` • `EVIDENCE` • `REPORTS` • `ANOMALY` • `NOTIFICATIONS` • `AI_SIMULATION` • `AI_DETECTION` • `AI_ANALYTICS` • `SCM_EVENTS` • `FRAUD_ANALYSIS`

- **Priority ordering**: `critical (100) > enterprise (80) > pro (60) > core (30) > free (10)`
- **Redis Sorted Sets** (ZADD/ZPOPMAX) cho priority dequeue
- **Retry**: 3 attempts với exponential backoff (1s → 5s → 15s)
- **DLQ fallback**: exhausted retries tự động push vào DLQ

---

## 15. Observability & SLO

> [!IMPORTANT]
> **v9.3 nâng cấp**: Full observability stack — structured logging, distributed tracing, Prometheus metrics, SLO tracking. Production-grade monitoring không cần external agent.

### Structured Logger

```json
{
  "@timestamp": "2026-02-17T17:55:00.000Z",
  "level": "info",
  "message": "GET /api/products 200",
  "service": "trustchecker",
  "requestId": "req-1739...",
  "traceId": "abc123...",
  "userId": "user-uuid",
  "orgId": "org-uuid",
  "meta": { "durationMs": 42, "method": "GET", "statusCode": 200 }
}
```

| Feature | Mô tả |
|---------|--------|
| **5 Log Levels** | error, warn, info, debug, trace |
| **ECS Format** | Elastic Common Schema compatible |
| **Context Propagation** | requestId, traceId, userId, orgId auto-injected |
| **Child Logger** | `logger.child({ module: 'scanner' })` |
| **Express Middleware** | Auto-log request/response với duration |

### Distributed Tracer (W3C Trace Context)

```
traceparent: 00-{traceId}-{spanId}-01
```

| Feature | Mô tả |
|---------|--------|
| **W3C Standard** | `traceparent` header propagation |
| **Span Types** | server, client, internal, consumer, producer |
| **Span Lifecycle** | attributes, events, error status, duration |
| **Trace Store** | In-memory ring buffer (1000 traces) |
| **Auto HTTP Spans** | Express middleware tạo span per request |

### Metrics (Prometheus-Compatible)

**24 Pre-registered Metrics:**

| Type | Metrics |
|------|---------|
| **Counter** (10) | `http_requests_total`, `http_errors_total`, `events_published_total`, `events_consumed_total`, `events_failed_total`, `jobs_processed_total`, `jobs_failed_total`, `dlq_entries_total`, `circuit_breaker_trips_total`, `auth_attempts_total`, `scans_total` |
| **Gauge** (5) | `active_connections`, `event_bus_queue_depth`, `worker_active_jobs`, `circuit_breaker_state`, `uptime_seconds` |
| **Histogram** (4) | `http_request_duration_ms`, `db_query_duration_ms`, `event_processing_duration_ms`, `ai_engine_duration_ms` |

- **Percentiles**: p50, p95, p99 cho tất cả histograms
- **Prometheus text format**: `GET /api/metrics`
- **Express middleware**: auto-track request count, duration, errors

### SLO Definitions (6 Objectives)

| SLO | Target | Window | Mô tả |
|-----|--------|--------| --------|
| **Service Availability** | 99.9% | 30 ngày | % requests không trả 5xx |
| **Latency P99** | < 500ms | 30 ngày | p99 response time |
| **Latency P95** | < 200ms | 30 ngày | p95 response time |
| **Error Rate** | < 0.1% | 30 ngày | % requests trả 5xx |
| **Event Processing** | 99.9% | 30 ngày | % domain events processed successfully |
| **AI Availability** | 99% | 30 ngày | % AI calls thành công (bao gồm fallback) |

- **Error Budget**: tự động tính remaining budget cho mỗi SLO
- **Sliding Window**: 30 ngày, hourly buckets, auto-prune
- **Report endpoint**: `GET /api/health/slo`

### Observability Endpoints

| Endpoint | Mô tả |
|----------|--------|
| `GET /api/metrics` | Prometheus text exposition format |
| `GET /api/health/slo` | SLO compliance report + error budgets |
| `GET /api/events/schemas` | Event schema registry + DLQ stats |

---

## 16. Data Partitioning

> [!IMPORTANT]
> **v9.3 nâng cấp**: Time-based monthly partitioning cho 3 bảng high-volume, BRIN indexes, auto-maintenance scheduler.

### Partitioned Tables

| Bảng | Partition Key | Lý do |
|------|--------------|-------|
| `scan_events` | `created_at` (monthly) | >1M/tháng projected, read-heavy |
| `audit_log` | `created_at` (monthly) | Compliance audit trail, grow-only |
| `shipment_checkpoints` | `created_at` (monthly) | SCM tracking, time-series |

### Index Strategy

| Index Type | Bảng | Lý do |
|-----------|------|-------|
| **BRIN** (pages_per_range=32) | Tất cả 3 bảng, cột `created_at` | 10-100x nhỏ hơn B-tree cho time-series |
| **B-tree** | `org_id`, `product_id`, `shipment_id` | Point lookups cho từng tenant |

### Partition Management

| Feature | Mô tả |
|---------|--------|
| **Auto-create** | 3 tháng trước, chạy hàng ngày |
| **Auto-drop** | Retention 12 tháng, auto-purge partitions cũ |
| **Health check** | Verify current + next month partition tồn tại |
| **Scheduler** | Daily maintenance cycle (ensure + drop + health) |
| **SQL Functions** | `create_monthly_partitions()`, `drop_old_partitions()`, `check_partition_health()` |

### Migration

```sql
-- Run once:
psql -d trustchecker -f prisma/migrations/partition_tables.sql
```

- Tự động rename bảng cũ thành `*_legacy` nếu chưa partitioned
- Tạo partitions cho tháng 01-06/2026
- Safe to re-run (idempotent)

---

## 17. Domain Layer — Clean Architecture (v9.4)

> [!IMPORTANT]
> **v9.4 nâng cấp**: Formal domain layer với bounded contexts, domain invariants, saga orchestrator, và transactional unit of work.

### Bounded Contexts (6)

| Context | Aggregate Roots | Invariants | Key Events |
|---------|-----------------|------------|------------|
| **Product Authenticity** | Product, QRCode | 5 (e.g., product → one org only) | scan.verified, fraud_detected |
| **Supply Chain** | Shipment, Inventory | 5 (e.g., shipment status ordering) | shipment.created, checkpoint |
| **Risk Intelligence** | FraudAlert, TrustScore | 6 (e.g., score 0-100 range) | fraud.alert.created, resolved |
| **ESG Compliance** | Sustainability, Carbon | 4 (e.g., emissions non-negative) | certification.verified |
| **Identity** | User, Session | 5 (e.g., password 12+ chars) | user.created, mfa.enabled |
| **Billing** | BillingPlan, Invoice | 5 (e.g., invoice immutable after paid) | payment.completed |

### Saga Orchestrator (3 Sagas)

| Saga | Steps | Compensation |
|------|-------|--------------|
| **ScanVerification** | validateProduct → runAI → calculateTrust → notifyStakeholders | revert trust score → cancel AI → remove scan |
| **ShipmentLifecycle** | createShipment → validatePartner → allocateInventory → notifyCarrier | release inventory → cancel partner → archive shipment |
| **FraudInvestigation** | createAlert → analyzePatterns → assessImpact → triggerResponse | cancel response → archive analysis → downgrade alert |

### Unit of Work + Event Outbox

```
Transaction Start → Operations (create/update/delete)
                  → Domain Events queued in outbox
                  → Commit (operations + events atomically)
                  → Post-commit: Publish events to bus
```

- **Express middleware**: Auto-creates UoW per request, commits on 2xx, rollbacks on error
- **Outbox pattern**: Events persisted in same DB transaction, published after commit

---

## 18. CQRS & Read Replica (v9.4)

> [!IMPORTANT]
> **v9.4 nâng cấp**: Command/Query separation với materialized views, read replica routing, và event-driven cache invalidation.

### CQRS Query Store

| Materialized View | Fonte | Invalidated By |
|-------------------|-------|----------------|
| **Dashboard Stats** | scans, products, fraud alerts | scan.*, fraud.* |
| **Scan Verification** | product + scans + trust score | scan.verified |
| **SCM Timeline** | shipments + checkpoints | shipment.* |
| **Fraud Overview** | fraud alerts + risk scores | fraud.* |

- Redis cache (TTL 60-300s) with in-memory fallback
- Event bus subscription for automatic invalidation
- SQL-based view builders for fresh data

### Read Replica Manager

| Feature | Mô tả |
|---------|--------|
| **Auto-routing** | GET → replica, POST/PUT/DELETE → primary |
| **Health checks** | Every 30s via `SELECT 1` |
| **Fallback** | Auto-route to primary if replica unhealthy |
| **Express middleware** | Transparently routes via `req.dbConnection` |
| **Env config** | `DATABASE_READ_URL` for replica connection |

---

## 19. WAF & API Gateway (v9.4)

> [!IMPORTANT]
> **v9.4 nâng cấp**: Enterprise-grade request security (WAF) và API management (Gateway) với quota enforcement.

### WAF — 6 Detection Layers

| Layer | Patterns | Action |
|-------|----------|--------|
| **SQL Injection** | 6 regex patterns (union select, benchmark, sleep...) | Block 403 |
| **XSS** | 10 patterns (script tags, javascript:, event handlers...) | Block 403 |
| **Path Traversal** | 6 patterns (../, %2F, /etc/passwd...) | Block 403 |
| **Bot Detection** | 12 user-agents (sqlmap, nikto, burp, nuclei...) | Block 403 |
| **Suspicious Headers** | x-forwarded-host, x-original-url, x-rewrite-url | Block 403 |
| **IP+Endpoint Rate** | Per IP per endpoint per minute | Block 403 |

- WAF is **first middleware** in stack — blocks before any processing
- IP whitelist support for trusted services
- Custom rule API for tenant-specific rules
- Full statistics: blocked count by category, block rate %

### API Gateway Policy

| Feature | Mô tả |
|---------|--------|
| **Quota Management** | Per-plan daily/monthly limits |
| **API Key Management** | `tc_` prefixed keys, IP whitelist/blacklist per key |
| **Response Sanitization** | Strips 15 internal fields (password_hash, mfa_secret...) |
| **Request Transformation** | Configurable transform rules |

#### Quota Limits per Plan

| Plan | Daily | Monthly |
|------|-------|---------|
| Free | 100 | 1,000 |
| Starter | 1,000 | 20,000 |
| Professional | 10,000 | 200,000 |
| Enterprise | 100,000 | 2,000,000 |

### New API Endpoints (v9.4)

| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/api/domain/registry` | Bounded context stats |
| GET | `/api/domain/invariants` | All 30 domain invariants |
| GET | `/api/domain/sagas` | Saga orchestrator status + history |
| GET | `/api/query/dashboard` | CQRS materialized dashboard |
| GET | `/api/query/scan/:productId` | CQRS scan verification |
| GET | `/api/security/waf` | WAF statistics (admin only) |

## 20. Deployment & Infrastructure

### Docker Architecture

| Container | Image | Ports |
|-----------|-------|-------|
| `trustchecker-api` | Node.js 18-slim | 4000 |
| `trustchecker-sim` | Python 3.11-slim + Gunicorn | 5001 |
| `trustchecker-det` | Python 3.11-slim + Gunicorn | 5002 |
| `trustchecker-ana` | Python 3.11-slim + Gunicorn | 5003 |
| `postgres` | PostgreSQL 16 | 5432 |
| `redis` | Redis 7-alpine | 6379 |

### Deployment Configs

| File | Mô tả |
|------|--------|
| `Dockerfile` | Multi-stage Node.js build |
| `docker-compose.yml` | Full stack (SaaS) |
| `docker-compose.onprem.yml` | **v9.1** — Air-gapped on-premise |
| `services/*/Dockerfile` | Python AI services (Gunicorn 4 workers) |

---

## 21. On-Premise / Self-Hosted

### License Management (v9.1.1 — Ed25519 Signed)

| Feature | Mô tả |
|---------|--------|
| **Signature** | Ed25519 digital signatures (tamper-proof) |
| **Format** | `base64({ payload, signature })` |
| **Fingerprint** | SHA-256(hostname + CPU + arch + MAC) |
| **Grace period** | 30 ngày sau expiration |
| **Dev mode** | Ephemeral keypair, unsigned licenses accepted |
| **Production** | Unsigned rejected, requires valid signature |

### License Endpoints (6)

| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/api/license/activate` | Activate license key |
| GET | `/api/license/status` | Trạng thái license |
| POST | `/api/license/deactivate` | Deactivate (transfer) |
| GET | `/api/license/fingerprint` | Hardware fingerprint |
| POST | `/api/license/generate` | **Internal** — Tạo signed license |
| GET | `/api/license/public-key` | Public key cho offline verification |

### On-Prem Docker Compose

- **Air-gapped**: Không telemetry, không external calls
- **Data**: Bind mounts (`./data/`) — Customer controls data
- **Redis**: Password required
- **Monitoring**: Optional via Docker profiles (Prometheus + Grafana)
- **Certs**: Mount point cho TLS certificates

---

## 22. Testing & Verification

| Metric | Giá trị |
|--------|---------|
| Test Framework | Jest + supertest |
| Security Tests | `tests/security.test.js` — 30 tests |
| API Tests | `tests/api.test.js` — 38 tests |
| Endpoint Verify | `scripts/verify-endpoints.js` — 272 endpoints |
| Migration Script | `scripts/migrate-tenancy.js` — Idempotent |

### Khởi động

```bash
# Development
npm run dev

# Production (Docker)
docker compose up -d

# On-Premise
docker compose -f deploy/docker/docker-compose.onprem.yml up -d

# Database
npx prisma migrate deploy && node server/seed.js

# v9.3: Table Partitioning (PostgreSQL only)
psql -d trustchecker -f prisma/migrations/partition_tables.sql

# Multi-Tenancy Migration
node scripts/migrate-tenancy.js

# RLS Policies (PostgreSQL only)
psql -d trustchecker -f prisma/migrations/rls_policies.sql

# Testing
npm test
```

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Operator | `operator` | `operator123` |
| Viewer | `viewer` | `viewer123` |

---

## 23. Khuyến nghị chiến lược

### 🔴 Ưu tiên cao — Cần làm trước khi mở bán rộng

| # | Khuyến nghị | Trạng thái |
|---|-------------|------------|
| ~~1~~ | ~~Event-driven architecture~~ | ✅ **Hoàn thành v9.3** — Redis Streams event bus, 15 events, 5 domains |
| ~~2~~ | ~~Worker layer~~ | ✅ **Hoàn thành v9.3** — 11 queues, priority, per-tenant throttle, DLQ |
| ~~3~~ | ~~Frontend tách modules~~ | ✅ **Hoàn thành v9.2** — 53 ES6 modules |
| 4 | **AI model metrics** (MAPE, RMSE) | ⏳ Chưa làm |
| 5 | **Secrets vault** | ⏳ Chưa làm |

### 🟡 Ưu tiên trung bình — Roadmap Q2-Q3

| # | Khuyến nghị | Trạng thái |
|---|-------------|------------|
| 6 | **ESG: GHG Protocol + ISO 14064** | ⏳ Chưa làm |
| ~~7~~ | ~~i18n (Vietnamese + English)~~ | ✅ **Hoàn thành v9.2** — 70 keys |
| 8 | **Blockchain → Trust Anchor** | ⏳ Chưa làm |
| ~~9~~ | ~~CQRS cho tracking queries~~ | ✅ **Hoàn thành v9.4** — Query Store, 4 materialized views, Read Replica |
| 10 | **Encryption at rest** | ⏳ Chưa làm |

### 🟢 Ưu tiên thấp — Competitive advantage

| # | Khuyến nghị | Trạng thái |
|---|-------------|------------|
| ~~11~~ | ~~API versioning (`/v1/`, `/v2/`)~~ | ✅ **Hoàn thành v9.2** |
| ~~12~~ | ~~Observability (tracing, metrics, SLO)~~ | ✅ **Hoàn thành v9.3** — W3C Trace, 24 metrics, 6 SLOs |
| ~~13~~ | ~~Data partitioning~~ | ✅ **Hoàn thành v9.3** — 3 bảng, monthly, BRIN indexes |
| 14 | Helm chart cho Kubernetes | ⏳ Chưa làm |
| 15 | Drift detection cho AI models | ⏳ Chưa làm |
| 16 | Offline queue cho PWA scans | ⏳ Chưa làm |
| 17 | Accessibility (ARIA, focus management) | ⏳ Chưa làm |

### 📊 Định vị cạnh tranh

| Đối thủ | Điểm mạnh | TrustChecker khác biệt |
|---------|-----------|------------------------|
| IBM Blockchain | Enterprise reputation | Linh hoạt, SME-friendly, AI native |
| SAP SCM Cloud | ERP integration | Customizable, nhanh deploy |
| VeChain | Public blockchain | Private + hybrid, ESG focus |
| Oracle SCM | Scale | Giá thấp hơn, ASEAN focus |

> [!IMPORTANT]
> **Điểm mạnh lớn nhất**: Khả năng trở thành **Trust Infrastructure cho xuất khẩu ASEAN**.
> Tập trung chống giả + traceability + ESG compliance + risk scoring cho 1 ngành cụ thể (thủy sản, cà phê, mỹ phẩm) → dominate niche trước khi mở rộng.

---

> **Tổng kết v9.4**: 36 route modules, 283 API endpoints (/api/ + /api/v1/), 41 database models, 17 JS engines, 3 Python AI services với Circuit Breaker, **14 middleware layers** (+ WAF, API gateway, tracing, metrics, SLO, structured logger), 58 ES6 frontend modules (reactive store + virtual table + lazy charts + audit view + analytics compare), **Clean Architecture domain layer** (6 bounded contexts, 30 invariants, 3 sagas, Unit of Work + Event Outbox), **CQRS** (4 materialized views, read replica manager), **WAF** (6-layer detection: SQLi, XSS, traversal, bot, headers, rate), **API Gateway** (quota per plan, API key management, response sanitization), Redis Streams event bus (15 domain events, 5 domains, consumer groups, DLQ), priority queue (11 queues, per-tenant throttle), Prometheus metrics (24 metrics, p50/p95/p99), 6 SLOs (99.9% availability, p99<500ms, error budgets), PostgreSQL partitioning (3 bảng, monthly, BRIN indexes), full multi-tenancy với RLS, feature gating FE/BE, Ed25519 license signing, on-premise deployment support.
