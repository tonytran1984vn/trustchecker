/**
 * SCM – Supplier Scoring (Enterprise Supplier Evaluation)
 * KYC + Trust + Delivery + Compliance + Financial scoring
 */
import { icon } from '../../core/icons.js';

const SUPPLIERS = [
  { id: 'SUP-001', name: 'Golden Beans Co.', country: 'Vietnam', type: 'Manufacturer', kyc: 'Verified', trust: 92, delivery: 96, quality: 94, compliance: 88, financial: 85, composite: 91, tier: 'Gold', contracts: 2, risk: 'Low', since: '2022' },
  { id: 'SUP-002', name: 'Ceylon Leaf Ltd', country: 'Sri Lanka', type: 'Manufacturer', kyc: 'Verified', trust: 88, delivery: 91, quality: 93, compliance: 90, financial: 82, composite: 89, tier: 'Gold', contracts: 1, risk: 'Low', since: '2023' },
  { id: 'SUP-003', name: 'NZ Manuka Inc', country: 'New Zealand', type: 'Producer', kyc: 'Verified', trust: 95, delivery: 89, quality: 98, compliance: 95, financial: 92, composite: 94, tier: 'Platinum', contracts: 1, risk: 'Low', since: '2024' },
  { id: 'SUP-004', name: 'Pacific Pack', country: 'Thailand', type: 'Packaging', kyc: 'Verified', trust: 78, delivery: 85, quality: 82, compliance: 75, financial: 80, composite: 80, tier: 'Silver', contracts: 1, risk: 'Medium', since: '2024' },
  { id: 'SUP-005', name: 'Mekong Logistics', country: 'Vietnam', type: '3PL', kyc: 'Pending', trust: 65, delivery: 72, quality: 70, compliance: 60, financial: 68, composite: 67, tier: 'Bronze', contracts: 0, risk: 'High', since: '2025' },
];

const SCORING_DIMENSIONS = [
  { dim: 'Trust Score', weight: '25%', factors: 'Transaction history, dispute rate, reference checks, years in partnership', source: 'TrustChecker platform data' },
  { dim: 'Delivery Performance', weight: '20%', factors: 'On-time rate, lead time variance, order accuracy, damage rate', source: 'PO + shipment records' },
  { dim: 'Quality Score', weight: '25%', factors: 'QC pass rate, defect rate, certification status, audit findings', source: 'QC inspections + audits' },
  { dim: 'Compliance Score', weight: '15%', factors: 'KYC status, regulatory compliance, ESG rating, sanction screening', source: 'Compliance module' },
  { dim: 'Financial Health', weight: '15%', factors: 'Credit rating, payment history, insurance coverage, D&B score', source: 'External + financial data' },
];

export function renderPage() {
  const types = ['Manufacturer', 'Producer', 'Packaging', '3PL', 'Distributor', 'Raw Material', 'Service Provider'];
  const countries = ['Vietnam', 'Sri Lanka', 'New Zealand', 'Thailand', 'China', 'India', 'Indonesia', 'Japan', 'South Korea', 'USA', 'Germany', 'Australia'];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} Supplier Scoring</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._showOnboardSupplier()">+ Onboard Supplier</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Suppliers', SUPPLIERS.length.toString(), `${SUPPLIERS.filter(s => s.tier === 'Gold' || s.tier === 'Platinum').length} Gold/Platinum`, 'green', 'users')}
        ${m('Avg Composite', Math.round(SUPPLIERS.reduce((s, su) => s + su.composite, 0) / SUPPLIERS.length).toString(), 'Weighted across 5 dimensions', 'blue', 'target')}
        ${m('KYC Pending', SUPPLIERS.filter(s => s.kyc === 'Pending').length.toString(), 'Requires verification', 'orange', 'shield')}
        ${m('High Risk', SUPPLIERS.filter(s => s.risk === 'High').length.toString(), 'Below threshold (< 70)', 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Supplier Performance Matrix</h3>
        <table class="sa-table"><thead><tr><th>Supplier</th><th>Country</th><th>Type</th><th>KYC</th><th>Trust</th><th>Delivery</th><th>Quality</th><th>Compliance</th><th>Financial</th><th>Composite</th><th>Tier</th><th>Risk</th></tr></thead><tbody>
          ${SUPPLIERS.map(s => {
    const tierColor = s.tier === 'Platinum' ? '#8b5cf6' : s.tier === 'Gold' ? '#f59e0b' : s.tier === 'Silver' ? '#94a3b8' : '#cd7f32';
    return `<tr class="${s.risk === 'High' ? 'ops-alert-row' : ''}">
              <td><strong>${s.name}</strong><div style="font-size:0.65rem;color:var(--text-secondary)">${s.id} · Since ${s.since}</div></td>
              <td>${s.country}</td><td style="font-size:0.78rem">${s.type}</td>
              <td><span class="sa-status-pill sa-pill-${s.kyc === 'Verified' ? 'green' : 'orange'}">${s.kyc}</span></td>
              ${[s.trust, s.delivery, s.quality, s.compliance, s.financial].map(v => `<td style="text-align:center;font-weight:600;color:${v >= 90 ? '#22c55e' : v >= 75 ? '#f59e0b' : '#ef4444'}">${v}</td>`).join('')}
              <td style="text-align:center;font-weight:800;font-size:1.1rem;color:${s.composite >= 90 ? '#22c55e' : s.composite >= 75 ? '#f59e0b' : '#ef4444'}">${s.composite}</td>
              <td><span style="font-weight:700;color:${tierColor}">⬤ ${s.tier}</span></td>
              <td><span class="sa-status-pill sa-pill-${s.risk === 'Low' ? 'green' : s.risk === 'Medium' ? 'orange' : 'red'}">${s.risk}</span></td>
            </tr>`;
  }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>📐 Scoring Methodology</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem">Composite Score = Σ(Dimension × Weight). Review cycle: quarterly. Auto-downgrade if composite falls below 70.</p>
        <table class="sa-table"><thead><tr><th>Dimension</th><th>Weight</th><th>Factors</th><th>Data Source</th></tr></thead><tbody>
          ${SCORING_DIMENSIONS.map(d => `<tr>
            <td><strong>${d.dim}</strong></td><td style="font-weight:700">${d.weight}</td>
            <td style="font-size:0.78rem">${d.factors}</td>
            <td style="font-size:0.78rem">${d.source}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>

    <!-- Onboard Supplier Modal -->
    <div id="onboard-modal" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center">
      <div style="background:var(--card-bg, #fff);border-radius:14px;padding:28px 24px;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border, #e2e8f0)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0;color:var(--text-primary, #1e293b);font-size:1.1rem">🏢 Onboard New Supplier</h3>
          <button onclick="window._closeOnboardSupplier()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted, #94a3b8);padding:4px 8px;border-radius:6px" title="Close">✕</button>
        </div>
        <div style="display:grid;gap:12px">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Company Name *</label>
            <input id="ob-name" placeholder="e.g. Acme Supplies Ltd" oninput="window._obNameChanged&&window._obNameChanged()" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Country *</label>
              <select id="ob-country" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="">— Select —</option>
                ${countries.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Supplier Type *</label>
              <select id="ob-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="">— Select —</option>
                ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Contact Email</label>
              <input id="ob-email" type="email" placeholder="contact@supplier.com" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Contact Phone</label>
              <input id="ob-phone" placeholder="+84 xxx xxx xxx" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Notes</label>
            <textarea id="ob-notes" rows="2" placeholder="Additional details..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button onclick="window._submitOnboardSupplier()" style="flex:1;padding:11px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Submit for KYC Review</button>
          <button onclick="window._closeOnboardSupplier()" style="flex:0.5;padding:11px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border, #e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.9rem">Cancel</button>
        </div>
      </div>
    </div>`;
}

window._showOnboardSupplier = () => { document.getElementById('onboard-modal').style.display = 'flex'; };
window._closeOnboardSupplier = () => { document.getElementById('onboard-modal').style.display = 'none'; };

// ─── Duplicate Detection v2 ────────────────────────────────────
const LEGAL_SUFFIXES = /\b(co\.?|company|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|plc\.?|gmbh|sa\.?|srl|pte\.?|pty\.?|group|holdings?)\b/gi;

function normalizeName(raw) {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(LEGAL_SUFFIXES, '')   // remove legal suffixes
    .replace(/[.\-_,&]/g, ' ')     // special chars → space
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
  return d[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function checkDuplicate(inputName) {
  const rawLower = inputName.toLowerCase().trim();
  const normalized = normalizeName(inputName);

  // 1. Exact raw match → hard block
  const exact = SUPPLIERS.find(s => s.name.toLowerCase().trim() === rawLower);
  if (exact) return { type: 'exact', supplier: exact };

  // 2. Normalized match → soft warning
  const normMatch = SUPPLIERS.find(s => normalizeName(s.name) === normalized);
  if (normMatch) return { type: 'normalized', supplier: normMatch };

  // 3. Fuzzy match (Levenshtein ≥ 0.8) → suggestion
  let bestScore = 0, bestSupplier = null;
  for (const s of SUPPLIERS) {
    const score = similarity(normalized, normalizeName(s.name));
    if (score > bestScore) { bestScore = score; bestSupplier = s; }
  }
  if (bestScore >= 0.8 && bestSupplier) return { type: 'fuzzy', supplier: bestSupplier, score: bestScore };

  return null;
}

// Track if user has confirmed a soft/fuzzy duplicate
let _dupConfirmed = false;

window._submitOnboardSupplier = () => {
  const name = document.getElementById('ob-name')?.value?.trim();
  const country = document.getElementById('ob-country')?.value;
  const type = document.getElementById('ob-type')?.value;

  if (!name) { showToast('Company name is required', 'warning'); return; }

  // Duplicate detection
  if (!_dupConfirmed) {
    const dup = checkDuplicate(name);
    if (dup) {
      if (dup.type === 'exact') {
        showToast(`⛔ "${dup.supplier.name}" already exists (${dup.supplier.id}, ${dup.supplier.tier} tier). Cannot create duplicate.`, 'error');
        return;
      }
      if (dup.type === 'normalized') {
        showToast(`⚠️ Possible duplicate: "${dup.supplier.name}" (${dup.supplier.id}, ${dup.supplier.tier} tier). Click Create again to confirm.`, 'warning');
        _dupConfirmed = true;
        return;
      }
      if (dup.type === 'fuzzy') {
        showToast(`💡 Similar supplier found: "${dup.supplier.name}" (${Math.round(dup.score * 100)}% match). Click Create again to confirm.`, 'info');
        _dupConfirmed = true;
        return;
      }
    }
  }

  if (!country) { showToast('Please select a country', 'warning'); return; }
  if (!type) { showToast('Please select supplier type', 'warning'); return; }
  _dupConfirmed = false;
  window._closeOnboardSupplier();
  showToast(`✅ "${name}" submitted for KYC review`, 'success');
};

// Reset confirm flag when name changes
window._obNameChanged = () => { _dupConfirmed = false; };

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
