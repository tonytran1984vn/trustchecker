/**
 * TrustChecker – Pricing Plans & Packages (Super Admin)
 * 4-Tier SaaS Model: Starter → Growth → Business → Enterprise
 * + Add-on Modules + Professional Services
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { icon } from '../core/icons.js';

const PLANS = [
  {
    id: 'starter', label: 'Starter', icon: '🚀', color: '#06b6d4', gradient: 'linear-gradient(135deg,#06b6d4,#22d3ee)',
    price: { monthly: { from: 49, to: 99 }, annual_discount: '15%' },
    scans: '10,000', overage: '$0.015/scan',
    target: 'Doanh nghiệp nhỏ, thử nghiệm',
    features: ['1 brand / 10 SKUs', '10K scans/tháng', 'Basic dashboard', 'Email alerts', '1 user'],
  },
  {
    id: 'growth', label: 'Growth', icon: '⚡', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    price: { monthly: { from: 199, to: 399 }, annual_discount: '15%' },
    scans: '50,000', overage: '$0.012/scan',
    target: 'Trung bình, đang mở rộng',
    features: ['5 brands / 100 SKUs', '50K scans/tháng', 'Risk scoring engine', 'API access', '5 users', 'Custom reports'],
    popular: true,
  },
  {
    id: 'business', label: 'Business', icon: '🏢', color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    price: { monthly: { from: 499, to: 999 }, annual_discount: '20%' },
    scans: '200,000', overage: '$0.008/scan',
    target: 'Doanh nghiệp vừa, nhiều SKU',
    features: ['Unlimited brands / 1K SKUs', '200K scans/tháng', 'Advanced risk engine', 'Multi-region support', '20 users', 'Priority support', 'Webhook integrations'],
  },
  {
    id: 'enterprise', label: 'Enterprise', icon: '👑', color: '#ef4444', gradient: 'linear-gradient(135deg,#dc2626,#f97316)',
    price: { monthly: { from: 3000, to: 15000 }, annual_discount: '20–40%', custom: true },
    scans: '1M–10M+', overage: '$0.003–0.006/scan',
    target: 'Tập đoàn lớn, dược phẩm, rượu vang, luxury, FMCG',
    features: ['Unlimited everything', 'Dedicated instance', 'SSO / SAML', 'Custom SLA (99.9%+)', 'Unlimited users', '24/7 dedicated CSM', 'On-premise option', 'Custom integration'],
  },
];

const ADDONS = [
  { id: 'carbon', name: 'Carbon Tracking & Credit Registry', icon: '🌱', price: '+$0.50/credit hoặc gói riêng', desc: 'ESG compliance, carbon footprint tracking, credit marketplace integration', color: '#22c55e' },
  { id: 'ai_forensic', name: 'Advanced Risk Engine + AI Forensic', icon: '🧠', price: '+20–30% subscription', desc: 'Deep learning fraud detection, pattern recognition, predictive analytics', color: '#8b5cf6' },
  { id: 'nft', name: 'NFT Certificate / Blockchain Seal', icon: '⛓️', price: '+$1.50/NFT (volume discount)', desc: 'Digital product passport, on-chain verification, tamper-proof certificates', color: '#6366f1' },
  { id: 'support', name: 'Dedicated Support + On-site Training', icon: '🎧', price: '$2,000–$5,000/tháng', desc: 'Dedicated CSM, on-site training, quarterly business reviews', color: '#f59e0b' },
];

const PRO_SERVICES = [
  { name: 'Implementation Package', price: '$15K–$30K', duration: '4–8 tuần', desc: 'Setup, configuration, data migration, user training' },
  { name: 'SAP/ERP Integration', price: '$25K–$50K', duration: '6–12 tuần', desc: 'Custom connector, bi-directional sync, middleware setup' },
  { name: 'Enterprise Onboarding', price: '$10K–$20K', duration: '2–4 tuần', desc: 'SSO setup, security audit, compliance mapping, role configuration' },
  { name: 'Custom Development', price: '$80K+', duration: '12–24 tuần', desc: 'Bespoke features, white-label, API custom endpoints, advanced analytics' },
];

const MAC_TIERS = [
  { commitment: '$50K/năm', discount: '20%', effective: '~$3,300/tháng', sla: '99.5%' },
  { commitment: '$100K/năm', discount: '30%', effective: '~$5,800/tháng', sla: '99.9%' },
  { commitment: '$200K/năm', discount: '40%', effective: '~$10,000/tháng', sla: '99.95% + Dedicated' },
];

export function renderPage() {
  return `
    <style>
      .pp{font-family:var(--font-primary);max-width:1200px;margin:0 auto}
      .pp-head{margin-bottom:24px}
      .pp-h1{font-size:1.3rem;font-weight:800;display:flex;align-items:center;gap:8px}
      .pp-sub{font-size:0.72rem;color:var(--text-muted);margin-top:4px}

      .pp-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
      .pp-plan{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:0;overflow:hidden;position:relative;transition:transform 0.2s,box-shadow 0.2s}
      .pp-plan:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.12)}
      .pp-plan.popular{border:2px solid #8b5cf6;box-shadow:0 0 0 1px rgba(139,92,246,0.2)}
      .pp-badge{position:absolute;top:-1px;right:20px;background:#8b5cf6;color:#fff;font-size:0.6rem;font-weight:800;padding:4px 12px;border-radius:0 0 8px 8px;letter-spacing:0.5px}
      .pp-plan-top{padding:20px 18px 16px;text-align:center}
      .pp-plan-icon{font-size:2rem;margin-bottom:6px}
      .pp-plan-name{font-size:1rem;font-weight:800;margin-bottom:2px}
      .pp-plan-target{font-size:0.68rem;color:var(--text-muted)}
      .pp-plan-price{padding:14px 18px;text-align:center;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
      .pp-price-range{font-size:1.4rem;font-weight:900}
      .pp-price-unit{font-size:0.68rem;color:var(--text-muted)}
      .pp-price-annual{font-size:0.65rem;color:var(--text-muted);margin-top:4px}
      .pp-plan-body{padding:14px 18px}
      .pp-scan-row{display:flex;justify-content:space-between;padding:6px 0;font-size:0.75rem;border-bottom:1px solid rgba(148,163,184,0.08)}
      .pp-scan-row:last-child{border:none}
      .pp-feat{padding:12px 0;border-top:1px solid var(--border)}
      .pp-feat li{font-size:0.72rem;color:var(--text-secondary);padding:3px 0;list-style:none;display:flex;align-items:center;gap:6px}
      .pp-feat li::before{content:'✓';color:#10b981;font-weight:700;font-size:0.68rem}

      .pp-section{margin-bottom:24px}
      .pp-section-title{font-size:0.95rem;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:8px}

      .pp-addons{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
      .pp-addon{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;gap:14px;align-items:flex-start;transition:transform 0.15s}
      .pp-addon:hover{transform:translateY(-2px)}
      .pp-addon-icon{font-size:1.6rem;flex-shrink:0}
      .pp-addon-name{font-size:0.85rem;font-weight:700;margin-bottom:2px}
      .pp-addon-price{font-size:0.72rem;font-weight:700;margin-bottom:4px}
      .pp-addon-desc{font-size:0.68rem;color:var(--text-muted);line-height:1.4}

      .pp-services{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
      .pp-svc{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center;transition:transform 0.15s}
      .pp-svc:hover{transform:translateY(-2px)}
      .pp-svc-name{font-size:0.82rem;font-weight:700;margin-bottom:8px}
      .pp-svc-price{font-size:1.1rem;font-weight:900;color:#10b981;margin-bottom:4px;font-family:'JetBrains Mono',monospace}
      .pp-svc-dur{font-size:0.68rem;color:var(--text-muted);margin-bottom:6px}
      .pp-svc-desc{font-size:0.68rem;color:var(--text-secondary);line-height:1.4}

      .pp-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:12px}
      .pp-mac-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center;position:relative;transition:transform 0.15s}
      .pp-mac-card:hover{transform:translateY(-2px)}
      .pp-mac-commit{font-size:1.1rem;font-weight:900;color:#3b82f6}
      .pp-mac-disc{font-size:1.4rem;font-weight:900;color:#10b981;margin:8px 0}
      .pp-mac-eff{font-size:0.72rem;color:var(--text-muted)}
      .pp-mac-sla{font-size:0.68rem;margin-top:6px;padding:3px 10px;background:rgba(59,130,246,0.1);border-radius:8px;display:inline-block;color:#3b82f6;font-weight:600}

      @media(max-width:900px){.pp-plans{grid-template-columns:1fr 1fr}.pp-services{grid-template-columns:1fr 1fr}.pp-mac{grid-template-columns:1fr}}
    </style>

    <div class="pp">
      <div class="pp-head">
        <div class="pp-h1">${icon('tag', 22)} Pricing Plans & Packages</div>
        <div class="pp-sub">SaaS usage-based pricing · 4 tiers · Add-on modules · Professional services</div>
      </div>

      <!-- ═══ PLAN CARDS ═══ -->
      <div class="pp-plans">
        ${PLANS.map(p => `
          <div class="pp-plan${p.popular ? ' popular' : ''}">
            ${p.popular ? '<div class="pp-badge">MOST POPULAR</div>' : ''}
            <div class="pp-plan-top">
              <div class="pp-plan-icon">${p.icon}</div>
              <div class="pp-plan-name">${p.label}</div>
              <div class="pp-plan-target">${p.target}</div>
            </div>
            <div class="pp-plan-price" style="background:${p.gradient};background-clip:text;-webkit-background-clip:text">
              ${p.price.custom
      ? `<div class="pp-price-range" style="color:${p.color}">Custom</div>
                   <div class="pp-price-unit">từ $${p.price.monthly.from.toLocaleString()}–$${p.price.monthly.to.toLocaleString()}+/tháng</div>`
      : `<div class="pp-price-range" style="color:${p.color}">$${p.price.monthly.from}–$${p.price.monthly.to}</div>
                   <div class="pp-price-unit">/tháng</div>`
    }
              <div class="pp-price-annual">Annual billing giảm ${p.price.annual_discount}</div>
            </div>
            <div class="pp-plan-body">
              <div class="pp-scan-row"><span style="color:var(--text-muted)">Included Scans</span><strong>${p.scans}</strong></div>
              <div class="pp-scan-row"><span style="color:var(--text-muted)">Overage</span><strong style="color:${p.color}">${p.overage}</strong></div>
              <ul class="pp-feat">
                ${p.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- ═══ ENTERPRISE ADD-ONS ═══ -->
      <div class="pp-section">
        <div class="pp-section-title">🧩 Enterprise Add-on Modules <span style="font-size:0.68rem;font-weight:400;color:var(--text-muted);margin-left:8px">Bán riêng, upsell cho Business & Enterprise</span></div>
        <div class="pp-addons">
          ${ADDONS.map(a => `
            <div class="pp-addon" style="border-left:4px solid ${a.color}">
              <div class="pp-addon-icon">${a.icon}</div>
              <div>
                <div class="pp-addon-name">${a.name}</div>
                <div class="pp-addon-price" style="color:${a.color}">${a.price}</div>
                <div class="pp-addon-desc">${a.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ MAC (Minimum Annual Commitment) ═══ -->
      <div class="pp-section">
        <div class="pp-section-title">📋 Minimum Annual Commitment (MAC) — Enterprise Only</div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin:-8px 0 12px">Cam kết hàng năm → discount lớn + SLA cao hơn. Auto-renewal 12 tháng, exit clause 90 ngày.</div>
        <div class="pp-mac">
          ${MAC_TIERS.map(m => `
            <div class="pp-mac-card">
              <div class="pp-mac-commit">${m.commitment}</div>
              <div class="pp-mac-disc">-${m.discount}</div>
              <div class="pp-mac-eff">Effective: ${m.effective}</div>
              <div class="pp-mac-sla">SLA ${m.sla}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ PROFESSIONAL SERVICES ═══ -->
      <div class="pp-section">
        <div class="pp-section-title">🛠️ Professional Services <span style="font-size:0.68rem;font-weight:400;color:var(--text-muted);margin-left:8px">One-time implementation & integration</span></div>
        <div class="pp-services">
          ${PRO_SERVICES.map(s => `
            <div class="pp-svc">
              <div class="pp-svc-name">${s.name}</div>
              <div class="pp-svc-price">${s.price}</div>
              <div class="pp-svc-dur">⏱ ${s.duration}</div>
              <div class="pp-svc-desc">${s.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ Public Scan Note ═══ -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;align-items:center;gap:14px;border-left:4px solid #3b82f6">
        <span style="font-size:2rem">📱</span>
        <div>
          <div style="font-size:0.85rem;font-weight:700">Public / Consumer Scan</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Miễn phí cho end-user — tăng nhận diện thương hiệu, drive data cho brands. Mỗi consumer scan = marketing channel + data asset cho tenant.</div>
        </div>
      </div>
    </div>`;
}
