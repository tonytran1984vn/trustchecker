# TrustChecker v9.4.1 — Bản Giới Thiệu Chi Tiết Toàn Hệ Thống

## Tổng Quan

**TrustChecker** là một nền tảng Enterprise Digital Trust Infrastructure — hệ thống quản lý niềm tin kỹ thuật số doanh nghiệp, xây dựng trên kiến trúc multi-org với 77 route modules, 91 engine files, và 68+ nhóm API. Hệ thống bao phủ toàn bộ vòng đời chuỗi cung ứng: từ xác thực sản phẩm, phát hiện gian lận, quản lý rủi ro, tới ESG/Carbon, compliance và governance cấp enterprise.

### Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Express.js 5.x (Node.js) |
| **Database** | PostgreSQL (Prisma ORM, pg adapter) |
| **Auth** | JWT + MFA (TOTP) + Passkey (WebAuthn) + OAuth 2.0 |
| **Frontend** | Vanilla JS SPA, 242KB CSS design system |
| **Cache** | Redis (optional) + In-memory LRU |
| **Queue** | In-memory job queue + WebSocket |
| **Deployment** | PM2 + Nginx + Docker + Let's Encrypt |

---

## 1. 🔐 Authentication & Authorization

### 1.1 Multi-Layer Auth
- **JWT Token System**: Access token (15p) + Refresh token (7d), issuer/audience validation
- **MFA**: TOTP setup/verify/disable, backup codes
- **Passkey/WebAuthn**: Hardware key registration, passwordless login
- **OAuth 2.0**: Google + GitHub SSO
- **Session Management**: Device fingerprint, IP tracking, session revocation

### 1.2 RBAC (Role-Based Access Control)
Hierarchical multi-org model:

```
super_admin > platform_admin > owner > admin > manager > operator > viewer > public
```

- **74+ Granular Permissions**: `products:create`, `scm:manage`, `billing:manage`, `admin:manage`, ...
- **Scope Levels**: `platform`, `tenant`, `business`
- **Constitutional RBAC**: Kill-switch, dual-approval workflows
- **SoD (Separation of Duties)**: Conflict detection + waiver system

### 1.3 Multi-Tenancy
- **Organization-based Isolation**: `org_id` trên mọi resource
- **Tenant Middleware**: Auto-filter/inject org_id ở mọi query
- **Cross-Tenant Protection**: Contagion detection, blast-radius analysis
- **Tenant Admin**: Full self-service (settings, users, integrations, feature flags)

---

## 2. 📦 Product Management & QR

### 2.1 Product Registry
- CRUD sản phẩm với SKU, category, manufacturer, origin country
- Trust score tự động tính (0-100)
- Batch management: số lô, ngày sản xuất, hạn sử dụng
- Product lifecycle tracking

### 2.2 QR Code System
- **Tạo QR**: UUID-based unique codes, auto-generate khi tạo sản phẩm
- **Scan & Verify**: Real-time validation với fraud scoring
- **Anti-Counterfeit**: Device fingerprint, GPS location, scan chain analysis
- **Dashboard**: Thống kê scan theo thời gian, geo distribution
- **Bulk Operations**: Generate/revoke hàng loạt

### 2.3 Scan Intelligence
- Mỗi scan event lưu: IP, GPS, device fingerprint, user agent
- Fraud score real-time (ML-based)
- Trust score per scan
- Response time tracking
- Geo-fence detection

---

## 3. 🔗 Supply Chain Management (SCM)

### 3.1 Partner Management
- Partner registry (distributor, logistics, retailer, warehouse, manufacturer)
- KYC status tracking per partner
- Trust score per partner (auto-calculated)
- Risk level classification: critical/high/medium/low
- API key per partner for integration

### 3.2 Inventory & Warehouse
- Real-time stock tracking per location/partner
- Min/max stock alerts
- Batch-level inventory
- Last sync timestamps

### 3.3 Logistics & Shipments
- Shipment tracking: carrier, tracking number, GPS trail
- Multi-stop route tracking
- Estimated vs actual delivery
- IoT sensor readings: temperature, humidity (threshold alerts)
- SLA definitions and violation tracking

### 3.4 EPCIS 2.0 (Electronic Product Code Information Services)
- GS1 EPCIS 2.0 compliant event capture
- Event types: ObjectEvent, AggregationEvent, TransformationEvent, TransactionEvent
- Full event query with temporal/spatial filters
- Event statistics and analytics

### 3.5 Supply Route Management
- Define supply chains as ordered partner sequences
- Route integrity monitoring
- Channel rules engine (severity + auto-actions)
- Route breach detection and alerting
- Geo-fence enforcement
- Route simulation (what-if analysis)

### 3.6 Leak Detection & Monitoring
- **Unauthorized Distribution**: Detect products on unauthorized platforms
- **Gray Market Detection**: Cross-region leak identification
- **Stats & Analytics**: Total/open/resolved leaks, avg risk score
- **Trend Analysis**: Weekly leak trends, platform trends, type distribution
- **Distributor Risk**: Link leaks back to distributors

---

## 4. 🧠 AI & Machine Learning

### 4.1 Fraud Detection Engine
- Multi-factor fraud scoring (velocity, geo, device, behavioral)
- Anomaly detection with severity classification
- Real-time fraud alerts with auto-escalation
- Historical pattern analysis

### 4.2 Trust Score Engine
- Composite score: fraud_factor + consistency + compliance + history
- Per-product and per-partner scoring
- Explanation generation (interpretable AI)

### 4.3 SCM AI Module
- **Demand Forecasting**: ML-based demand prediction per product
- **PageRank Analysis**: Supply chain node importance scoring
- **Toxic Node Detection**: Identify high-risk nodes in supply network
- **Network Health**: Graph centrality + toxicity scoring
- **Route Optimization**: A* pathfinding through supply chain graph

### 4.4 ML Engine
- **Feature Store**: Behavioral features extraction/management
- **Model Training**: Training runs with hyperparams, dataset management
- **Model Performance**: AUC-ROC, precision, recall, F1, confusion matrix
- **A/B Testing**: Model comparison framework
- **Auto-Retraining**: Trigger-based model updates

### 4.5 Digital Twin
- Virtual supply chain model
- KPI simulation
- Anomaly prediction in digital space
- What-if scenario analysis

### 4.6 AI Assistant
- Interactive AI chat endpoint for supply chain queries
- Context-aware recommendations

---

## 5. 📊 Risk Management

### 5.1 Risk Radar
- 360° risk overview dashboard
- Multi-dimensional heatmap (partner × risk category)
- Real-time alert feed

### 5.2 Risk Graph
- Network-based risk propagation analysis
- Risk correlation engine
- Node-level and cluster-level risk scoring

### 5.3 Risk Model Governance
- Versioned risk models (weights, factors, thresholds)
- Model change request workflow (propose → review → deploy)
- False positive / true positive rate tracking
- Model audit trail

### 5.4 Forensic Investigation
- Case-based forensic workflow
- Scan chain analysis
- Device comparison
- Factor breakdown (Evidence Resolution Score)
- Case lifecycle: open → investigate → verdict → close

### 5.5 Duplicate Classification
- Scan event classification: genuine, counterfeit, parallel_import, warranty_fraud
- Confidence scoring
- ML + rule-based hybrid classification
- Geo/device/time-gap signal analysis

---

## 6. 🌿 Carbon & ESG

### 6.1 Carbon Footprint (Scope 1/2/3)
- GHG Protocol compliant carbon accounting
- Scope 1 (direct), Scope 2 (energy), Scope 3 (supply chain)
- Per-product carbon footprint
- Emission factor database (IPCC/GWP)
- Carbon leaderboard (best/worst performers)

### 6.2 Carbon Credit Trading
- Carbon credit marketplace
- Credit issuance, transfer, retirement
- Portfolio management
- Price tracking and valuation
- Registry integration (Verra, Gold Standard)

### 6.3 Carbon Integrity Engine (CIE v2.0)
- Carbon passport per product
- Double-counting prevention
- Anomaly detection in carbon data
- Verification workflows

### 6.4 Carbon Officer Workspace
- Officer dashboard & action items
- Carbon compliance monitoring
- Reporting & target tracking

### 6.5 Sustainability Scoring
- Multi-factor sustainability: carbon, water, recyclability, ethical sourcing
- Grade system (A+ to F)
- Certification tracking
- ESG reporting

### 6.6 Green Finance
- EU taxonomy classification
- Green bond/loan tracking
- ESG-linked financial instruments

---

## 7. ✅ Compliance & Governance

### 7.1 GDPR Compliance
- **Data Subject Rights**: Access, rectification, erasure, portability, objection
- **Consent Management**: Granular consent tracking per data type
- **Data Processing Records**: Article 30 compliant register
- **Re-authentication for Delete**: Sensitive operations require password confirmation
- **Data Retention Policies**: Table-level retention with auto-archive

### 7.2 RegTech
- Regulatory framework compliance tracking
- Multi-jurisdiction support
- Automated compliance checks

### 7.3 Governance
- Constitutional governance engine
- Dual-approval workflows for critical operations
- Audit hash chain (tamper-evident audit log)
- Crisis management playbook

### 7.4 Audit Log
- Immutable audit trail for all system operations
- Actor, action, entity, details, IP, timestamp
- Full-text search and filtering
- Export for external auditors

---

## 8. 🏗️ Platform & Administration

### 8.1 Multi-Org Platform
- Platform stats, health monitoring
- Feature flag management per tenant
- Notification system (in-app + email)
- Branding customization per tenant
- Email system with templates

### 8.2 Admin Panel
- User management (CRUD, role assignment, lock/unlock)
- System-wide statistics
- Platform metrics

### 8.3 System Operations
- **Backup/Restore**: Full database snapshot and restore
- **Seed**: Demo data population
- **Purge**: Data cleanup (preserves users)
- **System Info**: 80 tables, memory, uptime, PID

### 8.4 Licensing
- License key validation
- Feature tier enforcement
- Expiry management

---

## 9. 💰 Billing & Monetization

### 9.1 Subscription Plans (5-Tier)
| Plan | Scans | API Calls | Storage |
|---|---|---|---|
| Free | 100 | 500 | 50MB |
| Starter | 1,000 | 5,000 | 500MB |
| Pro | 10,000 | 50,000 | 5GB |
| Business | 100,000 | 500,000 | 50GB |
| Enterprise | ∞ | ∞ | ∞ |

### 9.2 Usage-Based Pricing
- Per-scan, per-NFT-mint, per-carbon-calc metering
- Overage charges calculation
- Monthly invoice generation

### 9.3 Enterprise Features
- Custom enterprise quote generator
- Annual billing with savings
- Plan comparison tool
- Webhook events (payment.succeeded, subscription.cancelled)

### 9.4 SDK & API Economy
- API key generation & revocation
- SDK code snippets (JavaScript, Python, cURL)
- API economy metrics (marketplace readiness)
- Transaction fee engine

---

## 10. 🛡️ Security

### 10.1 Web Application Firewall (WAF)
- SQL injection detection
- XSS protection
- Path traversal prevention
- Bot/scanner detection
- Suspicious header analysis
- Deep body scanning

### 10.2 Security Hardening
- Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting (auth: 10/15min, scan: 100/min, API: 200/min, export: 5/min)
- CORS whitelist configuration
- Password strength enforcement (min 8 chars, mixed case, numbers)
- Account lockout after failed attempts

### 10.3 Blockchain Seals
- Tamper-proof data anchoring
- Hash chains with Merkle roots
- Block-level indexing
- Seal verification

---

## 11. 📈 Reporting & Analytics

### 11.1 Report Templates
- Pre-built report templates (compliance, sustainability, fraud)
- Custom report builder
- Export to PDF/CSV

### 11.2 Analytics
- Time-series analysis
- Comparative analytics (period vs period)
- Public dashboard (no auth required)
- Real-time WebSocket updates

---

## 12. 🔧 Operations & Infrastructure

### 12.1 Ops Monitoring
- System health metrics
- Process monitoring (PM2 integration)
- Error rate tracking
- Circuit breaker status

### 12.2 Ops Data
- Pipeline/ERP/Production/Distribution data views
- SCOR model aligned workflow
- KPI dashboards

### 12.3 Infrastructure
- Network topology visualization
- Infrastructure maturity scoring
- Data sovereignty engine
- Kill-switch capability

---

## 13. 🏛️ Enterprise Governance (Super Admin / Owner)

### 13.1 Constitutional Framework
- Economic governance charter
- Network power charter
- Revenue governance
- Fee distribution engine

### 13.2 IPO-Grade Readiness
- External oversight scoring
- Capital adequacy ratio (CAR)
- Decentralization KPIs
- Legal entity structuring
- Financial reporting engine
- Treasury/liquidity management
- Market narrative engine

### 13.3 Systemic Risk
- Monte Carlo simulation (worker-based)
- Systemic stress testing
- Cross-tenant contagion analysis
- Economic risk engine
- Risk reserve management

### 13.4 Architecture Integrity
- Architecture coherence scoring
- Integration locking engine
- Platform architecture engine
- Upgrade governance
- Gap coverage analysis

---

## 14. 🎫 NFT & Digital Certificates

- NFT certificate minting (authenticity, compliance, sustainability)
- Token-based ownership tracking
- Transfer history
- Expiry management
- Blockchain-anchored metadata hash

---

## 15. 📞 Customer Support

- Ticket system (create, assign, resolve)
- Priority levels: low, medium, high, critical
- Ticket messages with role-based threading
- Resolution tracking
- SLA enforcement

---

## 16. 🔌 Integrations & Webhooks

- Webhook system with signature verification (HMAC-SHA256)
- External event ingestion
- Integration settings per tenant
- Real-time event broadcasting (WebSocket)

---

## API Architecture

```
/api/auth/*              → Authentication (login, register, MFA, passkey, OAuth)
/api/products/*          → Product management
/api/qr/*                → QR code generation & verification
/api/scm/*               → Supply chain (tracking, inventory, logistics, partners)
/api/scm/leaks/*         → Leak detection & monitoring
/api/scm/graph/*         → TrustGraph (PageRank, toxic nodes, clusters)
/api/scm/epcis/*         → EPCIS 2.0 events
/api/scm/ai/*            → AI forecasting & analytics
/api/scm/risk/*          → Risk radar & heatmap
/api/scm/carbon/*        → Carbon accounting (Scope 1/2/3)
/api/scm/carbon-credit/* → Carbon credit trading
/api/scm/twin/*          → Digital twin simulation
/api/scm/supply/*        → Supply route management
/api/scm/risk-model/*    → Risk model governance
/api/scm/forensic/*      → Forensic investigation
/api/scm/classify/*      → Duplicate classification
/api/scm/ml/*            → ML engine management
/api/scm/code-gov/*      → QR code governance
/api/scm/integrity/*     → Data integrity & lineage
/api/kyc/*               → KYC / Business verification
/api/evidence/*          → Evidence vault
/api/trust/*             → Stakeholder & ratings
/api/billing/*           → Billing, pricing, SDK, transaction fees
/api/compliance/*        → GDPR compliance
/api/anomaly/*           → Anomaly detection
/api/sustainability/*    → ESG scoring
/api/nft/*               → NFT certificates
/api/admin/*             → User management
/api/system/*            → Backup, restore, info
/api/platform/*          → Platform management
/api/tenant/*            → Tenant administration (205KB — largest module)
/api/governance/*        → Governance engine
/api/ops/*               → Operations monitoring
/api/hardening/*         → Security hardening score
/api/risk-graph/*        → Risk propagation analysis
/api/identity/*          → Identity management
/api/license/*           → License management
/api/reports/*           → Report generation
/api/notifications/*     → Notification system
/api/wallet/*            → Wallet & payment
/api/support/*           → Customer support
/api/cie/*               → Carbon Integrity Engine
/api/crisis/*            → Crisis management
/api/public/*            → Public endpoints (no auth)
```

---

## Database

**80 tables** in PostgreSQL covering:
- **Auth**: `users`, `sessions`, `refresh_tokens`, `passkey_credentials`, `rbac_roles`, `rbac_permissions`, `rbac_role_permissions`, `rbac_user_roles`
- **Product**: `products`, `qr_codes`, `scan_events`, `batches`
- **SCM**: `partners`, `shipments`, `inventory`, `supply_chain_events`, `supply_chain_graph`, `iot_readings`, `sla_definitions`, `sla_violations`
- **Security**: `fraud_alerts`, `trust_scores`, `blockchain_seals`, `audit_log`, `anomaly_detections`
- **Leak**: `leak_alerts`
- **Carbon**: `carbon_emissions`, `carbon_credits`, `sustainability_scores`, `emission_factors`
- **Risk**: `risk_models`, `model_change_requests`, `forensic_cases`, `duplicate_classifications`
- **ML**: `feature_store`, `model_performance`, `training_runs`
- **Compliance**: `compliance_records`, `data_retention_policies`, `certifications`
- **Business**: `billing_plans`, `invoices`, `usage_metrics`, `organizations`
- **Support**: `support_tickets`, `ticket_messages`
- **System**: `system_settings`, `webhook_events`, `nft_certificates`, `evidence_items`

**Tổng dữ liệu**: ~97,620 rows trên VPS production.

---

## Deployment

| Environment | Details |
|---|---|
| **Production VPS** | tonytran.work (Google Cloud) |
| **Reverse Proxy** | Nginx → `localhost:4000` |
| **SSL** | Let's Encrypt (auto-renew) |
| **Process Manager** | PM2 (auto-restart, log rotation) |
| **Database** | PostgreSQL 15 (local) |
| **Containerization** | Docker + docker-compose (available) |

---

> **TrustChecker v9.4.1** — Enterprise Digital Trust Infrastructure
> 77 route modules × 91 engines × 80 database tables × 68+ API groups
> Built for institutional supply chain trust, compliance, and governance at scale.
