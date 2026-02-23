# TrustChecker — Mô Tả Chức Năng Hệ Thống

**Version**: 9.4.1 | **Database**: PostgreSQL (61 tables) | **Runtime**: Node.js + PM2  
**Architecture**: Event-Driven | Edge-First | AI-Evolvable  
**Engines**: 85 | **Route Files**: 72 | **API Mount Points**: 160  
**Narrative**: Digital Trust & Carbon Infrastructure for Global Supply Chains  
**Constitutional Charters**: 3 (15 articles)

---

## 1. 🔐 Authentication & Identity

| Mount | Mô tả |
|---|---|
| `/api/auth` | Đăng ký, đăng nhập, JWT token, refresh, logout, MFA (TOTP), password reset |
| `/api/identity` | DID (Decentralized Identity), verifiable credentials, identity graph |
| `/api/kyc` | KYC/AML verification, document upload, identity scoring, risk assessment |

**Engine**: `identity-engine.js` (DID management, credential issuance)  
**Bảo mật**: JWT + RBAC (19 roles, 143 permissions), dual-key cho crisis operations

---

## 2. 📦 Product Management

| Mount | Mô tả |
|---|---|
| `/api/products` | CRUD sản phẩm, batch import, trust score, product lifecycle, serialization |
| `/api/qr` | QR code generation, scan verification, scan analytics, anti-counterfeit |
| `/api/nft` | NFT certificate mint, on-chain verification, certificate gallery |

**Engine**: `trust.js` (trust score calculation), `blockchain.js` (on-chain sealing)  
**Tính năng chính**: Mỗi sản phẩm có trust score, lịch sử verification, blockchain seal

---

## 3. 🔗 Supply Chain Management (SCM)

| Mount | Mô tả |
|---|---|
| `/api/scm` | Shipment tracking, logistics, supply chain events |
| `/api/scm/inventory` | Inventory management, stock levels, reorder alerts |
| `/api/scm/partners` | Partner management, trust scores, onboarding |
| `/api/scm/leaks` | Supply chain leak detection, counterfeit tracing |
| `/api/scm/graph` | Trust graph visualization, supplier network mapping |
| `/api/scm/epcis` | EPCIS 2.0 event capture, GS1 standard compliance |
| `/api/scm/ai` | Advanced SCM AI: demand forecasting, anomaly prediction |
| `/api/scm/risk` | Risk radar: supplier risk scoring, geopolitical risk |
| `/api/scm/carbon` | Carbon footprint per shipment, Scope 1/2/3 tracking |
| `/api/scm/carbon-credit` | Carbon credit registry, CBAM compliance, Verra/Gold Standard |
| `/api/scm/twin` | Digital twin: real-time supply chain simulation |
| `/api/scm/supply` | Supply route optimization, multi-modal logistics |
| `/api/scm/model` | Risk model governance, model lifecycle, backtesting |
| `/api/scm/forensic` | Forensic investigation, chain-of-custody analysis |
| `/api/scm/classify` | Product/scan classification engine (ML-based) |
| `/api/scm/ml` | ML pipeline: training, inference, model versioning |
| `/api/scm/code-gov` | Code governance, model integrity, audit trail |
| `/api/scm/integrity` | Data integrity verification, hash chain validation |

**Engines** (10): `advanced-scm-ai.js`, `carbon-engine.js`, `carbon-credit-engine.js`, `carbon-registry-engine.js`, `digital-twin.js`, `epcis-engine.js`, `risk-radar.js`, `trust-graph-engine.js`, `trust-graph-governance.js`, `scm-ai.js`

---

## 4. ⚖️ Compliance & Governance

| Mount | Mô tả |
|---|---|
| `/api/compliance` | GDPR, SOC 2, ISO 27001, data retention, consent management, DPO tools |
| `/api/compliance-regtech` | RegTech automation, regulatory reporting, policy engine |
| `/api/governance` | Constitutional governance: separation of powers, role boundaries |
| `/api/sod` | Separation of Duties: waiver management, conflict detection |
| `/api/audit-log` | Immutable audit trail, tamper-evident log, compliance export |

**Engines**: `compliance-engine.js`, `governance-engine.js`, `sa-constraints.js`  
**Framework**: 5-engine separation (Risk, Compliance, Ops, IT, Admin) — no single engine has full control

---

## 5. 🛡️ Risk & Anomaly Detection

| Mount | Mô tả |
|---|---|
| `/api/anomaly` | Anomaly detection, fraud patterns, statistical outliers |
| `/api/risk-graph` | Risk knowledge graph, entity relationships, risk propagation |
| `/api/trust` | Stakeholder trust scoring, multi-dimensional trust assessment |

**Engines**: `anomaly.js`, `fraud.js`, `risk-graph-engine.js`, `risk-intelligence-infra.js`, `risk-model-governance.js`, `lrgf-engine.js` (Layered Risk Governance), `mrmf-engine.js` (Model Risk Management), `ercm-engine.js` (Enterprise Risk & Compliance)

---

## 6. 💰 Billing & Monetization

| Mount | Mô tả |
|---|---|
| `/api/billing` | 5-tier SaaS plans (Free→Enterprise), usage tracking, invoices, overage, SDK/API keys |
| `/api/billing/transaction-fees` | Per-transaction fees: QR ($0.02), Carbon ($0.50), NFT ($1.50), Blockchain ($0.25) |
| `/api/billing/revenue` | Revenue report, tenant invoice, pricing simulator |
| `/api/wallet` | Digital wallet, payment processing, balance management |
| `/api/distribution` | Validator incentives, partner revenue sharing (4 tiers), payout processing |
| `/api/api-economy` | API marketplace, metered API access, developer portal |

**Engines**: `pricing-engine.js` (5 plans + volume tiers), `transaction-fee-engine.js` (per-tx pricing), `fee-distribution-engine.js` (validator/partner payouts), `api-economy-engine.js`

**Pricing tiers**: Free ($0) → Starter ($49) → Pro ($199) → Business ($499) → Enterprise (custom)

---

## 7. 🚨 Crisis & Incident Management

| Mount | Mô tả |
|---|---|
| `/api/crisis` | Kill-switch (tenant/module/global), 5 crisis levels, dual-key auth, playbooks, drill simulation |
| `/api/ops` | Incident lifecycle (open→post_mortem), SLA escalation, war room, MTTR metrics |

**Engines**: `crisis-engine.js`, `ops-monitoring-engine.js`

**Crisis Levels**: MONITOR → YELLOW → ORANGE → RED → BLACK  
**Kill-Switch**: Dual-key auth cho RED/BLACK, auto-deactivation timers  
**Playbooks**: Data breach, service outage, supply chain compromise, financial fraud, insider threat  
**Incident Lifecycle**: open → acknowledged → in_progress → resolved → post_mortem (blameless 5-Whys)

---

## 8. 🌐 Network Topology

| Mount | Mô tả |
|---|---|
| `/api/network` | Validator node registration, peer discovery, consensus, network health |

**Engine**: `network-topology-engine.js`

**Node Types**: Validator, Relay, Archive, Observer  
**Regions**: 8 global (AP-SE, AP-E, EU-W, EU-N, US-E, US-W, ME-S, AF-S)  
**Consensus**: Proof-of-Trust (BFT 2f+1, 67% quorum, 3-7 validators/round)  
**Features**: Heartbeat monitoring, peer auto-discovery, trust score staking, node suspension/slash

---

## 9. 🏗️ Infrastructure & Security

| Mount | Mô tả |
|---|---|
| `/api/infra-custody` | Encryption status, tenant isolation, key management, DR readiness |
| `/api/hardening` | Security hardening checks, vulnerability scan, CSP headers, rate limiting |
| `/api/platform` | Platform architecture, microservice topology, dependency graph |
| `/api/economics` | **Unit economics**: compute/storage/gas/bandwidth cost per transaction, scale projection (1x-1000x), blockchain chain comparison |
| `/api/reserves` | **Risk reserves**: fraud (3%), carbon reversal (5%), chargeback (2%), regulatory (1%), insurance (2%) + claims workflow + chargeback protocol |
| `/api/sovereignty` | **Data sovereignty**: 7 zones (EU/US/APAC/CN/LATAM/ME/AF), GDPR/PIPL/LGPD routing, cross-border transfer assessment |
| `/api/regulatory` | **Regulatory licensing**: 5 license types × 15+ jurisdictions, cross-border compliance, sanctions screening (OFAC) |
| `/api/sla` | **Enterprise SLA**: 5-tier contracts (Best Effort→Enterprise 99.95%), SLO measurement, breach detection, financial credit calculation |

**Engines**: `infrastructure-custody-engine.js`, `platform-architecture-engine.js`, `observability-engine.js`, `unit-economics-engine.js`, `risk-reserve-engine.js`, `data-sovereignty-engine.js`, `regulatory-map-engine.js`, `enterprise-sla-engine.js`  
**Security**: TLS 1.3, SHA-256 hash chain, HSM/KMS key storage, 90-day rotation

---

## 10. 🌱 Sustainability & Green Finance

| Mount | Mô tả |
|---|---|
| `/api/sustainability` | ESG reporting, carbon accounting, sustainability dashboard |
| `/api/green-finance` | Green bond framework, climate-aligned finance, taxonomy alignment |

**Engines**: `green-finance-engine.js`, `carbon-engine.js`, `carbon-registry-engine.js`

---

## 11. 👥 Organization & Admin

| Mount | Mô tả |
|---|---|
| `/api/admin` | User management, role assignment, system config, dashboard stats |
| `/api/org` | Multi-tenant organization CRUD, member management, feature flags |
| `/api/tenant` | Tenant admin: org settings, billing, user provisioning, SSO |
| `/api/system` | System settings, health checks, maintenance mode |
| `/api/license` | License management, feature gates, seat allocation |

---

## 12. 📡 Communication & Integration

| Mount | Mô tả |
|---|---|
| `/api/notifications` | Push notifications, email alerts, in-app messaging |
| `/api/email` | Transactional email, templates, delivery tracking |
| `/api/webhooks` | Webhook management, event subscriptions, delivery logs |
| `/api/assistant` | AI chatbot (GPT), context-aware Q&A, command interpretation |
| `/api/reports` | Report generation, PDF/CSV export, scheduled reports |
| `/api/branding` | White-label customization, logos, themes, custom domains |
| `/api/evidence` | Evidence management, file upload, chain-of-custody, forensic export |
| `/api/support` | Support ticket system, SLA tracking, knowledge base |
| `/api/reputation` | Brand reputation scoring, public trust verification |

**Engines**: `ai-assistant.js`, `emailTemplates.js`, `webhookEngine.js`, `reputation-engine.js`

---

## 13. 📜 Constitutional Governance Charters

| Mount | Charter | Articles |
|---|---|---|
| `/api/charter/economic` | **Economic Governance Charter** — Revenue allocation (70/20/10), pricing authority matrix, treasury controls (dual-key), economic rights of tenants/validators/partners, amendment process (65-day, 75% super-majority) | 5 |
| `/api/charter/network` | **Network Power Charter** — Governance model (hybrid permissioned), consensus finality (immutable), Validator Bill of Rights (8 rights), slashing constitution (max 50%/incident, 14-day appeal), decentralization roadmap (3 phases: Permissioned → Governed → Autonomous) | 5 |
| `/api/charter/crisis` | **Crisis Constitution** — Crisis levels & activation authority (MONITOR→BLACK with auto-expire), chain of command (4 roles + succession), emergency power limits (bounded + prohibited actions), accountability (48h debrief, anti-coverup clause), drill schedule (monthly/quarterly/annual) | 5 |
| `/api/charter/all` | Combined — returns all 3 charters in single response | — |

**Engines**: `economic-governance-charter.js`, `network-power-charter.js`, `crisis-constitution.js`, `constitutional-rbac-engine.js`  
**Validation endpoints**: pricing change validation, treasury withdrawal validation, slashing validation, crisis action validation  
**Nguyên tắc cốt lõi**: Quyền lực khẩn cấp là TẠM THỜI, CÓ GIỚI HẠN, và CÓ THỂ KIỂM TOÁN

### Constitutional RBAC Enforcement (code-enforced, non-bypassable)

| Mount | Mô tả |
|---|---|
| `/api/charter/governance-audit` | Governance audit — 5 critical checks enforced by code |
| `/api/charter/powers/:role` | Role power map — what a role CAN, CANNOT, and CONDITIONALLY do |
| `/api/charter/enforce` | Test enforcement: `POST { role, action }` → allowed/denied + charter reference |
| `/api/charter/separations` | 6 critical separations + cross-mapping matrix |
| `/api/charter/domain/:domain` | Domain-specific power definitions (monetization/network/crisis) |

**Middleware**: `requireConstitutionalWithAudit(action)` — CANNOT be bypassed, not even by `super_admin`. Logs EVERY allow/deny to `audit_log` DB.

**Dual-Key Enforcement**: `requireDualKey(action, roles)` — requires `x-second-approver` + `x-second-approver-role` headers. Anti-self-approval enforced.

**Deep Enforcement Coverage (9 mutation endpoints)**:

| Route | Endpoint | Constitutional Action | Extra |
|---|---|---|---|
| `infra-maturity.js` | `POST /reserves/contribute` | `monetization.treasury.payout` | — |
| | `POST /reserves/claim` | `monetization.reserve.withdraw` | — |
| | `PUT /reserves/claim/:id/resolve` | `monetization.reserve.withdraw` | **DUAL-KEY** (risk + compliance) |
| | `POST /sla/contracts` | `monetization.sla_credit.calculate` | — |
| | `POST /sla/credit` | `monetization.sla_credit.calculate` | — |
| `network-topology.js` | `POST /nodes` (register) | `network.validator.admit` | **MULTI-PARTY** (ggc_member) |
| | `POST /nodes/:id/activate` | `network.validator.admit` | — |
| | `POST /nodes/:id/suspend` | `network.validator.suspend` | **MULTI-PARTY** (risk + ggc) |
| `fee-distribution.js` | `POST /payout` | `monetization.treasury.payout` | **DUAL-KEY** (risk + compliance) |

**Immutable Audit Logging**: Mọi constitutional action (cả ALLOW lẫn DENY) → `[CONSTITUTIONAL-AUDIT]` console + INSERT vào `audit_log` table

**6 Critical Separations (hardcoded in code)**:

| # | Rule | Entity | Cannot |
|---|---|---|---|
| SEP-1 | Super Admin ≠ Financial Controller | `super_admin` | Revenue change, reserve withdraw, treasury payout |
| SEP-2 | Blockchain Op ≠ Governance Authority | `blockchain_operator` | Validator admit/suspend/slash, protocol upgrade |
| SEP-3 | IVU ≠ Weight Setter | `ivu_validator` | Scoring weights, validator suspend, consensus override |
| SEP-4 | Risk ≠ Execution | `risk_committee` | Reserve withdraw, treasury payout, chain anchor |
| SEP-5 | Compliance ≠ Economic Allocator | `compliance_officer` | Revenue change, pricing change, incentive change |
| SEP-6 | Treasury ≠ Policy Maker | `treasury_role` | Revenue change, pricing change, validator admit |

**Cross-Mapping Matrix**:

| Layer | Policy | Execution | Oversight | Visibility |
|---|---|---|---|---|
| Monetization | GGC | Treasury (dual-key) | Risk + Compliance | Super Admin |
| Network | GGC | Validator set | Risk | Super Admin |
| Slashing | Risk propose | GGC approve | IVU observe | Super Admin |
| SLA | GGC | Auto engine | Compliance | Super Admin |
| Crisis | Council | Technical | Compliance | Super Admin |

### Governance Safeguards — Anti-Collusion & Anti-Centralization

| Mount | Mô tả |
|---|---|
| `/api/charter/safeguards` | Full safeguards overview: 3 vulnerabilities addressed |
| `/api/charter/safeguards/ggc-composition` | Validate GGC composition: 40% independent min, 30% single-entity cap |
| `/api/charter/safeguards/ggc-vote` | Validate GGC vote: quorum + independent vote requirements per vote type |
| `/api/charter/safeguards/dual-key-check` | Entity separation check: same entity → BLOCK, same reporting line → FLAG |
| `/api/charter/safeguards/audit-entry` | Create hash-chained audit entry (SHA-256, tamper-proof) |
| `/api/charter/safeguards/verify-chain` | Verify audit chain integrity: any tamper → BLACK-level alert |
| `/api/charter/safeguards/db-policy` | 4-tier DB access control policy |

**Engine**: `governance-safeguards-engine.js`

**3 Vulnerabilities Addressed**:

| # | Lỗ hổng | Giải pháp |
|---|---|---|
| VULN-1 | GGC Collusion | 40% independent minimum, 30% single-entity cap, term limits (3 terms max, 12-month cooling), mandatory recusal, validator + tenant representatives |
| VULN-2 | Risk + Compliance Collusion | Entity-separation check (same org → BLOCK), reporting-line independence, co-approval rotation after 5 uses, $10K+ requires third-party observer |
| VULN-3 | Super Admin DB Access | 4-tier PostgreSQL roles: App (write all except audit), Read-only (Super Admin), Audit (append-only), DBA (separate from Super Admin, 2FA + VPN) |

**Hash-Chained Audit**: `hash(n) = SHA256(hash(n-1) + action + actor + timestamp + details)` — chain break = tamper detected = BLACK-level crisis

---

## 14. 🏦 Market Infrastructure Layers

### Capital & Liability Architecture (`/api/capital`)

| Model | Mô tả |
|---|---|
| **Capital Adequacy (TC-CAR)** | Basel III-inspired: 3 tiers (Core 8%, Supplementary 4%, Contingent), 6 risk weights, $500K floor, 6-month opex |
| **Settlement Risk** | CCP novation: carbon T+1, cross-border T+3, dispute resolution ($500 auto → $50K+ litigation) |
| **Insurance Framework** | $25M total: PI/E&O $5M, Cyber $10M, D&O $5M, Settlement Bond $2M, Tech Bond $3M |
| **Counterparty Limits** | Single max 15%/$500K, connected 25%, country 40%, OFAC screening |
| **Stress Testing** | 6 scenarios: carbon collapse (-80%), mass default, EU freeze, consensus failure, cyber, liquidity |

**Engine**: `capital-liability-engine.js` | **Endpoints**: 9

---

### Economic Incentive & Slashing (`/api/incentive`)

| Model | Mô tả |
|---|---|
| **Reputation Staking** | 5 tiers: Observer → Guardian. Min $1K stake, 30-day lock, 14-day exit |
| **Graduated Slashing** | Tier 0-4: warning → permanent ban + 100% confiscation. Max 50%/incident, evidence required |
| **Reward Distribution** | 20% revenue → validators. Formula: Base × Trust × Uptime × Region. Anti-Sybil |
| **Game Theory** | Nash: honest = dominant strategy. Detection >95%. Cheating = negative EV |
| **Node Economics** | $105/month cost. Breakeven: 200 verifications. Year-3 ROI: 60% (Guardian) |

**Engine**: `incentive-economics-engine.js` | **Endpoints**: 9

---

### Systemic Risk Simulation Lab (`/api/risklab`)

| Model | Mô tả |
|---|---|
| **Contagion Modeling** | 3 propagation types (direct 60%, indirect 25%, reputational 15%) + circuit breaker |
| **Supply Chain Shocks** | 4 scenarios: supplier failure, port blockage, pandemic, trade war |
| **Carbon Fraud Cascade** | 5-stage: detection → 1st-order → 2nd-order → market impact → resolution (0h → 30d) |
| **Node Failure** | Single (OK) → Dual (OK) → Critical (DANGER) → Loss (HALT) → Byzantine (COMPROMISED) |
| **Monte Carlo VaR** | 10K simulations, 5 risk factors, 95/99/99.9% confidence, Expected Shortfall |

**Engine**: `systemic-risk-lab-engine.js` | **Endpoints**: 8

---

### 📊 Maturity Assessment

| Dimension | Trước | Hiện tại |
|---|---|---|
| Product maturity | SaaS + SCM | **Infrastructure layer** |
| Governance | Basic | **Audit-grade** |
| Risk | Partial | **Structured + Simulated** |
| RBAC | Functional | **Constitutional-grade** |
| Network view | None | **Trust Graph + Economics** |
| Monetization | SaaS fee | **Infrastructure rail** |
| Capital logic | ❌ | **✅ Basel III-inspired** |
| Systemic modeling | ❌ | **✅ Monte Carlo + Contagion** |
| Incentive design | ❌ | **✅ Game theory + Slashing** |

---

## 15. 🌐 IPO-Grade Refinements

### External Oversight & Transparency (`/api/oversight`)

| Component | Mô tả |
|---|---|
| **Observer Roles** | 4 types: regulatory (MiCA/SEC/MAS), external auditor (Big 4, 5-year rotation), board observer, validator ombudsman |
| **External Audit API** | 12 endpoints (mTLS + xBRL): financial, CAR, settlement, exposure, governance, RBAC, constitutional log |
| **Transparency Reports** | Quarterly public + annual governance + incident disclosure (24h SLA) |

**Engine**: `external-oversight-engine.js` | **Endpoints**: 5

### Real-Time Capital Adequacy (`/api/car`)

| Component | Mô tả |
|---|---|
| **Live CAR** | 5-color: Green (>12%) → Yellow (10%) → Orange (8%) → Red (6%) → Black (4%) |
| **Dynamic Buffer** | Base 4% + market adjustments up to +8% = max 20% target |
| **Auto Capital Call** | Advisory (30d) → Warning (14d) → Mandatory (7d) → Emergency (3d) |
| **Exposure Tracker** | 5 categories with risk weights (0.15x → 1.0x), mark-to-market |

**Engine**: `realtime-car-engine.js` | **Endpoints**: 7

### Decentralization KPIs (`/api/decentralization`)

| Metric | Mô tả |
|---|---|
| **Nakamoto Coefficient** | Min entities for 51% control. Ideal ≥10, Critical <3 |
| **Validator Diversity (VDI)** | Shannon entropy 0-100. Ideal ≥80, Critical <40 |
| **Geographic HHI** | Herfindahl-Hirschman. Distributed <1500, Concentrated >2500 |
| **Phase Thresholds** | Permissioned→Governed: 15+ validators, Nakamoto≥3. Governed→Autonomous: 50+, Nakamoto≥7 |

**Engine**: `decentralization-kpi-engine.js` | **Endpoints**: 8

### Legal Entity Architecture (`/api/legal`)

| Entity | Jurisdiction | Purpose |
|---|---|---|
| **Holdings Ltd** | Singapore | Ultimate holding — IP, equity, brand |
| **Technology Pte Ltd** | Singapore | Platform operations, SaaS |
| **Settlement GmbH** | Germany | Carbon settlement, CCP (BaFin/MiCA) |
| **Vietnam Co Ltd** | Vietnam | Local ops, DICA routing |
| **IP Ltd** | Singapore | IP licensing (5-8% royalty) |
| **Node Operations Ltd** | Multi-region | Validator infrastructure |
| **Data Compliance Ltd** | Ireland | GDPR controller (DPC) |
| **Capital Reserve Trust** | Singapore | Bankruptcy-remote reserves |

**Ring-fencing**: 5 critical isolation boundaries  
**IPO readiness**: SGX / LSE / NASDAQ mapped  
**Engine**: `legal-entity-engine.js` | **Endpoints**: 7

---

## 16. 💹 Capital Markets Grade

### Financial Reporting — IFRS-Ready (`/api/finance`)

| Component | Mô tả |
|---|---|
| **Revenue Recognition** | IFRS 15: 6 streams (SaaS=over-time, settlement=point-in-time, staking=IFRS 9) |
| **Deferred Liabilities** | IAS 37: contract liability, settlement reserve, SLA provision, slashing escrow, insurance |
| **IFRS Mapping** | 8 applicable standards: IFRS 15, 9, 16, 3, 7 + IAS 37, 38, 36 |
| **Financial Statements** | Consolidated P&L: 6 revenue lines, 4 COGS, 6 opex, 3 other |

**Engine**: `financial-reporting-engine.js` | **Endpoints**: 7

### Treasury & Liquidity (`/api/treasury`)

| Component | Mô tả |
|---|---|
| **LCR** | Basel III: 3-tier HQLA (0/15/50% haircut), 6 outflow categories, 4-color thresholds |
| **Intraday Monitoring** | 6 UTC checkpoints, peak usage alerts, settlement delay tracking |
| **Cash Waterfall** | 9-tier priority: settlements → regulatory → opex → insurance → SLA → rewards → buffer → growth → dividends |
| **Investment Policy** | 4 eligible instruments, single-issuer max 20%, WAM <12 months, 20% overnight liquidity |

**Engine**: `treasury-liquidity-engine.js` | **Endpoints**: 7

### Regulatory Scenario Simulation (`/api/regscenario`)

| Scenario | Probability | Impact |
|---|---|---|
| MiCA classification change | 15-25% | $500K-$2M compliance, 35% revenue at risk |
| EU carbon rule freeze | 5-10% | 25% revenue freeze, 3-month halt |
| OFAC sanctions expansion | 10-20% | 5-20% revenue, immediate disconnect |
| Country settlement prohibition | 15-25% | Corridor revenue zero, rerouting costs |
| Data localization mandate | 30-40% | 20-30% infra cost increase |
| Tax regime change | 25-35% | ±5-15pp effective tax rate |

**Regulatory Readiness**: EU 75, SG 85, US 50, VN 60, UK 70 (composite: 68/100)

**Engine**: `regulatory-scenario-engine.js` | **Endpoints**: 4

### Public Market Narrative (`/api/narrative`)

| Component | Chi tiết |
|---|---|
| **TAM** | $94.4B across 4 segments (SCM $7.2B, Carbon $50B, ESG $22.4B, Trust $14.8B) — 18.9% CAGR |
| **Network Effects** | 4 types: direct (Metcalfe's), data (compounding), cross-side (platform), standard-setting |
| **Moat** | 5 layers: technology (3yr), data (5yr), network (4yr), regulatory (2yr), switching ($300K/client) |
| **Switching Costs** | $300K total: migration $75K, data loss $50K, compliance $25K, opportunity $100K |
| **Comparables** | ICE ($80B), Moody's ($75B), Nasdaq ($55B) → median 12x revenue |
| **Implied Valuation** | $208M SOM × 12x = ~$2.5B | Early $10M ARR × 15x = ~$150M |

**Engine**: `market-narrative-engine.js` | **Endpoints**: 8

---

## 17. 🛡️ Critical Infrastructure Control

### Revenue Governance Map (`/api/revenue-gov`)

| Component | Mô tả |
|---|---|
| **Pricing Authority** | 6 pricing decisions mapped: who approves, who CANNOT, constitutional limits, audit trail |
| **AI → Revenue Conflict** | 4 models mapped: IVU, Carbon Valuation, Counterparty Risk, Dynamic Pricing. Rule: *No role that benefits from revenue controls weights* |
| **Settlement Rail** | 4 rails with authority: activate/suspend/modify require GGC+Risk. Super admin excluded |
| **Fee Governance** | 20% validator + 10% reserve + 5% insurance + 55% operating + 5% governance + 5% community. Constitutional lock: validator ≥15%, reserve ≥8% |

**Engine**: `revenue-governance-engine.js` | **Endpoints**: 5

### Jurisdictional Risk (`/api/jurisdiction`)

| Region | Cloud | Entity | Frameworks | Status |
|---|---|---|---|---|
| EU-W | GCP Belgium | Data Compliance Ltd + Settlement GmbH | MiCA, GDPR, EU ETS | PRIMARY |
| AP-SE | GCP Singapore | Technology Pte Ltd | MAS PSA, PDPA | PRIMARY |
| VN | GCP/Local DC | Vietnam Co Ltd | SBV, MOIT, Cybersecurity Law | ACTIVE |
| US-E | GCP South Carolina | TBD | SEC, CFTC, OFAC, CCPA | PLANNED |
| UK | GCP London | TBD | FCA, UK GDPR, UK ETS | PLANNED |

**OFAC Blocked**: NK, IR, SY, CU, RU (sectoral). 7 carbon registries mapped.

**Engine**: `jurisdictional-risk-engine.js` | **Endpoints**: 6

### Kill-Switch Architecture (`/api/killswitch`)

| Switch | Scope | Authority | Cannot Trigger |
|---|---|---|---|
| KS-01 Network | All operations halt | Crisis Council (2/3) | super_admin alone |
| KS-02 Tenant | Single org frozen | Risk OR Compliance | super_admin |
| KS-03 Scoring | Trust scores frozen | Risk + CTO | super_admin, ivu_validator |
| KS-04 Anchoring | Blockchain halt | CTO | super_admin |
| KS-05 Settlement | Settlement halt | Risk + Compliance | super_admin, treasury alone |
| KS-06 Fee | Fee collection halt | CFO + GGC Chair | super_admin |

**8 circuit breakers** (auto-trigger). **6-level escalation**: L0 Auto → L5 Regulatory.

**Engine**: `kill-switch-engine.js` | **Endpoints**: 6

### Super Admin Institutionalization (`/api/superadmin`)

| CAN DO (~25 actions) | CANNOT DO (~19 blocks) |
|---|---|
| Monitor system health | ❌ Modify trust scores |
| View all dashboards | ❌ Change pricing |
| Create users | ❌ Approve treasury payouts |
| Restart PM2 | ❌ Write to production DB |
| Coordinate incidents | ❌ Trigger network kill-switch |
| Deploy approved code | ❌ Override constitutional rules |

**DB access**: `trustchecker_readonly` (SELECT only). **Accountability**: 3+ blocked attempts → auto-suspend.

**Engine**: `super-admin-boundaries-engine.js` | **Endpoints**: 5

### Model Risk Tiering (`/api/model-risk`)

| Tier | Models | Capital Reserve | Validation | Shutdown Authority |
|---|---|---|---|---|
| **T1 Revenue** | Pricing, Carbon Valuation, Counterparty, Netting | 2% ($375K) | Monthly + quarterly | Risk + CTO |
| **T2 Risk** | Trust Score, Fraud, AML/KYC, Supply Chain, Stress | 1% ($120K) | Quarterly + annual | Risk Committee |
| **T3 Analytics** | Topology, Forecasting, Perf Analytics, TAM, Trends | 0% | Annual | Engineering |

**Total capital-at-risk**: $495K. **6 shutdown criteria**: accuracy, bias, data quality, manipulation, compliance, operator.

**Engine**: `model-risk-tiering-engine.js` | **Endpoints**: 6

---

## 18. 🔗 Integration Locking Layer (Enforceable Infrastructure)

> **Purpose**: Binds 70 engines into 1 coherent enforceable system.  
> Without this: 70 engines = 70 independent modules. With this: enforceable infrastructure.

### Capital → Operational Trigger Map

| Metric | Threshold | Auto-Action | Kill-Switch |
|---|---|---|---|
| CAR | < 12% | Advisory + log | — |
| CAR | < 10% | Waterfall freeze P8-P9, block high-risk onboarding | — |
| CAR | < 8% | Capital call (7d), volume cap 50%, regulatory queued | — |
| CAR | **< 6%** | **KS-05 AUTO Settlement Freeze**, emergency inject (3d) | **KS-05** |
| LCR | < 100% | Waterfall STRESS MODE (P7-P9), credit drawdown | — |
| LCR | **< 80%** | **KS-05 AUTO**, all non-essential payouts halted | **KS-05** |
| Reserve | > 30% drawdown | L3 Crisis Council, replenishment call | — |
| Reserve | **> 50% drawdown** | **KS-05 AUTO**, insurance claim filed | **KS-05** |

### RiskLab → Kill-Switch Binding

| Simulation | Trigger | Kill-Switch | Escalation |
|---|---|---|---|
| Monte Carlo VaR | VaR 99.9% > 100% capital | **KS-05** + capital call | L3 Crisis Council |
| Contagion Spread | ≥3 hops from source | **KS-02** (source entity) | L2, L3 if >5 hops |
| Node Failure | >50% validators offline | **KS-04** Anchoring Freeze | L4 Board if >24h |
| Byzantine Detection | Any confirmed | **KS-01** Full Network Freeze | L4 Board immediate |
| Carbon Fraud | Stage 2+ confirmed | **KS-05** (affected type) | L3→L4→L5 |

### Revenue → Incentive Auto-Stabilizer

| Revenue Change | Validator Reward | Waterfall | Governance |
|---|---|---|---|
| -15% | 18% (from 20%) | Normal | Auto. Risk notified |
| -30% | **15% (constitutional floor)** | Restrict P8-P9 | GGC emergency 48h |
| -50% | 15% (floor) | **FULL STRESS (P6-P9 frozen)** | Crisis Council + Board |
| Recovery >90% | Restore 20% | Normal | Auto if was ≤30%; GGC vote if was >30% |

**Constitutional floors**: Validator ≥15%, Reserve ≥8%. Cannot be changed without charter amendment.

### Charter Amendment Governance

| Process | Duration | Threshold | Special |
|---|---|---|---|
| Standard | 65 days (5+30+15+15) | 75% GGC supermajority | Regulatory observer hearing (mandatory, non-binding) |
| Emergency | 48 hours | **90% GGC** | Must be L3+ crisis. Expires 90 days unless ratified. Cannot touch floors/separation/audit |
| IVU Veto | Scoring amendments | 60% validator block | GGC override: 90% |
| Validator Veto | Staking/rewards/slashing | 50% validator block | GGC override: 80% |

**Coherence Map**: 18 total linkages — 13 auto-enforce + 2 auto-adjust + 3 governance.

**Engine**: `integration-locking-engine.js` | **Endpoints**: 7 | **Runtime**: `POST /integration/evaluate` accepts live metrics → returns active triggers + kill-switches + escalation level

---

## 19. 🏛️ Critical Infrastructure-Grade — Final 3 Pillars

### Systemic Stress & Simulation (`/api/stress`)

| Scenario | Category | Severity | CAR Impact | Key Cascade |
|---|---|---|---|---|
| Carbon price -70% | Market | Critical | -8% | Reserve → CAR → KS-05 |
| Cloud region 72h offline | Technical | Critical | -2% | SLA breach → provisioning |
| Multi-jurisdiction license revoke | Regulatory | Existential | -15% | KS-05 + IPO delay |
| AI model poisoning | Adversarial | High | — | KS-03 Scoring Freeze |
| Validator 30% collusion | Adversarial | Critical | — | KS-01 + slashing |
| **Perfect Storm** (combined) | Combined | **Existential** | **-25%** | All kill-switches |

**Decision Latency SLA**: Auto <10s, T1-Human <4h, T2-Human <48h. Exceeded → auto-escalate.

**Engine**: `systemic-stress-engine.js` | **Endpoints**: 5

### Economic & Capital Risk (`/api/econrisk`)

| Component | Chi tiết |
|---|---|
| **Revenue Risk** | 4 streams mapped: concentration alerts, correlation with Trust Graph (r=0.72 trust→churn) |
| **Tenant Credit** | 6-factor scoring (trust 25%, payment 20%, settlement 20%, maturity 15%, external 10%, engagement 10%). 5 tiers: Platinum→Restricted |
| **Cost Allocation** | 5 categories: compute (usage-based), validator (tx-proportional), anchoring (gas+batch), compliance (jurisdiction), insurance (risk-weighted) |
| **Token Economics** | Validator: $10K-$500K stake, 8% target yield, slashing up to 100%. Break-even: 1000 tx/day |
| **Financial ↔ Trust** | Bidirectional: 4 trust→financial signals + 4 financial→trust signals. Anti-manipulation: financial weight capped 30% |

**Engine**: `economic-risk-engine.js` | **Endpoints**: 7

### Cross-Tenant Contagion (`/api/contagion`)

| Model | Chi tiết |
|---|---|
| **Trust Contagion** | Weighted graph diffusion, decay 0.4/hop, max 4 hops. 5 edge types (supplier 0.8, batch 0.3, carbon 0.6, sector 0.1, geo 0.05) |
| **Shared Route Risk** | 4 dependency types: logistics provider (<40%), hub (<25%), certifier (min 3), registry (multi-registry) |
| **Anchoring Cross-Impact** | 4 risks: congestion, smart contract bug, chain fork, privacy leakage. Per-tenant namespacing |
| **Contagion Breakers** | CCB-01: trust >5 tenants → KS-02. CCB-03: anchor backlog >10K → KS-04. CCB-04: netting chain >$1M → gross mode |

**Engine**: `cross-tenant-contagion-engine.js` | **Endpoints**: 6

---

## 20. ⚖️ Legitimacy Layer

> **Purpose**: Economic logic + Forensic logic + Jurisdiction logic = **institutional legitimacy**.

### Economic Logic (`/api/economic-logic`)

| Component | Chi tiết |
|---|---|
| **Mechanism Design** | Incentive compatibility proofs: validator (18x safety margin, expected cheat value = -$45,500), tenant (trust premium > fabrication benefit), GGC (95% detection) |
| **Game Theory** | 3 Nash Equilibria proven: Validator-Validator (honesty dominant via slashing), Platform-Tenant (constitutional price limits), Regulator-Platform (compliance = competitive moat) |
| **Sustainability** | Anti-death-spiral: constitutional reward floor 15%, bankruptcy-remote reserve, $25M insurance buffer, multi-stream diversification |
| **Value Fairness** | 5 stakeholder groups: tenants (>$2 value/$1 paid), validators (yield > risk-free + costs), shareholders (capped extraction), community (transparency), regulators (audit API) |

**Engine**: `economic-logic-engine.js` | **Endpoints**: 6

### Forensic Logic (`/api/forensic`)

| Component | Chi tiết |
|---|---|
| **Evidence Chain** | SHA-256 hash-chain, 5 evidence categories (trust, settlement, governance, verification, access), 7-year retention, tamper = break in <60s |
| **Investigation** | 5-phase protocol: Triage <4h → Evidence <24h → Analysis <72h → Resolution <7d → Disclosure <14d |
| **Tamper Detection** | 5 layers: hash chain (60s), cross-reference (1h), blockchain anchor (5min), ML anomaly (15min), external attestation (quarterly) |
| **Regulatory Evidence** | 3 package types: standard response (<48h), investigation support (<7d), incident disclosure (<72h) |
| **Dispute Forensics** | 4 dispute types: trust score (14d), settlement (T+5), slashing (independent review), data integrity (hash verification) |

**Engine**: `forensic-logic-engine.js` | **Endpoints**: 7

### Jurisdiction Logic (`/api/jurisdiction-logic`)

| Component | Chi tiết |
|---|---|
| **Multi-Law Conflict** | 4 conflict resolutions: GDPR vs CLOUD Act (entity separation), MiCA vs SEC (ring-fencing), PDPA vs VN Cyber (local entity), Carbon cross-border (governing law per function) |
| **Arbitrage Prevention** | 5 safeguards: transfer pricing (OECD), substance requirement, anti-treaty shopping, profit allocation (BEPS), full regulatory reporting |
| **Liability Map** | 7 events mapped: entity → liability → insurance → recourse. Ring-fencing: Entity A liability ≠ Entity B |
| **Governing Law** | 8 contract types: SaaS→SG, Settlement→DE, DPA→IE, Carbon→registry, Employment→local. Disputes: SIAC |
| **Cross-Border** | 5 enforcement mechanisms: SIAC/NY Convention (170+ countries), Brussels I, bilateral treaties, blockchain evidence, audit trail |

**Engine**: `jurisdiction-logic-engine.js` | **Endpoints**: 7

---

## 21. 🧩 Coherence & Simplification Layer

> **Purpose**: Complexity is 7.8/10 — approaching exchange-level. This layer maps, drills, and stress-tests the HUMAN side.

### Architecture Coherence (`/api/coherence`)

| Component | Chi tiết |
|---|---|
| **Unified Map** | 6 layers × 20 key engines mapped: Engine → Control → KS → Role → Capital → Legal Entity |
| **Control Interactions** | 7 critical control-to-control interactions. Conflict principle: Safety > Revenue > Speed |
| **Dependency Risk** | 6 SPOFs identified: PostgreSQL (critical), PM2 (high), single VPS (critical), hash daemon, blockchain, Risk Committee (human) |
| **Simplification** | 4 recommendations: 6 domain façades, ~10 route files, KS priority order, 12+7 role split |
| **Complexity Score** | 7.8/10. Minimum team: 15 (8 eng + 3 risk + 2 ops + 2 gov) |

**Engine**: `architecture-coherence-engine.js` | **Endpoints**: 6

### Operational Playbook (`/api/playbook`)

| Drill | Frequency | Duration | Category |
|---|---|---|---|
| 24h Total Blackout | Annual | 8h | Technical |
| 72h Settlement Halt | Semi-annual | 4h | Capital |
| Cross-Jurisdiction Request | Annual | 4h | Regulatory |
| Validator Cartel | Annual | 3h | Network |
| Insider Threat (Red Team) | Annual | 4h | Security |
| Revenue Crash -50% | Semi-annual | 2h | Economic |

**Schedule**: Q1 Tech+Security, Q2 Capital+Economic, Q3 Regulatory+Network, Q4 Integration review.

**Engine**: `operational-playbook-engine.js` | **Endpoints**: 6

### Human Governance Stress (`/api/human-gov`)

| Component | Chi tiết |
|---|---|
| **Insider Collusion** | 4 scenarios: Admin+DB (<60s detect), CTO+Blockchain (<24h), CFO+Treasury (dual-key prevents), Compliance+External (auto-block) |
| **GGC Capture** | 3 scenarios: majority (40% cap), proxy (25% limit), hostile amendment (unamendable articles: SEP, audit, independence, KS authority, reserve trust) |
| **Board–Management** | 4 conflict types: strategy (board prevails), risk (Risk Committee primacy), compensation (independent committee), information (board ≥ management access) |
| **Founder Roadmap** | 4 phases: Current (4 roles, CRITICAL) → Role Separation (2 roles) → Institutionalization (board oversight) → IPO-Ready (replaceable) |
| **Compensation+COI** | No self-dealing. Clawback 3yr. Recusal policy. COI register. Quarterly disclosure |

**Engine**: `human-governance-stress-engine.js` | **Endpoints**: 8

---

## 22. 🏦 Infrastructure-Grade Architecture

> **Commitment**: B + C + D Hybrid = Regulated Carbon Settlement Infrastructure.
>
> Comparable to: Nasdaq (exchange+clearing+data) / ICE (futures+clearing+carbon) / Moody’s (ratings+analytics)

### Incentive Architecture (`/api/incentive-arch`)

| Participant | Incentive Logic | Perverse Guard |
|---|---|---|
| Admin Company | Revenue share tied to network health score. $1M performance bond. GGC can replace 75%. | Volume inflation detection |
| SCM Data Provider | Trust premium → Platinum tier ($500K unsecured). 15% fee discount for quality >90%. | Statistical anomaly + honeypots |
| Blockchain Operator | 99.9% uptime → 20% reward bonus. Yield compounds +0.5%/quarter. | External monitoring, no self-report |
| IVU Validator | Accuracy bonus pool ($50K/quarter). Model improvement bounty ($5K-$25K). Independence premium 10%. | 3+ cross-validation. Canary scores |

**Fee Topology**: 5 revenue streams mapped → 7 allocation buckets (operating 45%, validators 20%, reserve 10%, infra 10%, insurance 5%, regulatory 5%, innovation 5%).

**Revenue Moat**: 5 layers. Switching cost: **$350K-$900K/tenant**. LTV:CAC target 8:1.

**Carbon Market Layer**: 5 registries + continuous orderbook + CCP clearing + 6-step default waterfall.

**Engine**: `incentive-architecture-engine.js` | **Endpoints**: 6

### Entity Structuring (`/api/entity`)

| Entity | Type | Jurisdiction | Comparable |
|---|---|---|---|
| Holdings Ltd | Holding company | Singapore | Nasdaq Inc |
| Technology Pte Ltd | Platform operator | Singapore | Nasdaq Market Technology |
| Settlement GmbH | CCP / clearing | Germany | ICE Clear / Nasdaq Clearing |
| Validation AG | Rating / validation | Switzerland | Moody’s Investors Service |
| Node Operations Ltd | Blockchain infra | Singapore | ICE Data Services |
| Data Compliance Ltd | Data controller | Ireland | GDPR entity |
| Capital Reserve Trust | Bankruptcy-remote | Singapore | Clearing house guarantee fund |

**Inter-Entity**: 6 contracts (IP license, tech services, methodology license, infra services, DPA, trust deed).

**External Trust**: Big 4 audit ($200K-$500K/yr) + 60% third-party validators + public API transparency portal + S&P/Moody’s rating target (BBB-) + regulatory observer program.

**Engine**: `entity-structuring-engine.js` | **Endpoints**: 5

### Cryptographic Governance (`/api/crypto-gov`)

| Component | Design |
|---|---|
| **HSM** | 3-tier: Primary (FIPS 140-2 L3) + Backup (<30s failover) + Cold (air-gapped, 3-of-5 Shamir) |
| **Multi-Sig** | Root ceremony 3/5, anchor 2/3, settlement dual-key, KS-01 2/3, reserve 3/3 unanimous |
| **Key Recovery** | 9-step protocol, 3-10 business days, platform READ-ONLY during recovery |
| **Rotation** | TLS monthly → operational quarterly → intermediate annual → root 5-year |
| **Zero-Trust** | Current L2, target L4. Gap: HSM impl + mTLS all services + micro-segmentation |

**Engine**: `cryptographic-governance-engine.js` | **Endpoints**: 10

---

## 23. 🛡️ Gap Closure — Final Coverage

> **Purpose**: Close the remaining 3/12 identified infrastructure gaps.

### Data Ownership & Portability (`/api/data-ownership`)

| Data Type | Owner | Portability | On Exit | Blockchain |
|---|---|---|---|---|
| Product/SCM | Tenant | FULL (JSON/CSV) | Delete 30d | Hash remains (orphaned) |
| Trust Score | Platform (IP) | LIMITED (history only) | Deactivated | Anchors remain |
| Carbon Credits | Registry → Tenant holds title | FULL (via registry) | Credits stay in registry | Anchors remain |
| PII | Data Subject | FULL (GDPR Art. 20) | Delete 30d | NO PII on chain |
| Audit Trail | Platform | READ-ONLY | Retained 7-10yr | Permanent |

**Exit Protocol**: 5 phases (Notice 14d → Settlement 30d → Export 7d → Deletion 30d → Post-exit). Total: 30-60 days.

**Engine**: `data-ownership-engine.js` | **Endpoints**: 4

### Infrastructure Metrics (`/api/infra-metrics`)

| Category | Key KPIs | Target |
|---|---|---|
| **Network** | Integrity Index >98%, Trust Density >0.65, Nakamoto ≥10, Validator Uptime >99.5% | 4 metrics |
| **Operational** | Dispute <0.5%, FP <3%, Settlement >99.8%, Carbon Audit >97%, Tamper <60s | 6 metrics |
| **Financial** | CAR >12%, LCR >100%, HHI <2500, Reserve >6mo, LTV:CAC >5:1 | 5 metrics |
| **Composite** | Weighted 30/30/25/15 → single board-ready score (≥90 Excellent) | 1 score |

**Engine**: `infrastructure-metrics-engine.js` | **Endpoints**: 6

### Upgrade Governance (`/api/upgrade-gov`)

| Change Class | Example | Approval | Rollback |
|---|---|---|---|
| **A — Constitutional** | Kill-switch threshold, separation rules | 75% GGC, 65 days | Reverse amendment |
| **B — Risk-Impacting** | Trust model weights, settlement params | Risk Committee + CTO | <1h prepared |
| **C — Structural** | Schema changes, API breaking | CTO + Eng Lead | <4h migration |
| **D — Operational** | Bug fixes, performance | Eng Lead | <15min CI/CD |

**CAB Process**: Weekly 30min → 7-step approval → change freeze periods → post-deployment review.

**Engine**: `upgrade-governance-engine.js` | **Endpoints**: 7

---

## Database Schema

| Category | Tables |
|---|---|
| Core | `users`, `organizations`, `products`, `qr_codes`, `scan_events` |
| SCM | `shipments`, `routes`, `scm_partners`, `inventory_*`, `logistics_*` |
| Compliance | `audit_log`, `compliance_reports`, `gdpr_*`, `certifications` |
| Billing | `billing_plans`, `invoices`, `webhook_events`, `transaction_fees` |
| RBAC | `rbac_roles`, `rbac_permissions`, `rbac_role_permissions`, `rbac_user_roles` |
| Carbon | `carbon_footprints`, `carbon_credits`, `carbon_registries` |
| Crisis | `crisis_events`, `kill_switch_logs` |
| Ops | `ops_incidents_v2`, `post_mortems` |
| Network | `validator_nodes`, `consensus_rounds` |
| Distribution | `fee_distributions`, `partner_revenues` |
| Other | `sessions`, `notifications`, `evidence_items`, `support_tickets`, `forensic_cases`, ... |
| **Total** | **61 tables** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Database | PostgreSQL 15 (Prisma v7 ORM) |
| Auth | JWT + RBAC (19 roles, 143 permissions) |
| Process Manager | PM2 |
| Hosting | VPS (tonytran.work) |
| Blockchain | On-chain sealing (NFT certificates) |
| AI | GPT-powered assistant, ML classification |
| Security | TLS 1.3, SHA-256 hash chain, encrypted PII |
