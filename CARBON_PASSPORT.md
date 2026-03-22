# Carbon Passport — Cross-Cutting ESG Governance Intelligence

**Module:** SCM Carbon & ESG Engine
**Standard:** GHG Protocol Corporate Standard + DEFRA 2025 Emission Factors
**Reporting:** GRI Universal Standards 2021
**Version:** 2.0 — 2026-02-19

---

## I. CARBON PASSPORT KHÔNG PHẢI ESG MODULE ĐƠN LẺ

### 1.1 Định nghĩa

**Carbon Passport** (Hộ chiếu Carbon) là bản khai lượng khí thải CO₂ equivalent (kgCO₂e) **per product** — ghi nhận toàn bộ phát thải từ lúc sản xuất đến tay người tiêu dùng (cradle-to-gate).

Giống như hộ chiếu du lịch, Carbon Passport "đóng dấu" mỗi giai đoạn mà sản phẩm đi qua trong chuỗi cung ứng.

### 1.2 Vị trí chiến lược trong kiến trúc

Carbon Passport là **cross-cutting governance layer** — một **ESG Intelligence Overlay** chạy trên dữ liệu SCM và được bảo chứng bởi Blockchain Integrity Layer.

Nó kết nối:

```
SCM → Risk → Governance → Blockchain → Executive KPI
```

```
┌──────────────────────────────────────────────────────────────────────┐
│                     TrustChecker Platform                           │
│                                                                      │
│  Layer 1: Presentation ─────────────────────────────────────────────│
│  │ CEO KPI │ Ops Monitor │ Risk Analysis │ Compliance Export │       │
│  │ SA Benchmark │ CA Config │ Consumer QR │                         │
│  ├──────────────────────────────────────────────────────────────────│
│  Layer 2: Governance ───────────────────────────────────────────────│
│  │ RBAC    │ SoD      │ Approval Engine │ Model Versioning │        │
│  ├──────────────────────────────────────────────────────────────────│
│  Layer 3: Intelligence ─────────────────────────────────────────────│
│  │                                                                  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────┐ │
│  │  │ Risk     │  │ Supply   │  │ Code      │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  │  │ Engine   │  │ Route    │  │ Lifecycle │  │ ▓ CARBON      ▓│ │
│  │  │          │  │ Engine   │  │           │  │ ▓ PASSPORT    ▓│ │
│  │  │          │  │          │  │           │  │ ▓ ENGINE      ▓│ │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  │       │              │              │        └───────┬────────┘ │
│  │       └──────────────┴──────────────┴────────────────┘         │
│  ├──────────────────────────────────────────────────────────────────│
│  Layer 4: Data Integrity ───────────────────────────────────────────│
│  │ Hash Chain │ Evidence Store │ Blockchain Seal │ TSA │ HSM │     │
│  ├──────────────────────────────────────────────────────────────────│
│  Layer 5: Integration ──────────────────────────────────────────────│
│  │ ERP API │ Webhook │ Kafka │ 3PL │ Carbon Registry │             │
│  └──────────────────────────────────────────────────────────────────┘
```

> Carbon Passport nằm tại **Layer 3 — Intelligence** nhưng **chạy xuyên** qua tất cả 5 layers:
> - Nhận data từ Layer 5 (ERP, 3PL)
> - Được bảo chứng bởi Layer 4 (Blockchain, Evidence)
> - Tuân thủ Layer 2 (RBAC, SoD, Approval)
> - Hiển thị tại Layer 1 (theo role)

---

## II. CROSS-MODULE DEEP ANALYSIS — Carbon chạy xuyên 7 module

### 2.1 SCM (Supply Chain Module) — Data Source Layer

Carbon Passport lấy dữ liệu gốc từ SCM:

| Dữ liệu | Module cung cấp | Scope |
|---|---|---|
| Route distance | `scm-supply-routes` | Scope 3 |
| Shipment mode, carrier, GPS | `scm-logistics` / `scm-tracking` | Scope 3 |
| Partner reliability, violations | `scm-partners` | ESG Score |
| Product metadata, category | `products` | Scope 1 |
| Warehouse type, storage events | `scm-inventory` | Scope 2 |
| EPCIS events | `scm-epcis` | All scopes |

> **SCM = Data feeder. Carbon = Intelligence computation.**
> 
> Carbon Passport không tồn tại nếu không có Route definition + Shipment tracking + Partner management.

---

### 2.2 Risk Engine — ESG as Risk Factor

Carbon không chỉ là ESG KPI. Nó có thể trở thành **risk factor**.

| Carbon Signal | Risk Impact | Affected Score |
|---|---|---|
| Grade D/F | Supply chain carbon risk | BRI (Brand Risk Index) |
| High Scope 3 concentration | Logistics dependency risk | CRS (Channel Risk Score) |
| Partner ESG Grade C/D | Distributor operational risk | ERS (Event Risk Score) |
| Sudden emission spike | Manufacturing anomaly | Anomaly detection |
| Offset certificate fraud | Compliance risk | Compliance alert |

```
Carbon Grade D/F ──→ Supply Chain Carbon Risk
                         ↓
High Scope 3     ──→ Logistics Dependency Risk ──→ Brand Risk Index
                         ↓
Partner ESG C/D  ──→ Distributor Risk          ──→ Channel Risk Score
```

> **ESG risk trở thành một thành phần trong Brand Risk.**
> Đây là bước cực quan trọng cho infrastructure-level positioning.

---

### 2.3 Blockchain (Integrity Layer) — Tamper-Proof Governance

Blockchain không tính carbon. Blockchain làm **3 việc**:

| Chức năng | Mechanism | Kết quả |
|---|---|---|
| **1. Anchoring offset certificate** | SHA-256 → Evidence Store → Seal | Immutable proof of purchase |
| **2. Bảo vệ tính bất biến** | Hash chain → Blockchain Seal | Carbon report không thể sửa |
| **3. Public verification proof** | Public Verification Portal | Auditor/investor verify độc lập |

```
Carbon Offset → SHA-256 Hash → Evidence Store → Blockchain Seal
                                                      ↓
                                          Public Verification Portal
                                                      ↓
                                    Auditor / Investor / Regulator verify
```

> **Không có blockchain:** Carbon chỉ là self-declared ESG number.
> **Có blockchain:** Carbon trở thành tamper-proof governance data.

---

### 2.4 Company Admin (CA Layer) — Operational ESG Controller

Company Admin kiểm soát:

| Quyền hạn | Chức năng |
|---|---|
| Configure manufacturing factors | Override per-industry emission factor |
| View per-product carbon passport | Xem footprint chi tiết per SKU |
| ESG leaderboard access | Chọn supplier dựa trên ESG grade |
| Submit carbon offset | Permission: `esg:manage` |
| Route configuration | Ảnh hưởng trực tiếp đến Scope 3 |

> CA = **Operational ESG controller** — Quyết định supplier nào, route nào, warehouse nào → ảnh hưởng trực tiếp carbon footprint.

---

### 2.5 Super Admin (Platform Layer) — Ecosystem Intelligence

Super Admin có vai trò chiến lược:

| Chức năng | Dữ liệu |
|---|---|
| Cross-tenant ESG benchmark | So sánh carbon grade giữa tenants |
| Industry carbon heatmap | FMCG vs Pharma vs Luxury |
| ESG manipulation detection | Phát hiện offset fraud, greenwashing |
| Offset fraud detection | Audit cross-org offset certificates |
| **Industry Carbon Index** (tương lai) | Publish industry ESG rating — giống Moody's |

> Nếu đi hướng infrastructure: Super Admin có thể publish **Industry Carbon Index** — giống Moody's rating nhưng cho carbon. Carbon lúc đó không chỉ là feature, nó trở thành **platform-wide dataset asset**.

---

### 2.6 CEO Layer — Board-Level Metric

CEO **không** xem shipment breakdown. CEO thấy:

| KPI | Source | Board Value |
|---|---|---|
| ESG Grade | Carbon Engine | Investor narrative |
| 2030 reduction target | Paris-aligned calculation | Regulatory compliance |
| Offset proof | Blockchain anchor | Board assurance |
| Brand Protection Strength | Integrity + Carbon combined | Valuation signal |

> Carbon tại CEO layer = **Board-level metric → Valuation signal → Regulatory compliance proof.**
> 
> Nếu bán cho MNC: CEO dashboard là nơi quyết định renewal.

---

### 2.7 Compliance Layer — Regulatory Defense

Carbon liên hệ trực tiếp với:

| Regulation | Carbon Data Required | TrustChecker Coverage |
|---|---|---|
| **GRI 305-1/2/3** | Scope emissions | ✅ Auto-calculated |
| **EU CSRD** | Corporate sustainability | ✅ GRI report |
| **EU CBAM** | Product carbon border adjustment | ✅ Per-product passport |
| **SEC Climate** | Scope 1/2 mandatory | ✅ All scopes |
| **ISO 14064** | GHG quantification | ✅ Methodology aligned |

> **Compliance dùng Carbon Passport để**: Xuất report → Lưu evidence → Legal admissibility.
> 
> Nếu carbon data được seal bằng blockchain → **Compliance risk giảm đáng kể**.

---

## III. GOVERNANCE FLOW TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARBON GOVERNANCE FLOW                       │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │ SCM DATA (route + shipment + partner)    │ ← Layer 5       │
│  └─────────────────┬────────────────────────┘                  │
│                    ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ CARBON ENGINE (Scope 1 + 2 + 3)         │ ← Layer 3       │
│  │  Manufacturing Factors (DEFRA 2025)      │                  │
│  │  Warehouse Factors (kgCO₂e/m²/day)      │                  │
│  │  Transport Factors (kgCO₂e/tonne-km)    │                  │
│  └─────────────────┬────────────────────────┘                  │
│                    ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ RISK ENGINE (ESG → Risk factor)          │ ← Layer 3       │
│  │  Grade D/F → Supply chain risk           │                  │
│  │  Partner ESG C/D → Distributor risk      │                  │
│  └─────────────────┬────────────────────────┘                  │
│                    ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ COMPLIANCE (GRI export + evidence)       │ ← Layer 2       │
│  │  GRI 305-1/2/3/5 disclosures            │                  │
│  │  EU CSRD / CBAM / SEC reporting          │                  │
│  └─────────────────┬────────────────────────┘                  │
│                    ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ BLOCKCHAIN SEAL (offset + report anchor) │ ← Layer 4       │
│  │  SHA-256 → Evidence Store → Seal         │                  │
│  │  Public Verification Portal              │                  │
│  └─────────────────┬────────────────────────┘                  │
│                    ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ CEO DASHBOARD (ESG KPI)                  │ ← Layer 1       │
│  │  ESG Grade + 2030 Target + Offset Proof  │                  │
│  │  Board narrative + Valuation signal      │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

> **Carbon nằm giữa: Data → Risk → Governance → Executive.**
> Đây không phải linear flow — mà là **governance amplifier** lan tỏa ra mọi layer.

---

## II. SCOPE 1 / 2 / 3 — PHƯƠNG PHÁP TÍNH

### Scope 1 — Direct Emissions (Sản xuất)

Phát thải trực tiếp từ hoạt động sản xuất tại nhà máy.

| Industry | Emission Factor (kgCO₂e/unit) | Nguồn |
|---|---|---|
| F&B | 2.5 | DEFRA Manufacturing 2025 |
| Electronics | 15.0 | DEFRA Manufacturing 2025 |
| Fashion | 8.0 | DEFRA Manufacturing 2025 |
| Healthcare | 5.0 | DEFRA Manufacturing 2025 |
| Industrial | 20.0 | DEFRA Manufacturing 2025 |
| Agriculture | 1.8 | DEFRA Manufacturing 2025 |
| Energy | 25.0 | DEFRA Manufacturing 2025 |

### Scope 2 — Indirect Emissions (Năng lượng / Kho bãi)

Phát thải gián tiếp từ tiêu thụ điện khi lưu kho sản phẩm.

| Loại kho | Factor (kgCO₂e/m²/ngày) | Áp dụng |
|---|---|---|
| Cold Storage | 0.85 | Healthcare, F&B |
| Ambient | 0.15 | General, Fashion, Electronics |
| Automated | 0.35 | Automated warehouses |

```
Formula:
  emissions = warehouse_factor × storage_days × 0.5 m²/unit

  storage_days = (số sự kiện store/receive) × 3 ngày ước tính
```

### Scope 3 — Value Chain Emissions (Vận chuyển)

Phát thải từ toàn bộ chuỗi vận chuyển: nhà máy → kho → phân phối → bán lẻ.

| Mode | Factor (kgCO₂e/tonne-km) | So sánh |
|---|---|---|
| **Air (short-haul)** | 1.128 | 🔴 Cao nhất |
| **Air** | 0.602 | 🔴 Rất cao |
| **Road** | 0.062 | 🟡 Trung bình |
| **Multimodal** | 0.045 | 🟡 Trung bình |
| **Road Electric** | 0.025 | 🟢 Thấp |
| **Rail** | 0.022 | 🟢 Thấp |
| **Sea** | 0.016 | 🟢 Rất thấp |
| **Sea Container** | 0.012 | 🟢 Rất thấp |
| **Rail Electric** | 0.008 | 🟢 Thấp nhất |

```
Formula:
  emissions = transport_factor × distance_km × weight_tonnes

  distance: Haversine formula (GPS coords)
  weight:   0.05 tonnes (50kg) per unit estimated
  carrier → mode mapping:
    FedEx/DHL   → air
    Maersk/COSCO → sea
    Rail/Train   → rail
    Default      → road
```

### Tổng Carbon Footprint

```
Total kgCO₂e = Scope 1 + Scope 2 + Scope 3
```

---

## III. CARBON GRADING SYSTEM

| Grade | kgCO₂e | Đánh giá | Hành động |
|---|---|---|---|
| **A+** | ≤ 5 | Excellent | Net Zero ready, có thể marketing |
| **A** | ≤ 10 | Very Good | Đạt chuẩn ESG cao |
| **B** | ≤ 20 | Good | Cần cải thiện transport |
| **C** | ≤ 40 | Average | Cần giảm manufacturing + transport |
| **D** | ≤ 70 | Poor | Cần chuyển đổi năng lượng |
| **F** | > 70 | Fail | Cần restructure toàn bộ supply chain |

---

## IV. CARBON PASSPORT OUTPUT

Khi gọi `GET /api/scm/carbon/footprint/:productId`, hệ thống trả về:

```json
{
  "product_id": "abc123",
  "product_name": "Premium Coffee 500g",
  "total_footprint_kgCO2e": 12.45,
  "grade": "B",
  "scopes": [
    {
      "type": "scope_1",
      "label": "Direct Emissions (Manufacturing)",
      "value": 2.5,
      "unit": "kgCO2e",
      "source": "DEFRA Manufacturing Factors 2025"
    },
    {
      "type": "scope_2",
      "label": "Indirect Emissions (Energy/Warehousing)",
      "value": 1.28,
      "storage_days": 6,
      "warehouse_type": "cold_storage"
    },
    {
      "type": "scope_3",
      "label": "Value Chain Emissions (Transport)",
      "value": 8.67,
      "transport_breakdown": [
        {
          "shipment_id": "ship-001",
          "carrier": "DHL Express",
          "mode": "air",
          "distance_km": 850,
          "emissions_kgCO2e": 5.12
        },
        {
          "shipment_id": "ship-002",
          "carrier": "Local Truck",
          "mode": "road",
          "distance_km": 120,
          "emissions_kgCO2e": 0.37
        }
      ]
    }
  ],
  "scope_breakdown": {
    "scope_1_pct": 20,
    "scope_2_pct": 10,
    "scope_3_pct": 70
  },
  "equivalent": {
    "trees_needed": 0.6,
    "driving_km": 64.8,
    "smartphone_charges": 1556
  },
  "methodology": "GHG Protocol Corporate Standard + DEFRA 2025 Factors"
}
```

### Equivalence Calculations — Trực quan hóa tác động

| Metric | Formula | Ý nghĩa |
|---|---|---|
| 🌳 Trees needed | total ÷ 22 | 1 cây hấp thụ ~22kg CO₂/năm |
| 🚗 Driving equivalent | total ÷ 0.192 | Ô tô trung bình phát thải 0.192 kg/km |
| 📱 Phone charges | total ÷ 0.008 | 1 lần sạc = 8g CO₂ |

---

## V. API ENDPOINTS (5)

| # | Method | Path | Chức năng | Auth |
|---|---|---|---|---|
| 1 | GET | `/api/scm/carbon/footprint/:productId` | Carbon Passport per product | ✅ |
| 2 | GET | `/api/scm/carbon/scope` | Scope 1/2/3 aggregation toàn supply chain | ✅ (cache 120s) |
| 3 | GET | `/api/scm/carbon/leaderboard` | Partner ESG leaderboard | ✅ (cache 120s) |
| 4 | GET | `/api/scm/carbon/report` | GRI Universal Standards 2021 report | ✅ (cache 180s) |
| 5 | POST | `/api/scm/carbon/offset` | Record carbon offset + blockchain anchor | ✅ + `esg:manage` |

---

## VI. PARTNER ESG LEADERBOARD

Mỗi partner (supplier, distributor) được chấm điểm ESG composite:

```
ESG Score = Trust (40%) + Reliability (30%) + Compliance (30%)

Trust Weight:       (trust_score / 100) × 40
Reliability Weight: (1 - late_shipments / total_shipments) × 30
Compliance Weight:  max(0, 30 - violation_count × 10)
```

| ESG Grade | Score | Đánh giá |
|---|---|---|
| **A** | ≥ 80 | Preferred partner |
| **B** | ≥ 60 | Acceptable |
| **C** | ≥ 40 | Improvement needed |
| **D** | < 40 | Risk — consider replacement |

### ESG Leaderboard Output

```json
{
  "total_partners": 12,
  "a_grade": 3,
  "b_grade": 5,
  "c_grade": 3,
  "d_grade": 1,
  "leaderboard": [
    {
      "partner_id": "p-001",
      "name": "Vietnam Green Logistics",
      "country": "Vietnam",
      "esg_score": 87,
      "grade": "A",
      "metrics": {
        "trust_score": 92,
        "shipment_reliability": "96%",
        "sla_violations": 0,
        "kyc_status": "verified"
      }
    }
  ]
}
```

---

## VII. GRI REPORTING

Tự động tạo báo cáo theo **GRI Universal Standards 2021**:

| GRI Code | Disclosure | Data Source |
|---|---|---|
| **GRI 305-1** | Direct GHG Emissions (Scope 1) | Manufacturing factors |
| **GRI 305-2** | Energy Indirect GHG (Scope 2) | Warehouse data |
| **GRI 305-3** | Other Indirect GHG (Scope 3) | Shipment tracking |
| **GRI 305-5** | Reduction Targets | Paris-aligned 2030 (-45%) |
| **GRI 308-1** | Supplier Environmental Assessment | Partner ESG scores |
| **GRI 414-1** | Supplier Social Assessment | Partner compliance |

### Paris-Aligned Targets

```
2030 Target: Total × 0.55 (giảm 45%)
2050 Target: Total × 0.10 (giảm 90% — Net Zero)
```

---

## VIII. CARBON OFFSET & BLOCKCHAIN

### Carbon Offset Recording

`POST /api/scm/carbon/offset` cho phép ghi nhận carbon credits:

```json
{
  "offset_amount": 500,
  "offset_type": "VER",
  "certificate_id": "CERT-2026-001",
  "provider": "Gold Standard",
  "cost": 12500
}
```

### Blockchain Anchoring

- Mỗi offset → **SHA-256 hash** → lưu `evidence_items`
- Tags: `["carbon", "esg", "offset"]`
- Status: `anchored`
- Verification: qua Evidence Verification Portal (public, no auth)
- **Immutable proof** of carbon offset purchase — legal admissibility

```
Carbon Offset → SHA-256 Hash → Evidence Store → Blockchain Seal
                                                      ↓
                                          Public Verification Portal
```

---

## IX. TÍCH HỢP VỚI CÁC MODULE KHÁC

```
                    ┌─── Supply Route Engine ──── route distance
                    │
                    ├─── Shipment Tracking ────── carrier, GPS, mode
                    │
Carbon Passport ◄───┼─── Partner Management ───── trust + violations
                    │
                    ├─── Evidence Store ────────── offset blockchain proof
                    │
                    └─── Sustainability Score ──── green certification
                    
                    ┌─── CEO Dashboard ────────── ESG Grade KPI
                    │
Carbon Passport ───►┼─── GRI Report ──────────── regulatory export
                    │
                    ├─── Blockchain Seal ──────── offset proof anchor
                    │
                    └─── Public Dashboard ─────── consumer transparency
```

| Module cung cấp dữ liệu | Dữ liệu |
|---|---|
| `scm-supply-routes` | Route definitions, distance |
| `scm-tracking` / `scm-logistics` | Shipment events, carrier, GPS |
| `scm-partners` | Partner trust scores, violations |
| `evidence` | Evidence hash chain for offset anchoring |
| `sustainability` | Green certification, sustainability scores |
| `products` | Product metadata, category, manufacturer |

| Module tiêu thụ dữ liệu | Cách sử dụng |
|---|---|
| CEO Dashboard (`exec/overview`) | ESG Grade as KPI |
| GRI Report (`/api/scm/carbon/report`) | Regulatory export |
| Blockchain (`scm-integrity`) | Offset proof anchoring |
| Public Dashboard | Consumer-facing carbon transparency |

---

## X. FRONTEND — CARBON DASHBOARD

Page: `client/pages/scm/carbon.js`

### Sections hiển thị:

| Section | Nội dung |
|---|---|
| **KPI Cards** | Total kgCO₂e, Products Assessed, 2030 Target, ESG Grade |
| **Scope Breakdown** | Scope 1/2/3 với progress bars và phần trăm |
| **Partner ESG Leaderboard** | Table: Partner, Country, ESG Score, Grade, Reliability, Violations |
| **GRI Disclosures** | Table: GRI Code, Disclosure title, Value, Unit |

---

## XI. USE CASES

### Use Case 1: CEO muốn ESG KPI cho Board

```
CEO → Executive Dashboard → ESG Grade Card
                          → "Overall ESG: B+"
                          → "45% reduction target by 2030"
```

### Use Case 2: Compliance cần GRI report cho regulator

```
Compliance → Carbon Dashboard → GRI Report → Export PDF
           → GRI 305-1/2/3/5 disclosures
           → Paris-aligned targets
           → Supplier environmental/social assessment
```

### Use Case 3: Procurement muốn chọn green supplier

```
Procurement → ESG Leaderboard → Filter Grade A partners
            → Compare: ESG Score + Reliability + Violations
            → Prefer partners with Grade A (≥80)
```

### Use Case 4: Sustainability team ghi nhận carbon offset

```
Sustainability → POST /offset → Certificate recorded
              → SHA-256 hash generated
              → Blockchain anchored
              → Evidence: court-ready proof of offset purchase
```

### Use Case 5: Consumer muốn thấy carbon footprint sản phẩm

```
Consumer → Scan QR → Public Dashboard
        → Carbon Passport: Grade B, 12.45 kgCO₂e
        → "Equivalent to 65km driving"
        → "0.6 trees needed to offset"
```

---

## XII. REGULATORY ALIGNMENT

| Regulation | Coverage | Status |
|---|---|---|
| **EU CBAM** (Carbon Border Adjustment) | Scope 1/2/3 per product | ✅ Data ready |
| **EU CSRD** (Corporate Sustainability Reporting) | GRI disclosures | ✅ GRI 305-1/2/3/5 |
| **SEC Climate Rules** (US) | Scope 1/2 required, Scope 3 phased | ✅ All scopes |
| **Vietnam Green Growth Strategy** | National carbon reduction targets | ✅ Paris-aligned |
| **ISO 14064** | GHG quantification and reporting | ✅ Methodology aligned |
| **Paris Agreement** | 45% reduction by 2030, Net Zero 2050 | ✅ Targets calculated |

---

## XIII. QUYỀN HẠN THEO VAI TRÒ — Role Interaction Map

Carbon không thuộc riêng 1 role. Nó là **cross-role intelligence layer**.

| Role | Carbon Passport = | Data Level | Time Horizon |
|---|---|---|---|
| **SCM Ops** | Cung cấp data shipment, warehouse | Raw shipment detail | Real-time |
| **Risk Analyst** | Đánh giá ESG → Risk factor | Analytical | Weekly |
| **Compliance** | Xuất GRI + regulator report | Audit-ready export | Monthly + On-demand |
| **Company Admin** | Ghi offset + cấu hình route/factory | Full config | Config-time |
| **Super Admin** | Cross-tenant ESG benchmark | Cross-tenant aggregated | Monthly |
| **CEO** | ESG KPI & board narrative | Aggregated KPI only | Quarterly |
| **Consumer** | Scan QR → xem carbon grade | Public grade only | Per-scan |

### Role × Carbon Permission Matrix

| Action | SCM Ops | Risk | Compliance | CA | SA | CEO |
|---|---|---|---|---|---|---|
| View product carbon passport | ✅ | ✅ | ✅ | ✅ | ✅ | 📊 Aggregated |
| View scope breakdown | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| View transport breakdown | ✅ | ✅ | 👁 | ✅ | ✅ | — |
| View ESG leaderboard | — | ✅ | ✅ | ✅ | ✅ | 📊 Top 5 |
| Submit carbon offset | — | — | — | ✅ | — | — |
| Configure emission factors | — | — | — | ✅ | ✅ | — |
| Export GRI report | — | — | ✅ | — | ✅ | — |
| Cross-tenant benchmark | — | — | — | — | ✅ | — |
| View ESG Grade KPI | — | — | — | — | — | ✅ |

---

## XIV. CARBON PASSPORT CÓ THỂ NÂNG CẤP THÀNH GÌ?

### Hiện tại: ESG Reporting Module

```
Carbon = Calculate Scope 1/2/3 → Grade → GRI Report → Offset Record
```

### Tương lai: Supply Chain Carbon Intelligence Network

```
Carbon → Industry Carbon Index → Insurance Pricing → Bank ESG Risk → CBAM Pre-validation
```

| Stakeholder | Carbon Passport hiện tại | Carbon Intelligence Network |
|---|---|---|
| **Insurance** | — | Carbon score → Premium pricing |
| **Banks** | — | ESG risk → Green bond qualification |
| **Customs** | — | CBAM pre-validation → Faster clearance |
| **Investors** | Blockchain offset proof | Carbon audit trail → ESG due diligence |
| **Regulators** | GRI report | Real-time carbon monitoring → Compliance API |
| **Consumers** | QR → Grade | Product carbon label → Purchase decision |

### Maturity Path

```
Level 1: Carbon Calculator        ← Current (per-product footprint)
Level 2: ESG Governance Module    ← Current (GRI + offset + blockchain)
Level 3: Carbon Intelligence      ← Next (Risk integration + cross-org)
Level 4: Industry Carbon Index    ← Future (Moody's-style ESG rating)
Level 5: Carbon Trading Platform  ← Vision (Offset marketplace + verification)
```

---

## XV. MỐI LIÊN HỆ CHIẾN LƯỢC LỚN HƠN

Carbon là cầu nối giữa:

```
Anti-counterfeit → Risk governance → ESG compliance → Investor trust
```

Carbon giúp hệ thống bước ra khỏi phạm vi "chống giả". Nó đưa TrustChecker vào:

| Market | Size | Carbon's Role |
|---|---|---|
| **ESG Compliance** | $50B+ | GRI/CSRD/CBAM reporting |
| **Climate Reporting** | $20B+ | Scope 1/2/3 per product |
| **Green Finance** | $500B+ | ESG risk for green bonds |
| **Carbon Trading** | $900B+ | Offset verification + marketplace |
| **Cross-border Governance** | Growing | CBAM pre-validation |

> **Thị trường ESG + Carbon lớn hơn nhiều so với anti-counterfeit.**
> Carbon Passport là vehicle đưa TrustChecker vào ESG infrastructure market.

---

## XVI. KẾT LUẬN

Carbon Passport trong hệ thống TrustChecker:

| Layer | Carbon = |
|---|---|
| **SCM** | Dữ liệu gốc (route, shipment, partner, warehouse) |
| **Carbon Engine** | Tính toán ESG intelligence (Scope 1/2/3, grading) |
| **Risk** | Chuyển ESG thành risk factor (BRI, CRS, ERS) |
| **Compliance** | Biến thành regulatory output (GRI, CSRD, CBAM) |
| **Blockchain** | Bảo chứng tính bất biến (seal, anchor, evidence) |
| **CEO** | Biến thành valuation KPI (ESG Grade, 2030 target) |
| **Super Admin** | Biến thành industry index (cross-org benchmark) |

```
         ┌─── SCM Data ────────── raw material
         │
         ├─── Carbon Engine ───── ESG computation
         │
         ├─── Risk Engine ─────── risk amplification
         │
Carbon = ├─── Compliance ──────── regulatory shield
         │
         ├─── Blockchain ──────── trust infrastructure
         │
         ├─── CEO Dashboard ───── valuation signal
         │
         └─── Super Admin ─────── ecosystem intelligence
```

> **Carbon Passport = Governance Amplifier Module.**
> Không phải ESG module đơn lẻ. Không phải carbon calculator.
> Đây là governance infrastructure layer chạy xuyên toàn bộ kiến trúc TrustChecker.

---

*Carbon Passport v2.0 — Cross-Cutting ESG Governance Intelligence*
*GHG Protocol + DEFRA 2025 + GRI 2021 + Blockchain Integrity*

