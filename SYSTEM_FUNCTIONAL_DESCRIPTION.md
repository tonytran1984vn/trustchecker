# TrustChecker – Mô Tả Chức Năng Hệ Thống

**Phiên bản:** Enterprise v10.0
**Cập nhật:** 2026-02-19
**Định vị:** Enterprise-Grade Digital Trust Infrastructure Platform
**Tiêu chuẩn:** SOC 2 Type II · ISO 27001 · Big4 Audit-Ready

---

## I. Tổng Quan Hệ Thống

TrustChecker là nền tảng quản trị niềm tin số (Digital Trust Infrastructure) cấp doanh nghiệp, cung cấp chuỗi cung ứng minh bạch, truy xuất nguồn gốc, phát hiện gian lận, và kiểm soát rủi ro cho hàng hóa thật.

### Kiến trúc 7 chế độ (7-Mode Architecture)

| # | Chế độ | Vai trò | Chủ đề | Trọng tâm |
|---|---|---|---|---|
| 1 | **Control Plane** | `super_admin` | Vàng (Gold) | Quản trị nền tảng đa thuê bao |
| 2 | **Executive** | `executive` | Indigo | Ra quyết định chiến lược |
| 3 | **Operations** | `ops_manager` | Teal | Quản lý vận hành chuỗi cung ứng |
| 4 | **Risk** | `risk_officer` | Đỏ/Cam (Red/Amber) | Phát hiện & xử lý gian lận |
| 5 | **Compliance** | `compliance_officer` | Tím (Purple) | Kiểm soát tuân thủ & quản trị |
| 6 | **IT Admin** | `developer` | Cyan | Bảo mật, tích hợp, hạ tầng kỹ thuật |
| 7 | **Business** | `admin` / `manager` / `operator` | Chuẩn | Quản lý nghiệp vụ doanh nghiệp |

### RBAC đa vai trò (Multi-Role RBAC)

- **125 quyền nguyên tử** (atomic permissions) chia thành 8 miền
- **15-25 vai trò** tùy chỉnh (custom roles)
- **Gói vai trò** (Role Bundles): Starter / Growth / Enterprise
- **Chuyển đổi vai trò** (Role Switcher): 1 người có thể giữ nhiều vai trò, chuyển đổi qua dropdown
- **SoD Engine**: Phát hiện xung đột quyền, chặn self-approval, flag cross-role conflict

---

## II. Chế Độ 1 — Control Plane (Super Admin)

> **Vai trò:** Quản trị viên nền tảng
> **Đối tượng:** Platform operator, SaaS owner
> **Quyền hạn:** Toàn quyền cross-tenant, quản trị hệ thống

### 2.1 Quản lý Thuê bao (Tenants)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Control Tower | `control-tower` | Dashboard tổng quan: số tenant, uptime, fraud alerts, revenue MRR |
| Danh sách Tenant | `sa-tenants` | Xem, tìm kiếm, lọc tất cả thuê bao |
| Tạo Tenant | `sa-create-tenant` | Tạo tenant mới với thông tin doanh nghiệp |
| Tenant bị đình chỉ | `sa-suspended` | Danh sách tenant bị suspend + lý do |
| Tenant đã lưu trữ | `sa-archived` | Tenant đã archive, có thể khôi phục |
| Chi tiết Tenant | `sa-tenant-detail` | Cấu hình chi tiết, metrics, lịch sử tenant |

### 2.2 Risk & Fraud (Platform-level)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Global Feed | `sa-risk-feed` | Feed sự kiện rủi ro real-time từ tất cả tenant |
| Risk Analytics | `sa-risk-analytics` | Phân tích xu hướng gian lận cross-tenant |
| Suspicious Tenants | `sa-suspicious` | Tenant bị flag có hành vi bất thường |
| AI Engine | `sa-ai-engine` | Cấu hình mô hình AI phát hiện gian lận |

### 2.3 Platform IAM (Identity & Access Management)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Platform Users | `sa-platform-users` | Quản lý user cấp nền tảng |
| Platform Roles | `sa-platform-roles` | Quản lý vai trò + permission matrix |
| Role Bundles | `sa-role-bundles` | 3 gói vai trò (Starter / Growth / Enterprise) + SoD rules |
| Permission Matrix | `sa-permission-matrix` | **125 quyền nguyên tử × 10 vai trò**, grid tương tác, 8 miền |
| Approval Workflows | `sa-approval-workflows` | **4-Eyes / 6-Eyes** engine: 9 workflow, pending queue, SLA tracking |
| Access Logs | `sa-access-logs` | Nhật ký truy cập platform-level |

### 2.4 System Health

| Chức năng | Trang | Mô tả |
|---|---|---|
| Services Status | `sa-services` | Trạng thái services (API, DB, Queue, Cache...) |
| Performance | `sa-performance` | Hiệu năng hệ thống, latency, throughput |
| Incidents | `sa-incidents` | Quản lý sự cố platform-level |

### 2.5 Commercial

| Chức năng | Trang | Mô tả |
|---|---|---|
| Revenue | `sa-revenue` | Doanh thu MRR, ARR, churn rate |
| Plans | `sa-plans` | Quản lý gói cước & pricing tiers |
| Usage | `sa-usage` | Thống kê sử dụng toàn platform |

### 2.6 Compliance & Security (Platform)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Audit Trail | `sa-audit` | Nhật ký kiểm toán immutable |
| Data Governance | `sa-data-gov` | Data residency, GDPR, retention (platform-level) |
| Key Management | `sa-keys` | Quản lý khóa mã hóa, rotation |
| Feature Flags | `sa-feature-flags` | Bật/tắt tính năng per-tenant |
| Risk Threshold | `sa-risk-threshold` | Ngưỡng cảnh báo rủi ro toàn cầu |
| Global Settings | `sa-global-settings` | Cấu hình hệ thống toàn cục |

---

## III. Chế Độ 2 — Executive (CEO / Board)

> **Vai trò:** Lãnh đạo cấp cao
> **Đối tượng:** CEO, CFO, Board member
> **Quyền hạn:** Chỉ đọc (read-only strategic dashboards)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Executive Overview | `exec-overview` | Dashboard chiến lược: KPI, trend, financial health |
| Risk Intelligence | `exec-risk-intel` | Bản đồ rủi ro, threat landscape, fraud summary |
| Market Insights | `exec-market` | Phân tích thị trường, đối thủ, brand protection |
| Performance | `exec-performance` | Hiệu quả hoạt động: SLA, throughput, quality |
| Board Reports | `exec-reports` | Báo cáo chuyên dụng cho Board, investor, regulator |

---

## IV. Chế Độ 3 — Operations (Ops Manager)

> **Vai trò:** Quản lý vận hành
> **Đối tượng:** Ops Manager, Warehouse Lead, QC Lead
> **Quyền hạn:** Quản lý batch, transfer, QR, shipment

### 4.1 Production

| Chức năng | Trang | Mô tả |
|---|---|---|
| Operations Dashboard | `ops-dashboard` | Metrics hôm nay: batches, transfers, alerts, bottlenecks |
| Create Batch | `ops-batch-create` | Tạo lô hàng mới (manual / import) |
| Batch List | `ops-batch-list` | Tìm kiếm, lọc, quản lý batch inventory |
| Split / Merge | `ops-batch-split` | Tách / ghép batch (audit trail đầy đủ) |
| Recall / Destroy | `ops-batch-recall` | Thu hồi hoặc tiêu hủy batch (requires approval) |

### 4.2 Shipment

| Chức năng | Trang | Mô tả |
|---|---|---|
| Transfer Orders | `ops-transfer-orders` | Lệnh chuyển hàng giữa nodes |
| Receiving | `ops-receiving` | Nhận hàng, xác nhận scan, matching |
| Mismatch | `ops-mismatch` | Báo sai khác: thiếu, thừa, sai node |

### 4.3 Monitoring

| Chức năng | Trang | Mô tả |
|---|---|---|
| Scan Monitor | `ops-scan-monitor` | Giám sát QR scan real-time, geo map |
| Duplicate Alerts | `ops-duplicate-alerts` | Cảnh báo QR quét trùng (counterfeit indicator) |
| Geo Alerts | `ops-geo-alerts` | Cảnh báo scan từ vùng bất thường |

### 4.4 Incidents

| Chức năng | Trang | Mô tả |
|---|---|---|
| Open Incidents | `ops-incidents-open` | Sự cố đang xử lý |
| Incident History | `ops-incidents-history` | Lịch sử sự cố đã đóng |

---

## V. Chế Độ 4 — Risk (Risk Officer)

> **Vai trò:** Quản lý rủi ro & chống gian lận
> **Đối tượng:** Risk Manager, Fraud Analyst
> **Quyền hạn:** Quản lý risk rules, cases, investigations

### 5.1 Dashboard & Intelligence

| Chức năng | Trang | Mô tả |
|---|---|---|
| Risk Dashboard | `risk-dashboard` | Tổng quan rủi ro: risk score, alerts, trend, heatmap |
| Event Feed | `risk-event-feed` | Feed sự kiện rủi ro real-time |
| Advanced Filter | `risk-advanced-filter` | Bộ lọc nâng cao multi-field |
| High Risk Items | `risk-high-risk` | Danh sách items/distributors có risk cao nhất |

### 5.2 Risk Rules Engine

| Chức năng | Trang | Mô tả |
|---|---|---|
| Duplicate Rules | `risk-duplicate-rules` | Luật phát hiện QR trùng lặp |
| Geo Rules | `risk-geo-rules` | Luật cảnh báo theo vùng địa lý |
| Velocity Rules | `risk-velocity-rules` | Luật phát hiện scan frequency bất thường |
| Auto Response | `risk-auto-response` | Hành động tự động khi trigger rule (block, alert, escalate) |

### 5.3 Case Management

| Chức năng | Trang | Mô tả |
|---|---|---|
| Open Cases | `risk-cases-open` | Vụ việc đang điều tra |
| Escalated Cases | `risk-cases-escalated` | Vụ việc đã escalate lên cấp cao hơn |
| Closed Cases | `risk-cases-closed` | Vụ việc đã kết thúc (với kết luận) |

### 5.4 Analytics & Reports

| Chức năng | Trang | Mô tả |
|---|---|---|
| Pattern Clusters | `risk-pattern-clusters` | Phân cụm mẫu gian lận bằng AI |
| Distributor Risk | `risk-distributor-risk` | Xếp hạng rủi ro theo nhà phân phối |
| SKU Risk Ranking | `risk-sku-risk` | Xếp hạng rủi ro theo sản phẩm |
| Risk Reports | `risk-reports` | Báo cáo rủi ro xuất cho management/regulator |

---

## VI. Chế Độ 5 — Compliance (Compliance Officer)

> **Vai trò:** Kiểm soát tuân thủ & quản trị dữ liệu
> **Đối tượng:** Compliance Officer, Internal Auditor, Legal
> **Quyền hạn:** Giám sát hành vi người dùng, kiểm toán, pháp lý

### 6.1 Audit Monitoring

| Chức năng | Trang | Mô tả |
|---|---|---|
| Compliance Dashboard | `compliance-dashboard` | Tổng quan tuân thủ: violations, risk score, trend |
| User Activity | `compliance-user-activity` | Nhật ký hoạt động người dùng chi tiết |
| System Changes | `compliance-system-changes` | Theo dõi thay đổi cấu hình hệ thống |
| Data Export Log | `compliance-data-export` | Lịch sử export dữ liệu + ai export |
| Privileged Access | `compliance-privileged-access` | Giám sát hành vi tài khoản đặc quyền |

### 6.2 Policy & Controls

| Chức năng | Trang | Mô tả |
|---|---|---|
| Access Policy | `compliance-access-policy` | Chính sách truy cập: MFA, session, IP |
| Risk Policy | `compliance-risk-policy` | Chính sách rủi ro: ngưỡng, escalation |
| Workflow Control | `compliance-workflow-control` | Kiểm soát workflow: approval chain, SoD |
| Violation Log | `compliance-violation-log` | Nhật ký vi phạm chính sách |

### 6.3 Data Governance

| Chức năng | Trang | Mô tả |
|---|---|---|
| Retention Config | `compliance-retention` | Cấu hình lưu trữ dữ liệu (3-7 năm) |
| Data Access Review | `compliance-data-access-review` | Rà soát quyền truy cập dữ liệu |
| Privacy Requests | `compliance-privacy-requests` | Yêu cầu GDPR: right to erasure, portability |
| Data Governance | `compliance-data-governance` | **Retention, PII masking, legal hold, GDPR compliance** |

### 6.4 Regulatory & Legal

| Chức năng | Trang | Mô tả |
|---|---|---|
| Audit Report | `compliance-audit-report` | Tạo báo cáo kiểm toán theo template chuẩn |
| Investigation Summary | `compliance-investigation-summary` | Tóm tắt điều tra cho cơ quan chức năng |
| Regulatory Export | `compliance-regulatory-export` | Xuất dữ liệu theo yêu cầu pháp luật |
| Legal Hold | `compliance-legal-hold` | Giữ dữ liệu cho mục đích pháp lý (không xóa) |

### 6.5 Enterprise Governance

| Chức năng | Trang | Mô tả |
|---|---|---|
| SoD Matrix | `compliance-sod-matrix` | **Ma trận xung đột quyền**, phát hiện overlap, self-approval |
| Immutable Audit | `compliance-immutable-audit` | **Hash chain SHA-256**, signed export RSA-2048, tamper detection |

---

## VII. Chế Độ 6 — IT Admin (Developer)

> **Vai trò:** Quản trị hạ tầng kỹ thuật
> **Đối tượng:** IT Security, System Admin, DevOps
> **Quyền hạn:** Bảo mật, SSO, API, tích hợp, monitoring

### 7.1 Security

| Chức năng | Trang | Mô tả |
|---|---|---|
| Authentication | `it-authentication` | Cấu hình MFA, chính sách mật khẩu, session |
| Network | `it-network` | IP whitelist/blacklist, geo restriction, VPN enforcement |
| API Security | `it-api-security` | Token expiry, key rotation, webhook signing, OAuth2 |
| Conditional Access | `it-conditional-access` | **Zero-trust**: device fingerprint, geo, time-based, step-up auth |

### 7.2 Identity & Access

| Chức năng | Trang | Mô tả |
|---|---|---|
| SSO Configuration | `it-sso` | Cấu hình SAML IdP, group → role mapping |
| Domain Verification | `it-domain` | Xác minh domain qua DNS TXT record |
| Provisioning | `it-provisioning` | SCIM, Azure AD sync, JIT access |

### 7.3 Integrations

| Chức năng | Trang | Mô tả |
|---|---|---|
| ERP & Systems | `it-erp` | Kết nối ERP/WMS/CRM, trạng thái sync |
| Webhooks | `it-webhooks` | Quản lý webhook: events, delivery rate |
| Integration Logs | `it-integration-logs` | Nhật ký error/success, retry details |

### 7.4 API Management

| Chức năng | Trang | Mô tả |
|---|---|---|
| API Keys | `it-api-keys` | Quản lý key: scope, expiry, rotation, revoke |
| OAuth Clients | `it-oauth-clients` | Đăng ký OAuth2 client: grant type, redirect URI |
| API Usage | `it-api-usage` | Thống kê request, error rate, rate limit |

### 7.5 Technical Monitoring

| Chức năng | Trang | Mô tả |
|---|---|---|
| API Health | `it-api-health` | Uptime, latency (P50/P99), error per endpoint |
| Sync Status | `it-sync-status` | Trạng thái sync các hệ thống tích hợp |
| Error Log | `it-error-log` | Nhật ký lỗi kỹ thuật: stack trace, occurrence |
| SLA Monitoring | `it-sla-monitoring` | **SLA tracking, incident management, 4-level escalation** |

### 7.6 Environment & Data

| Chức năng | Trang | Mô tả |
|---|---|---|
| Data Export | `it-data-export` | Export control theo vai trò + scheduled export |
| Backup & Restore | `it-backup` | Auto/manual backup, restore, storage quota |
| Sandbox | `it-sandbox` | Môi trường test, staging API, feature flags |

---

## VIII. Chế Độ 7 — Business (Company Admin)

> **Vai trò:** Quản trị doanh nghiệp
> **Đối tượng:** Company Admin, Manager, Operator
> **Quyền hạn:** Quản lý sản phẩm, đơn hàng, KYC, chuỗi cung ứng

### 8.1 Core Business

| Chức năng | Trang | Mô tả |
|---|---|---|
| Dashboard | `dashboard` | Dashboard tổng quan doanh nghiệp |
| Products | `products` | Quản lý sản phẩm: tạo, sửa, SKU, attributes |
| Scanner | `scanner` | Quét QR trực tiếp (camera-based) |
| Scans | `scans` | Lịch sử quét QR: ai, ở đâu, khi nào |
| Fraud | `fraud` | Cảnh báo gian lận cấp doanh nghiệp |
| Events | `events` | Feed sự kiện hệ thống real-time |

### 8.2 Supply Chain Management (SCM)

| Chức năng | Trang | Mô tả |
|---|---|---|
| SCM Dashboard | `scm-dashboard` | Tổng quan chuỗi cung ứng |
| Inventory | `scm-inventory` | Quản lý tồn kho theo node |
| Logistics | `scm-logistics` | Theo dõi vận chuyển & routing |
| Partners | `scm-partners` | Quản lý đối tác: distributor, retailer, supplier |
| Leak Detection | `scm-leaks` | Phát hiện rò rỉ hàng hóa (gray market) |
| TrustGraph | `scm-trustgraph` | Bản đồ tin cậy mạng lưới phân phối |
| EPCIS | `scm-epcis` | Chuẩn truy xuất nguồn gốc GS1 EPCIS |
| AI Insights | `scm-ai` | Phân tích AI chuỗi cung ứng |
| Risk Radar | `scm-risk-radar` | Radar rủi ro theo vùng/đối tác |
| Carbon Tracking | `scm-carbon` | Theo dõi khí thải carbon |
| Digital Twin | `scm-twin` | Bản sao số chuỗi cung ứng |

### 8.3 Blockchain & NFT

| Chức năng | Trang | Mô tả |
|---|---|---|
| Blockchain | `blockchain` | Giao dịch blockchain & on-chain verification |
| NFT | `nft` | Chứng chỉ NFT cho sản phẩm (proof-of-authenticity) |
| Wallet | `wallet` | Ví crypto cho giao dịch blockchain |

### 8.4 Company Administration

| Chức năng | Trang | Mô tả |
|---|---|---|
| KYC | `kyc` | Xác minh danh tính khách hàng |
| Evidence | `evidence` | Quản lý bằng chứng gian lận |
| Stakeholder | `stakeholder` | Quản lý các bên liên quan |
| Admin Users | `admin-users` | Quản lý user cấp doanh nghiệp |
| Settings | `settings` | Cấu hình hệ thống doanh nghiệp |
| Branding | `branding` | Tùy chỉnh thương hiệu (logo, màu sắc) |
| Integrations | `integrations` | Kết nối hệ thống bên thứ ba |
| Role Manager | `role-manager` | Quản lý vai trò RBAC nội bộ |
| Org Management | `org-management` | Quản lý tổ chức, chi nhánh |

### 8.5 Company Admin Detail (CA)

| Chức năng | Trang | Mô tả |
|---|---|---|
| Nodes | `ca-nodes` | Quản lý điểm trong chuỗi cung ứng (nhà máy, kho...) |
| Flow Config | `ca-flow-config` | Cấu hình luồng hàng hóa |
| Batches | `ca-batches` | Quản lý lô hàng chi tiết |
| Traceability | `ca-traceability` | Truy xuất nguồn gốc end-to-end |
| Incidents | `ca-incidents` | Quản lý sự cố nội bộ |
| Risk Rules | `ca-risk-rules` | Cấu hình luật rủi ro cấp doanh nghiệp |
| Access Logs | `ca-access-logs` | Nhật ký truy cập |
| Company Profile | `ca-company-profile` | Thông tin doanh nghiệp |

### 8.6 Other

| Chức năng | Trang | Mô tả |
|---|---|---|
| Billing | `billing` | Quản lý thanh toán & hóa đơn |
| Pricing | `pricing` | Xem gói cước & nâng cấp |
| Sustainability | `sustainability` | Báo cáo phát triển bền vững |
| Compliance | `compliance` | Tuân thủ cấp doanh nghiệp |
| Anomaly | `anomaly` | Phát hiện bất thường bằng AI |
| Reports | `reports` | Hệ thống báo cáo tổng hợp |
| Public Dashboard | `public-dashboard` | Dashboard công khai cho stakeholder |
| API Docs | `api-docs` | Tài liệu API REST/GraphQL |

---

## IX. Enterprise Governance Engine

### 9.1 Permission Matrix (125 quyền nguyên tử)

| Miền | Số lượng | Ví dụ |
|---|---|---|
| Operations | 24 | `batch.create`, `qr.generate`, `transfer.approve` |
| Risk | 15 | `risk.rule.edit`, `case.close`, `fraud.alert.escalate` |
| Compliance | 18 | `audit.log.export`, `legal.hold.create`, `sod.rule.edit` |
| Identity | 20 | `user.create`, `role.assign`, `sso.config`, `scim.sync` |
| Integration | 15 | `api.key.rotate`, `webhook.create`, `erp.connect` |
| Security | 10 | `security.conditional.access`, `security.device.trust` |
| Data | 11 | `data.export.approve`, `data.masking.config` |
| System | 12 | `config.branding`, `billing.manage`, `tenant.settings` |
| **Tổng** | **125** | |

### 9.2 Approval Workflows

| Loại | Nguyên tắc | Số lượng | Ví dụ |
|---|---|---|---|
| **4-Eyes** | 2 người duyệt | 5 workflows | Batch transfer >$10K, risk rule change, role escalation |
| **6-Eyes** | 3 người duyệt | 4 workflows | Policy change, encryption key rotation, legal hold release |

### 9.3 Immutable Audit Trail

- **Hash chain SHA-256**: Mỗi block tham chiếu hash block trước
- **Signed export RSA-2048**: Xuất PDF/CSV có chữ ký số
- **Tamper detection**: Kiểm tra tính toàn vẹn mỗi 5 phút
- **No-delete policy**: Không xóa log dưới bất kỳ điều kiện nào
- **Retention**: Tối thiểu 7 năm

### 9.4 SoD (Separation of Duties) Engine

| Xung đột | Mức rủi ro | Mô tả |
|---|---|---|
| Risk + Compliance | Medium | Cùng người kiểm soát rule VÀ audit |
| Admin + Risk | High | Tạo user VÀ duyệt fraud case |
| Ops + Compliance | Medium | Quản lý batch VÀ audit batch operations |
| Developer + Super Admin | Critical | IT tenant VÀ platform control |

### 9.5 Data Governance

- **Retention policies**: 90 ngày → 7 năm tùy loại dữ liệu
- **PII masking**: Email, phone, national ID đều mask theo role
- **Legal hold**: Dữ liệu dưới legal hold không thể xóa/sửa
- **GDPR**: Right to erasure, data portability, cross-border transfer

### 9.6 Zero-Trust Conditional Access

- Device fingerprint → chỉ thiết bị trusted mới truy cập
- Geo restriction → chặn truy cập từ quốc gia ngoài danh sách
- Time-based → yêu cầu MFA bổ sung ngoài giờ làm việc
- Risk-based step-up → action nhạy cảm yêu cầu xác thực nâng cao
- VPN enforcement → admin/IT bắt buộc dùng VPN

---

## X. Tích Hợp Hệ Thống

| Phương thức | Chi tiết |
|---|---|
| **REST API** | RESTful API đầy đủ CRUD + batch operations |
| **Webhooks** | Event-driven: 50+ event types, retry, signing |
| **SSO** | SAML 2.0, OIDC, Google, Azure AD |
| **SCIM** | User provisioning tự động từ IdP |
| **ERP** | SAP, Oracle, Dynamics 365 |
| **Blockchain** | On-chain verification, NFT mint |
| **GS1 EPCIS** | Chuẩn quốc tế truy xuất nguồn gốc |

---

## XI. Bảo Mật

| Lớp | Biện pháp |
|---|---|
| **Authentication** | MFA bắt buộc (TOTP / WebAuthn), password policy |
| **Authorization** | RBAC 125 permissions, SoD engine, 4-Eyes / 6-Eyes |
| **Network** | IP whitelist, geo restrict, VPN enforcement |
| **Data** | AES-256-GCM at rest, TLS 1.3 in transit |
| **Audit** | Immutable hash chain, signed export, 7-year retention |
| **Access** | Zero-trust conditional access, device fingerprint |
| **Session** | Timeout config, concurrent session limit, force logout |
| **API** | Key rotation, scope-based access, rate limiting |

---

## XII. Thống Kê Hệ Thống

| Chỉ số | Giá trị |
|---|---|
| Tổng số trang (pages) | **100+** |
| Số chế độ sidebar | **7** |
| Số quyền nguyên tử | **125** |
| Số approval workflow | **9** (5 × 4-Eyes + 4 × 6-Eyes) |
| Số SoD rule | **5** |
| Số miền chức năng | **8** |
| Số vai trò mẫu | **10+** |
| Gói vai trò (Bundle) | **3** (Starter / Growth / Enterprise) |

---

## XIII. Tiêu Chuẩn & Tuân Thủ

| Tiêu chuẩn | Trạng thái |
|---|---|
| SOC 2 Type II | ✅ Ready (immutable audit, SoD, access controls) |
| ISO 27001 | ✅ Ready (security controls, risk management) |
| GDPR | ✅ Ready (data governance, right to erasure, DPA) |
| GS1 EPCIS | ✅ Supported (supply chain traceability) |
| Big4 Audit | ✅ Ready (approval workflows, permission matrix, hash chain) |

---

*Tài liệu này mô tả toàn bộ chức năng của TrustChecker Enterprise Platform v10.0.*
*Mọi action nhạy cảm đều có approval workflow. Mọi log đều immutable. Mọi role đều granular. Mọi cross-role đều SoD check.*
