# Tony is King — Tài Khoản Mẫu

**Công ty**: Tony is King (tonyisking.com)  
**Mật khẩu mặc định**: `123qaz12`  
**Seed script**: `node scripts/seed-tonyisking.js`

---

## Tài Khoản Platform (L5 — Quản trị hạ tầng)

| # | Email | Mật khẩu | Role | Chức năng chính |
|---|---|---|---|---|
| 1 | `admin@tonyisking.com` | `123qaz12` | **Super Admin** | Quản trị hạ tầng, tạo user, restart PM2, monitor health. KHÔNG có quyền business (pricing, trust score, carbon) |
| 2 | `security@tonyisking.com` | `123qaz12` | **Platform Security** | Key rotation, incident declare/resolve, session monitoring, API access approve |
| 3 | `datagov@tonyisking.com` | `123qaz12` | **Data Governance Officer** | Data classification, retention policy, GDPR masking, cross-border transfer |

## Tài Khoản Governance (L4 — Quản trị toàn cục)

| # | Email | Mật khẩu | Role | Chức năng chính |
|---|---|---|---|---|
| 4 | `ggc@tonyisking.com` | `123qaz12` | **GGC Member** | Graph schema propose/approve/reject, governance oversight |
| 5 | `riskcom@tonyisking.com` | `123qaz12` | **Risk Committee** | Risk scoring weights, fraud case approve, anomaly resolve, lineage replay |
| 6 | `ivu@tonyisking.com` | `123qaz12` | **IVU Validator** | Model certification, bias audit, feature drift monitor, CIE passport validate |

## Tài Khoản Tenant Governance (L3 — Quản trị công ty)

| # | Email | Mật khẩu | Role | Chức năng chính |
|---|---|---|---|---|
| 7 | `companyadmin@tonyisking.com` | `123qaz12` | **Company Admin** | Quản lý user/role trong tenant, full sidebar, IAM controller |
| 8 | `ceo@tonyisking.com` | `123qaz12` | **Executive / CEO** | Dashboard overview, reports, trust score view, CIE oversight |
| 9 | `carbon@tonyisking.com` | `123qaz12` | **Carbon Officer** | Upload emission data, request carbon mint, ESG manage |
| 10 | `compliance@tonyisking.com` | `123qaz12` | **Compliance Officer** | GDPR, SOC2, ISO27001, CIE passport approve, audit log view |

## Tài Khoản Operations (L2 — Vận hành)

| # | Email | Mật khẩu | Role | Chức năng chính |
|---|---|---|---|---|
| 11 | `ops@tonyisking.com` | `123qaz12` | **Operations Manager** | Product CRUD, QR generate, scan, evidence, SCM, inventory, logistics |
| 12 | `risk@tonyisking.com` | `123qaz12` | **Risk Officer** | Fraud investigate/resolve, anomaly detection, KYC manage |
| 13 | `scm@tonyisking.com` | `123qaz12` | **SCM Analyst** | Supply chain graph, route risk, partner scoring, EPCIS, digital twin |

## Tài Khoản Technical (L1 — Kỹ thuật)

| # | Email | Mật khẩu | Role | Chức năng chính |
|---|---|---|---|---|
| 14 | `dev@tonyisking.com` | `123qaz12` | **Developer** | API key manage, webhook, blockchain view |
| 15 | `blockchain@tonyisking.com` | `123qaz12` | **Blockchain Operator** | Anchor/verify, hash verification, NFT view, carbon credit anchor |
| 16 | `operator@tonyisking.com` | `123qaz12` | **Operator** | Product CRUD, scan, QR generate, evidence upload |
| 17 | `auditor@tonyisking.com` | `123qaz12` | **Auditor** | Read-only audit trail, compliance view, reports |
| 18 | `viewer@tonyisking.com` | `123qaz12` | **Viewer** | Read-only: dashboard, products, scans, trust scores |

---

## Dữ Liệu Mẫu Đã Seed

| Tính năng | Số lượng | Mô tả |
|---|---|---|
| **Organization** | 1 | Tony is King (plan: enterprise) |
| **Users** | 18 | Đầy đủ 18 role (L1–L5) |
| **RBAC Roles** | 18 | Gán đầy đủ permissions cho mỗi role |
| **Products** | 15 | Coffee, Tea, Cosmetics, Pharma, Electronics... |
| **QR Codes** | 15 | 1 QR / sản phẩm |
| **Batches** | 15 | 1 batch / sản phẩm |
| **Scan Events** | 200 | Scan từ 18 thành phố toàn cầu |
| **Trust Scores** | 15 | Score cho mỗi sản phẩm |
| **Fraud Alerts** | 25 | Velocity, geo mismatch, counterfeit... |
| **Blockchain Seals** | 50 | Hash-chained seals |
| **Partners** | 12 | Logistics, distributor, manufacturer... |
| **Shipments** | 20 | DHL, FedEx, Maersk... |
| **IoT Readings** | 80 | Temperature, humidity, vibration |
| **Supply Chain Events** | 50 | Harvest → delivery lifecycle |
| **Inventory** | 15 | Stock levels per product |
| **KYC Businesses** | 10 | Verified, pending, under review |
| **KYC Checks** | 40 | 4 checks / business |
| **Certifications** | 10 | ISO, HACCP, GMP, Fair Trade... |
| **Compliance Records** | 12 | GDPR, ISO27001, FDA, EUDR, SOC2 |
| **Evidence Items** | 12 | Certificates, lab reports, legal docs |
| **Anomaly Detections** | 15 | Velocity spike, geo anomaly... |
| **Sustainability Scores** | 15 | Carbon, water, recyclability, ESG grades |
| **NFT Certificates** | 8 | Authenticity, origin, sustainability |
| **Leak Alerts** | 6 | Alibaba, DHgate, Temu... |
| **Billing Plans** | 3 | Enterprise, Pro, Starter |
| **Invoices** | 6 | 3 months billing history |
| **Usage Metrics** | 12 | Scans, API calls, storage |
| **Support Tickets** | 5 | General, billing, technical |
| **Audit Log** | 40 | Login, create, update, verify... |
| **SLA Definitions** | 6 | Delivery time, quality... |
| **Crisis Events** | 3 | Drill mode simulations |
| **Ops Incidents** | 4 | SEV1–SEV4 incidents |
| **Carbon Passports** | 5 | CIE emissions data |
| **Validator Nodes** | 4 | AP-SE, EU-W, US-E, AP-E |
| **System Settings** | 8 | Platform configuration |

---

## Sidebar Access theo Role

| Role | Dashboard | Products | SCM | Fraud | KYC | Carbon | Compliance | Reports | Admin |
|---|---|---|---|---|---|---|---|---|---|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Platform Security | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Data Gov Officer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Company Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Executive/CEO | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ops Manager | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Risk Officer | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Compliance Officer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| SCM Analyst | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Developer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Blockchain Op | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Carbon Officer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Auditor | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Viewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
