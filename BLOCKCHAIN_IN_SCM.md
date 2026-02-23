# Blockchain trong Chuỗi Cung Ứng — TrustChecker Architecture

## Vai trò của Blockchain: Không thay ERP, mà Neo Niêm Dữ Liệu

---

## I. ĐỊNH VỊ BLOCKCHAIN TRONG TRUSTCHECKER

TrustChecker **không phải blockchain platform**. TrustChecker sử dụng blockchain như **lớp niêm phong dữ liệu** (Data Sealing Layer) — đảm bảo tính bất biến, minh bạch và kiểm chứng được cho dữ liệu chuỗi cung ứng.

```
┌────────────────────────────────────────────────────┐
│  TrustChecker Application Layer                    │
│  (Risk Engine, Code Governance, Case Workflow)     │
├────────────────────────────────────────────────────┤
│  Data Integrity Layer (Layer 4 — EAS v2.0)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Hash Chain    │  │ Digital Sign │  │ TSA      │ │
│  │ SHA-256       │  │ RSA-2048     │  │ RFC 3161 │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         └──────────┬──────┘              │        │
│              ┌─────▼─────┐               │        │
│              │ Blockchain │◄──────────────┘        │
│              │ Seal Layer │                        │
│              └────────────┘                        │
├────────────────────────────────────────────────────┤
│  Storage: PostgreSQL / S3 / WORM                   │
└────────────────────────────────────────────────────┘
```

### Nguyên tắc thiết kế:

| Nguyên tắc | Giải thích |
|---|---|
| **Blockchain = Seal, không phải Storage** | Dữ liệu gốc nằm trong DB. Blockchain chỉ lưu hash proof |
| **Hybrid approach** | Private chain cho tốc độ + public anchor cho trust |
| **Optional, not mandatory** | Hệ thống hoạt động đầy đủ không cần blockchain. Blockchain là lớp trust bổ sung |
| **Append-only** | Blockchain seals không bao giờ bị xóa hay sửa |

---

## II. KIẾN TRÚC BLOCKCHAIN SEAL

### 2.1 Mô hình BlockchainSeal

```
model BlockchainSeal {
  id         String    — UUID duy nhất
  eventType  String    — Loại sự kiện (scan, breach, evidence, model_deploy)
  eventId    String    — ID của entity gốc
  dataHash   String    — SHA-256(event_payload)
  prevHash   String    — Hash của seal trước (chain link)
  merkleRoot String?   — Merkle root (nếu batch seal)
  blockIndex Int?      — Vị trí trong chain
  nonce      Int       — Proof-of-work nonce (nếu dùng)
  sealedAt   DateTime  — Timestamp niêm phong
}
```

### 2.2 Luồng niêm phong (Sealing Flow)

```
Sự kiện xảy ra (scan, breach, model deploy, evidence upload)
  │
  ▼
Tính SHA-256(event_payload)
  │
  ▼
Lấy prevHash = hash của seal cuối cùng
  │
  ▼
Tạo BlockchainSeal { dataHash, prevHash, eventType, eventId }
  │
  ▼
Tính merkleRoot (nếu batch nhiều seals)
  │
  ├──► Lưu vào DB (PostgreSQL)
  │
  └──► (Optional) Anchor lên public blockchain
       (Ethereum, Polygon, hoặc TSA)
```

---

## III. ỨNG DỤNG CỤ THỂ TRONG CHUỖI CUNG ỨNG

### 3.1 Niêm phong Mã sản phẩm (Code Sealing)

```
Mã QR được tạo → SHA-256(code + tenant_salt) → BlockchainSeal
```

| Bước | Dữ liệu | Hash gốc |
|---|---|---|
| Tạo mã | `TC-2026-00001` | `a1b2c3...` |
| In mã | Print event | `d4e5f6...` (prevHash = a1b2c3) |
| Kích hoạt | Activation | `g7h8i9...` (prevHash = d4e5f6) |
| Quét lần 1 | First scan | `j0k1l2...` (prevHash = g7h8i9) |

**Kết quả:** Mỗi mã QR có chuỗi hash liên tục từ lúc tạo đến lúc quét. Không ai có thể xóa hay sửa bất kỳ bước nào mà không phá vỡ chuỗi.

### 3.2 Niêm phong Sự kiện chuỗi cung ứng

| Sự kiện | eventType | Dữ liệu được hash |
|---|---|---|
| Lô hàng xuất xưởng | `batch_shipped` | batch_id, quantity, origin, destination |
| Hàng đến kho | `warehouse_received` | shipment_id, quantity, location, timestamp |
| Quét tại điểm bán | `retail_scan` | code_id, geo, device, timestamp |
| Vi phạm tuyến đường | `route_breach` | route_id, rule_id, scanned_in, severity |
| Cảnh báo gian lận | `fraud_alert` | code_id, ers_score, factors, classification |

### 3.3 Niêm phong Chứng cứ điều tra (Evidence Sealing)

```
Forensic Case tạo → Thu thập scan chain → Freeze case
  │
  ▼
Evidence Package:
  ├─ Scan logs → SHA-256 → Seal #1
  ├─ Device data → SHA-256 → Seal #2
  ├─ Risk breakdown → SHA-256 → Seal #3
  ├─ Geo trace → SHA-256 → Seal #4
  │
  ▼
Merkle Root = SHA-256(Seal#1 + Seal#2 + Seal#3 + Seal#4)
  │
  ▼
Package Hash = SHA-256(Merkle Root + case_id + timestamp)
  │
  └──► Anchor to TSA (RFC 3161) + Optional public chain
```

**Giá trị pháp lý:** Khi xuất chứng cứ cho cơ quan quản lý, gói chứng cứ có:
- Hash chain liên tục (tamper-proof)
- Timestamp từ TSA độc lập (thời gian không giả được)
- Digital signature (xác thực người xuất)

### 3.4 Niêm phong Thay đổi Model rủi ro

```
Model v2.3.0 (weights) → SHA-256(weights_json) → BlockchainSeal
  │
  Deploy to production → SHA-256(deploy_event) → BlockchainSeal
  │
  Compliance co-sign → SHA-256(approval_event) → BlockchainSeal
```

**Giá trị audit:** Auditor có thể verify rằng model hiện tại đúng là model đã được approve, không bị thay đổi sau khi deploy.

---

## IV. SỰ KHÁC BIỆT VỚI CÁC HỆ THỐNG KHÁC

### 4.1 TrustChecker vs IBM Food Trust

| Tiêu chí | IBM Food Trust | TrustChecker |
|---|---|---|
| **Loại blockchain** | Hyperledger Fabric (permissioned) | Hybrid: Private chain + public anchor |
| **Dữ liệu on-chain** | Toàn bộ traceability data | Chỉ hash proof (seal) |
| **Tốc độ** | ~2-5 giây/transaction | <100ms (hash + DB write) |
| **Chi phí** | $0.01-0.10/transaction | ~$0 (self-hosted) |
| **Mục đích** | Traceability network | Risk intelligence + trust proof |
| **Phụ thuộc** | Cần tất cả partner join network | Hoạt động độc lập, partner optional |
| **Scalability** | Giới hạn bởi consensus | Không giới hạn (hash-only) |

### 4.2 TrustChecker vs VeChain (ToolChain)

| Tiêu chí | VeChain | TrustChecker |
|---|---|---|
| **Chain** | Public (VeChainThor) | Private first, public anchor |
| **Token** | VET + VTHO (gas fee) | Không cần token |
| **Focus** | IoT + supply chain trace | Risk scoring + governance |
| **Dữ liệu** | On-chain metadata | Off-chain data, on-chain hash |
| **Enterprise model** | BaaS (Blockchain as a Service) | SaaS (Risk Governance Layer) |

### 4.3 Tại sao TrustChecker chọn Hash-Only approach?

| Lý do | Giải thích |
|---|---|
| **Tốc độ** | P99 < 100ms. Full on-chain = 2-30 giây → không chấp nhận được cho real-time scan |
| **Chi phí** | 100K scan/ngày × $0.01 = $1,000/ngày. Hash-only = $0 |
| **GDPR** | Dữ liệu PII không được lên public chain. Hash-only → GDPR compliant |
| **Độc lập** | Không phụ thuộc vào network nào. Không cần partner join chain |
| **Đủ mạnh** | SHA-256 hash chain = cùng mức tamper-proof với full blockchain cho mục đích audit |

---

## V. CÁC LỚP TRUST TRONG TRUSTCHECKER

```
Lớp 1: Application Trust
  └─ RBAC + SoD + 4-Eyes → Ai làm gì, ai approve gì

Lớp 2: Data Trust (Hash Chain)
  └─ SHA-256 chain → Dữ liệu không bị sửa

Lớp 3: Time Trust (TSA)
  └─ RFC 3161 → Timestamp không giả được

Lớp 4: Identity Trust (Digital Signature)
  └─ RSA-2048 → Người ký không chối được

Lớp 5: Evidence Trust (Blockchain Seal)
  └─ Merkle Root + public anchor → Bên thứ 3 verify được

Lớp 6: Network Trust (Optional)
  └─ Public chain anchor → Toàn cầu verify, không cần trust TrustChecker
```

---

## VI. LUỒNG XÁC THỰC SẢN PHẨM (End-to-End)

```
Nhà máy tạo mã QR
  │ ← BlockchainSeal #1 (code_generated)
  ▼
In mã lên sản phẩm
  │ ← BlockchainSeal #2 (code_printed)
  ▼
Xuất kho → Vận chuyển → Nhập kho đại lý
  │ ← BlockchainSeal #3, #4, #5 (supply_chain_events)
  ▼
Người tiêu dùng quét mã
  │ ← BlockchainSeal #6 (first_scan)
  │
  ├─ Hàng thật → ✅ "Verified" + hiển thị lịch sử supply chain
  │
  └─ Nghi ngờ → ⚠ ERS score cao
       │ ← BlockchainSeal #7 (fraud_alert)
       ▼
     Điều tra → Forensic Case → Evidence Package
       │ ← BlockchainSeal #8-#12 (evidence_sealed)
       ▼
     Kết luận → Gửi cơ quan quản lý
       └─ Gói chứng cứ: Hash chain + TSA + Digital signature
          → Cơ quan quản lý verify độc lập ✅
```

---

## VII. KHI NÀO NÊN BẬT BLOCKCHAIN SEAL?

| Tình huống | Blockchain Seal | Lý do |
|---|---|---|
| Scan event bình thường | ⚠ Optional | Volume lớn, hash chain đủ |
| Fraud alert | ✅ Bắt buộc | Cần tamper-proof cho điều tra |
| Evidence package | ✅ Bắt buộc | Pháp lý yêu cầu |
| Model deploy/rollback | ✅ Bắt buộc | Audit trail |
| Route breach (critical) | ✅ Bắt buộc | Compliance evidence |
| Code generation batch | ✅ Recommended | Chống giả mạo mã |
| Shipment handoff | ✅ Recommended | Trách nhiệm giữa các bên |
| SLA violation | ⚠ Optional | Nice to have |

---

## VIII. BACKEND IMPLEMENTATION (Đã triển khai)

### 8.1 Enterprise Data Integrity Add-on — `/api/scm/integrity/*`

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /seal` | ✅ Auth | Seal sự kiện (chỉ material risk) |
| `GET /chain` | ✅ Auth | Xem chuỗi seal |
| `GET /verify-chain` | ✅ Auth | Kiểm tra toàn bộ chain |
| `GET /public/verify?hash=` | ❌ No auth | **Evidence Verification Portal** — Auditor/regulator verify độc lập |
| `POST /public/verify-evidence` | ❌ No auth | Verify toàn bộ evidence package |
| `GET /trust-report` | ✅ Auth | **CEO Trust Report** — Brand Protection Strength |
| `GET /anchor-config` | ✅ Admin | Xem cấu hình anchor |
| `PUT /anchor-config` | ✅ Admin | Cấu hình anchor provider |
| `GET /module-status` | ✅ Auth | Trạng thái add-on (bật/tắt) |

### 8.2 Chain-Agnostic Anchor Providers

| Provider | Cost | Use Case |
|---|---|---|
| `none` | $0 | Hash chain only — đủ cho đa số audit |
| `tsa_only` | $0-50/tháng | TSA timestamp — recommended minimum |
| `polygon` | ~$0.001/tx | Low-cost public anchor — high volume |
| `ethereum` | ~$1-50/tx | Highest trust — dùng batch/merkle |
| `avalanche` | ~$0.01/tx | Fast finality — enterprise-friendly |

Failover: Nếu primary anchor fail → auto fallback TSA-only. Hash chain không bị ảnh hưởng.

### 8.3 Material Risk Policy — Chỉ seal khi cần

Chỉ seal các event type:
`fraud_alert` | `route_breach` | `evidence_sealed` | `model_deployed` | `model_rollback` | `case_frozen` | `batch_locked` | `code_generated`

Scan event bình thường → **KHÔNG seal** → tránh over-engineering.

---

## IX. KẾT LUẬN

### Blockchain trong TrustChecker = Trust Amplifier (Toggleable)

> Blockchain không phải core product. Core product là **Risk Engine + Code Governance + Forensic Investigation**.
>
> Blockchain là **Enterprise Data Integrity Add-on** — có thể bật/tắt, pricing riêng, compliance-specific.

### Giá trị chỉ xuất hiện khi:
1. ✅ Có fraud case thực tế cần legal escalation
2. ✅ Có enterprise yêu cầu audit tamper-proof
3. ✅ Có regulatory pressure

### Giá trị thương mại:

| Đối tượng | Giá trị blockchain mang lại |
|---|---|
| **CEO** | Trust Report: Brand Protection Strength score, seal coverage % |
| **Compliance** | Evidence package đạt chuẩn pháp lý — TSA + hash + signature |
| **Auditor** | Public Verification Portal — verify độc lập, không cần đăng nhập |
| **Partner** | Mọi handoff đều có bằng chứng — non-repudiation |
| **Investor** | Data integrity at infrastructure level — toggleable add-on |

---

*Tài liệu này là một phần của TrustChecker Enterprise Architecture — tham chiếu EAS v2.0 Layer 4 (Data Integrity & Audit Layer).*

