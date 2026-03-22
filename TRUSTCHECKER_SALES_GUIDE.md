# TrustChecker — Mô Tả Chi Tiết Chức Năng & Chiến Lược Bán Hàng

**Phiên bản:** Enterprise v10.0 | **Cập nhật:** 2026-02-22  
**Định vị:** Enterprise-Grade Digital Trust Infrastructure Platform  

---

## I. TỔNG QUAN SẢN PHẨM

### 1.1 TrustChecker là gì?

TrustChecker là **nền tảng quản trị niềm tin số (Digital Trust Infrastructure)** giúp doanh nghiệp:
- 🔍 **Xác thực hàng thật** — QR scan + AI phát hiện hàng giả, hàng nhái
- 🔗 **Truy xuất nguồn gốc** — Chuỗi cung ứng minh bạch end-to-end
- 🚨 **Phát hiện gian lận** — AI + Rule engine phát hiện bất thường real-time
- 🌱 **Quản lý carbon** — Carbon Integrity Engine (CIE) cấp IPO-ready
- ⛓️ **Blockchain seal** — Bằng chứng bất biến cho mỗi giao dịch
- 📊 **Quản trị rủi ro** — Dashboard + heatmap + case management

### 1.2 Điểm khác biệt (USP)

| Chỉ số | Giá trị |
|---|---|
| Số chế độ giao diện | **7 mode** (Control Plane → Business) |
| Quyền hạn chi tiết | **125+ atomic permissions** |
| RBAC đa tầng | **18 vai trò × 5 cấp** (L1–L5) |
| Trang chức năng | **100+ pages** |
| SoD (Tách biệt quyền) | **24 conflict pairs** — tự động chặn self-approval |
| Audit trail | **SHA-256 hash chain** — immutable, 7-year retention |
| Tiêu chuẩn | SOC 2 Type II · ISO 27001 · GDPR · GS1 EPCIS |

---

## II. 23 NHÓM CHỨC NĂNG CHI TIẾT

### 🔐 1. Authentication & Identity

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| JWT + Refresh Token | Đăng nhập bảo mật, tự động gia hạn phiên | Không bị logout giữa chừng |
| MFA (TOTP) | Xác thực 2 lớp bắt buộc cho admin | Bảo vệ tài khoản đặc quyền |
| Passkey/WebAuthn | Đăng nhập không mật khẩu | UX hiện đại, bảo mật cao |
| Password Policy | Enforce độ mạnh, rotation, lockout | Compliance SOC 2 |
| DID (Decentralized ID) | Danh tính phi tập trung | Enterprise blockchain-ready |
| OAuth2 + SSO/SAML | Đăng nhập qua Google, Azure AD | Tích hợp doanh nghiệp lớn |

> **Cách bán:** "Bạn có bao nhiêu nhân viên truy cập hệ thống? MFA + SSO đảm bảo 0 vụ xâm nhập tài khoản."

---

### 📦 2. Product Management & QR Verification

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Product Registry | Đăng ký SKU, category, manufacturer, origin | Quản lý danh mục sản phẩm toàn cầu |
| QR Code Generation | Tạo mã QR unique cho mỗi sản phẩm/batch | Khách hàng cuối quét xác thực hàng thật |
| Camera Scanner | Quét QR trực tiếp trên giao diện web | Không cần app riêng |
| Trust Score | Điểm tin cậy 0–100 cho mỗi sản phẩm | Đánh giá rủi ro tức thì |
| Batch Management | Quản lý lô hàng: split, merge, recall | Truy xuất chính xác đến từng batch |

> **Cách bán:** "Mỗi sản phẩm có 1 mã QR unique + Trust Score. Người tiêu dùng quét = biết ngay hàng thật/giả. Bạn có bao nhiêu SKU?"

**Pricing hook:** Gói Free: 10 sản phẩm. Starter: 100. Pro: 1,000. Business: Unlimited.

---

### 🔍 3. Scan Analytics & Geo Intelligence

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Scan Event Log | Mỗi lần quét: ai, ở đâu, khi nào, thiết bị gì | Biết chính xác hành vi người dùng |
| Geo Map | Bản đồ toàn cầu: scan theo thành phố, quốc gia | Phát hiện thị trường chợ đen |
| Fraud Score per Scan | AI tính điểm gian lận mỗi lần quét | Alert tức thì khi scan bất thường |
| Device Fingerprint | Nhận dạng thiết bị quét | Phát hiện bot/scan giả |

> **Cách bán:** "Bạn biết không 15% hàng luxury bị scan từ Nigeria nhưng sản phẩm chỉ bán ở EU? Geo Intelligence phát hiện ngay."

**Pricing hook:** Free: 500 scans/tháng. Overage: $0.05→$0.01/scan (volume discount).

---

### 🚨 4. Fraud Detection & AI Engine

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Fraud Alerts | 7 loại cảnh báo: velocity, geo, duplicate, counterfeit... | Phản ứng trong vài phút |
| Risk Rules Engine | Tự tạo rule: duplicate limit, geo fence, velocity cap | Tùy chỉnh theo ngành |
| AI Anomaly Detection | ML phát hiện pattern bất thường 3σ+ | Phát hiện gian lận mà rule không cover |
| Case Management | Workflow điều tra: open → investigate → escalate → resolve | Quản lý vụ việc chuyên nghiệp |
| Auto Response | Tự động block QR, alert team, escalate | Phản ứng 24/7 không cần người trực |

> **Cách bán:** "Mỗi giờ trì hoãn phát hiện hàng giả = mất $X doanh thu + thiệt hại thương hiệu. AI Engine phát hiện trong 45ms."

**Pricing hook:** Fraud Detection chỉ có từ gói Starter trở lên ($49/tháng).

---

### ⛓️ 5. Blockchain & NFT Certificates

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Blockchain Seal | Hash-chain SHA-256, merkle root, block index | Bằng chứng bất biến — không ai sửa được |
| NFT Certificate | Chứng chỉ số cho sản phẩm: authenticity, origin | Premium branding cho hàng luxury |
| On-chain Verification | Xác minh trên blockchain công khai | Minh bạch với investor, regulator |
| Transfer History | Lịch sử chuyển nhượng NFT | Truy xuất ownership đầy đủ |

> **Cách bán:** "Mỗi chai rượu whisky $500 có 1 NFT certificate. Khách hàng scan QR → thấy chứng chỉ blockchain → tin tưởng 100%."

**Pricing hook:** NFT mint: Starter 10/tháng miễn phí, overage $2→$0.50/mint.

---

### 🔗 6. Supply Chain Management (SCM)

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| SCM Dashboard | Tổng quan chuỗi cung ứng: partners, shipments, incidents | Nhìn toàn bộ supply chain 1 màn hình |
| Partner Management | Quản lý distributor, retailer, supplier + KYC status | Biết trust score từng đối tác |
| Shipment Tracking | Theo dõi vận chuyển: carrier, GPS, estimated delivery | Real-time visibility |
| IoT Sensor Integration | Temperature, humidity, vibration monitoring | Đảm bảo cold chain cho pharma/food |
| Inventory Management | Tồn kho theo location, min/max stock, alerts | Không bao giờ hết hàng bất ngờ |
| EPCIS (GS1 Standard) | Truy xuất chuẩn quốc tế GS1 | Tuân thủ EU/US regulation |
| TrustGraph | Bản đồ tin cậy mạng lưới phân phối | Visualize rủi ro trong network |
| Digital Twin | Bản sao số chuỗi cung ứng + simulation | "What if" analysis trước khi ra quyết định |

> **Cách bán:** "Chuỗi cung ứng của bạn có bao nhiêu node? TrustGraph visualize toàn bộ + highlight rủi ro. Digital Twin giúp simulate trước khi thay đổi."

**Pricing hook:** SCM Intelligence từ gói Pro ($199). Digital Twin từ gói Business ($499).

---

### 🏢 7. KYC/AML & Compliance

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Business KYC | Xác minh danh tính doanh nghiệp đối tác | Biết đối tác có đáng tin không |
| 4-Check Pipeline | Identity → Sanctions → Document → PEP | Quy trình chuẩn quốc tế |
| Sanctions Screening | Đối chiếu danh sách trừng phạt quốc tế | Tránh bị phạt vì giao dịch với entity bị cấm |
| Risk Assessment | Tự động đánh giá mức rủi ro: low/medium/high | Quyết định nhanh chấp nhận/từ chối đối tác |

> **Cách bán:** "Bạn onboard bao nhiêu đối tác mới mỗi năm? Mỗi đối tác chưa KYC = 1 rủi ro pháp lý. TrustChecker automate toàn bộ."

---

### 🌱 8. Carbon Integrity Engine (CIE)

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Carbon Passport (CIP) | Hộ chiếu carbon cho sản phẩm | Tuân thủ CSRD/ESRS |
| Emission Calculator | Tính toán phát thải theo GHG Protocol | Mandatory cho EU 2026+ |
| IVU Validation | Xác thực độc lập bởi bên thứ 3 | Chống greenwashing |
| Methodology Governance | Quản trị phương pháp tính toán | Audit-ready, Big4-accepted |
| Carbon Credit Mint | Tạo carbon credit NFT | Tham gia thị trường carbon |
| Disclosure Officer | Sign-off báo cáo carbon công khai | Tuân thủ CSRD liability |

> **Cách bán:** "CSRD bắt buộc từ 2026. Bạn cần Carbon Passport cho mỗi sản phẩm xuất EU. TrustChecker CIE là solution duy nhất IPO-grade trên thị trường."

**Pricing hook:** Carbon Calculations: Starter 100/tháng, overage $0.01/calc. Business: 5,000/tháng.

---

### 📊 9. Analytics & Reporting

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Executive Dashboard | KPI tổng quan cho CEO/Board | Ra quyết định không cần hỏi IT |
| Risk Radar | Heatmap rủi ro theo vùng/đối tác/SKU | Nhìn thấy rủi ro trước khi nó xảy ra |
| Compliance Reports | Báo cáo tuân thủ GDPR, ISO, SOC 2 | Export cho auditor/regulator |
| Sustainability Reports | GRI/ESG/Carbon reports | Investor due diligence |
| Custom Reports | Tự tạo báo cáo theo nhu cầu | Flexible cho mọi stakeholder |

> **Cách bán:** "CEO cần dashboard 30 giây hiểu tình hình. Auditor cần immutable report. Investor cần ESG score. TrustChecker serve all 3."

---

### 🛡️ 10. RBAC & Governance Engine

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| 18 Roles × 5 Layers | Từ Viewer → Super Admin | Đúng người, đúng quyền, đúng lúc |
| 125+ Permissions | Atomic-level access control | Granular hơn bất kỳ competitor nào |
| SoD Engine | 24 conflict pairs, tự động block | SOC 2 / ISO 27001 required |
| 4-Eyes / 6-Eyes Approval | Double/triple approval cho action nhạy cảm | Chống insider threat |
| Role Bundles | 3 preset: Starter/Growth/Enterprise | Setup nhanh trong 5 phút |
| Permission Matrix | Visual grid 125 × 10 | Admin nhìn rõ ai có quyền gì |

> **Cách bán:** "Auditor hỏi: 'Ai approve fraud case?' TrustChecker trả lời bằng permission matrix + audit trail. Đó là điểm SOC 2 pass/fail."

---

### 📱 11. Multi-tenant SaaS Platform

| Tính năng | Mô tả | Giá trị cho khách hàng |
|---|---|---|
| Org Isolation | Mỗi công ty = 1 tenant riêng biệt | Data không lẫn |
| Control Tower | Dashboard quản trị tất cả tenant | Platform operator view |
| Feature Flags | Bật/tắt tính năng per tenant | Upsell feature-by-feature |
| Custom Branding | Logo, màu sắc riêng | White-label ready |
| Self-service Onboard | Tenant tự đăng ký + setup | Scale không cần sales |

> **Cách bán platform:** "Bạn muốn bán TrustChecker như white-label cho khách hàng của bạn? Control Tower quản lý tất cả."

---

## III. BẢNG GIÁ & CHIẾN LƯỢC BÁN

### 3.1 Pricing Tiers

| Gói | Giá/tháng | Giá/năm | Tiết kiệm | Đối tượng |
|---|---|---|---|---|
| **Free** | $0 | $0 | — | SMB muốn thử |
| **Starter** | $49 | $470 | 20% | Startup, brand nhỏ |
| **Pro** ⭐ | $199 | $1,910 | 20% | Mid-market, chuỗi cung ứng vừa |
| **Business** | $499 | $4,790 | 20% | Enterprise, multi-country |
| **Enterprise** | Custom | Custom | 15% | Fortune 500, on-premise |

### 3.2 So sánh gói

| Tính năng | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Sản phẩm | 10 | 100 | 1,000 | ∞ | ∞ |
| QR Scans/tháng | 500 | 5,000 | 25,000 | 100,000 | ∞ |
| API calls/tháng | 1,000 | 10,000 | 100,000 | 500,000 | ∞ |
| Storage | 100MB | 1GB | 10GB | 50GB | ∞ |
| NFT Mints/tháng | ❌ | 10 | 100 | 500 | ∞ |
| Carbon Calcs/tháng | ❌ | 100 | 1,000 | 5,000 | ∞ |
| Team Members | 1 | 3 | 10 | 50 | ∞ |
| Fraud Detection | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI Anomaly | ❌ | ❌ | ✅ | ✅ | ✅ |
| Risk Radar | ❌ | ❌ | ✅ | ✅ | ✅ |
| SCM Intelligence | ❌ | ❌ | ✅ | ✅ | ✅ |
| Carbon Tracking | ❌ | ❌ | ✅ | ✅ | ✅ |
| Digital Twin | ❌ | ❌ | ❌ | ✅ | ✅ |
| Monte Carlo Risk | ❌ | ❌ | ❌ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ❌ | ✅ | ✅ |
| Dedicated AM | ❌ | ❌ | ❌ | ✅ | ✅ |
| On-premise | ❌ | ❌ | ❌ | ❌ | ✅ |
| Data Residency | ❌ | ❌ | ❌ | ❌ | ✅ |
| SLA | — | 99% | 99.5% | 99.9% | 99.95% |
| Support | Forum | Email 48h | Priority 24h | Dedicated | Slack Channel |

### 3.3 Usage-Based Add-ons (Overage Pricing)

| Metric | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| **QR Scans** | $0.05/scan (< 1K) | $0.03 (1K–10K) | $0.02 (10K–50K) | $0.01 (50K+) |
| **NFT Mints** | $2.00/mint (< 50) | $1.50 (50–200) | $0.50 (200+) | — |
| **Carbon Calcs** | $0.01/calc | hoặc $10/1,000 bundle | — | — |
| **API Calls** | $0.001/call ($1/1K) | — | — | — |

---

## IV. CHIẾN LƯỢC BÁN HÀNG

### 4.1 Sales Funnel

```
Free Trial (14 ngày) → Starter ($49) → Pro ($199) → Business ($499) → Enterprise (Custom)
```

### 4.2 Targeting theo ngành

| Ngành | Pain Point chính | Feature chủ lực | Gói khuyến nghị |
|---|---|---|---|
| **F&B / Coffee** | Hàng giả, truy xuất nguồn gốc | QR + SCM + Trust Score | Pro |
| **Luxury / Fashion** | Hàng nhái, gray market | QR + NFT + Leak Detection | Business |
| **Pharmaceuticals** | FDA compliance, cold chain | IoT + Compliance + Evidence | Business |
| **Electronics** | Counterfeit components | AI Fraud + Risk Radar | Pro |
| **Agriculture** | EUDR, sustainability | Carbon + ESG + EPCIS | Business |
| **Cosmetics** | Hàng giả xuyên biên giới | Geo Intelligence + KYC | Pro |
| **Automotive (EV)** | Battery traceability | Digital Twin + Blockchain | Enterprise |
| **Wine & Spirits** | Hàng giả cao cấp | NFT + Blockchain Seal | Business |

### 4.3 Objection Handling

| Phản đối | Phản hồi |
|---|---|
| "Giá cao quá" | "Mỗi vụ hàng giả gây thiệt hại $500K+ thương hiệu. $199/tháng = bảo hiểm rẻ nhất." |
| "Chúng tôi đã có QR" | "QR thường chỉ link đến website. TrustChecker QR = Trust Score + Fraud Detection + Blockchain Seal." |
| "Không cần blockchain" | "Blockchain không phải crypto. Đây là audit trail bất biến — SOC 2 yêu cầu." |
| "Đội IT nhỏ" | "Role Bundles setup 5 phút. API-first, không cần devops." |
| "Dùng Excel quản lý SCM" | "Excel không có real-time alert khi hàng đi sai route. TrustGraph detect trong 45ms." |
| "CSRD chưa áp dụng" | "Deadline 2026. Chuẩn bị mất 6-12 tháng. Bắt đầu hôm nay với CIE." |

### 4.4 Upsell Matrix

```
Free → Starter:  "Bạn đã hết 500 scans. Upgrade $49 = 5,000 scans + Fraud Detection."
Starter → Pro:   "AI Anomaly phát hiện 3 vụ counterfeit mà rule thường bỏ lỡ."
Pro → Business:  "Digital Twin giúp simulate supply chain disruption trước 2 tuần."
Business → Enterprise: "On-premise + custom SLA 99.95% cho regulated industry."
```

### 4.5 Enterprise Quote Calculator

| Yếu tố | Hệ số nhân |
|---|---|
| Base (Business $499) | ×1.5 (Enterprise premium) |
| > 500K scans/tháng | +0.5 |
| > 1M scans/tháng | +1.0 |
| On-premise deployment | +2.0 |
| Data residency | +0.5 |
| Custom SLA | +0.3 |
| Dedicated infrastructure | +1.5 |

**Ví dụ:** Enterprise + 800K scans + on-premise + custom SLA  
= $499 × (1.5 + 0.5 + 2.0 + 0.3) = $499 × 4.3 = **~$2,146/tháng** (~$21,889/năm với 15% annual discount)

---

## V. METRICS & ROI

### 5.1 Key Metrics cho Sales

| Metric | Giá trị |
|---|---|
| Free-to-Paid conversion | Target 5–8% |
| Average deal size (SMB) | $49–199/tháng |
| Average deal size (Enterprise) | $2,000–5,000/tháng |
| Expansion revenue | 30–40% net revenue retention |
| Churn rate target | < 5% monthly |
| CAC payback | < 6 tháng |
| LTV/CAC ratio | > 3x |

### 5.2 ROI Calculator cho khách hàng

| Chi phí không có TrustChecker | Chi phí với TrustChecker |
|---|---|
| 1 vụ hàng giả: **$500K** thiệt hại | Pro plan: **$2,388/năm** |
| 1 vụ recall: **$2M** | Business plan: **$5,988/năm** |
| 1 vụ phạt GDPR: **4% revenue** | Compliance module: included |
| 1 vụ supply chain disruption: **$10M** | Digital Twin: simulate trước |
| Brand reputation damage: **immeasurable** | Trust Score: rebuild trust |

**ROI = (Cost of 1 incident avoided) / (Annual subscription) = 200x–500x**

---

## VI. DEMO SCRIPT (5 phút)

1. **Dashboard** (30s) — "Đây là tổng quan Tony is King: 15 products, 200 scans, trust score trung bình 95.2"
2. **Scan Map** (45s) — "Zoom vào bản đồ: scan từ 18 thành phố. Red dot = suspicious scan từ Lagos"
3. **Fraud Alert** (60s) — "Alert: QR quét từ 3 quốc gia trong 1 giờ. AI confidence 94.7%. Case tự động tạo."
4. **Supply Chain** (60s) — "TrustGraph hiển thị 12 partners. Red edge = high risk. Click = xem detail."
5. **Blockchain** (45s) — "Mỗi event đều sealed trên blockchain. Hash chain bất biến. Click verify."
6. **Carbon** (45s) — "Carbon Passport cho mỗi sản phẩm. CSRD-ready. IVU validated."
7. **Pricing** (30s) — "Free 14 ngày. Upgrade bất cứ lúc nào. Bắt đầu ngay hôm nay?"

---

*Tài liệu này là hướng dẫn nội bộ cho đội sales TrustChecker. Cập nhật khi có thay đổi pricing hoặc feature mới.*
