/**
 * SCM – Supplier Scoring (Enterprise Supplier Evaluation)
 * Architecture: 1 Supplier (Legal Entity) → N Locations (Operational Nodes)
 * Data loaded from DB via /ops/data/supplier-scoring API
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

// ═══════════════════════════════════════════════════════════════
// STATE — loaded from DB
// ═══════════════════════════════════════════════════════════════
let SUPPLIERS = [];
let _loading = true;

const SCORING_DIMENSIONS = [
  { dim: 'Trust Score', weight: '25%', factors: 'Transaction history, dispute rate, reference checks, years in partnership', source: 'TrustChecker platform data' },
  { dim: 'Delivery Performance', weight: '20%', factors: 'On-time rate, lead time variance, order accuracy, damage rate', source: 'PO + shipment records' },
  { dim: 'Quality Score', weight: '25%', factors: 'QC pass rate, defect rate, certification status, audit findings', source: 'QC inspections + audits' },
  { dim: 'Compliance Score', weight: '15%', factors: 'KYC status, regulatory compliance, ESG rating, sanction screening', source: 'Compliance module' },
  { dim: 'Financial Health', weight: '15%', factors: 'Credit rating, payment history, insurance coverage, D&B score', source: 'External + financial data' },
];

const SUPPLIER_TYPES = ['Manufacturer', 'Producer', 'Packaging', '3PL', 'Distributor', 'Raw Material', 'Service Provider'];
const COUNTRIES = ['Vietnam', 'Sri Lanka', 'New Zealand', 'Thailand', 'China', 'India', 'Indonesia', 'Japan', 'South Korea', 'USA', 'Germany', 'Australia', 'Cambodia', 'Singapore', 'Malaysia', 'Philippines'];

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════
async function loadSuppliers() {
  try {
    const res = await API.get('/ops/data/supplier-scoring');
    SUPPLIERS = (res.suppliers || []).map(s => ({
      ...s,
      // Normalize field names from DB (snake_case → display)
      hqCountry: s.country || '',
      trust: s.trust_score ?? s.trustScore ?? 50,
      delivery: s.delivery_score ?? s.deliveryScore ?? 50,
      quality: s.quality_score ?? s.qualityScore ?? 50,
      compliance: s.compliance_score ?? s.complianceScore ?? 50,
      financial: s.financial_score ?? s.financialScore ?? 50,
      composite: s.composite_score ?? s.compositeScore ?? 50,
      tier: s.tier || 'Bronze',
      risk: s.risk_level ?? s.riskLevel ?? 'medium',
      kyc: s.kyc_status ?? s.kycStatus ?? 'pending',
      since: s.created_at ? new Date(s.created_at).getFullYear().toString() : '2025',
      locations: s.locations || [],
    }));
    _loading = false;
    render();
  } catch (e) {
    console.warn('[supplier-scoring] API error:', e);
    _loading = false;
    render();
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function render() {
  const el = document.getElementById('ws-tab-content') || document.querySelector('.ws-tab-content');
  if (!el) return;
  el.innerHTML = renderPage();
}

export function renderPage() {
  if (_loading) return `<div class="sa-page"><div class="sa-loading-indicator"><div class="sa-spinner"></div><p>Loading suppliers from database...</p></div></div>`;

  const verified = SUPPLIERS.filter(s => s.kyc === 'verified');
  const pending = SUPPLIERS.filter(s => s.kyc === 'pending_kyc' || s.kyc === 'pending');
  const totalLocs = SUPPLIERS.reduce((s, sup) => s + (sup.locations?.length || 0), 0);

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} Supplier Scoring</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._showOnboardSupplier()">+ Onboard Supplier</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Legal Entities', SUPPLIERS.length.toString(), `${verified.length} verified`, 'green', 'users')}
        ${m('Locations', totalLocs.toString(), `Across ${new Set(SUPPLIERS.flatMap(s => (s.locations || []).map(l => l.country))).size} countries`, 'blue', 'globe')}
        ${m('Pending KYC', pending.length.toString(), 'Awaiting verification', 'orange', 'shield')}
        ${m('High Risk', SUPPLIERS.filter(s => s.risk === 'High').length.toString(), 'Below threshold (< 70)', 'red', 'alertTriangle')}
      </div>

      ${pending.length > 0 ? `
      <div class="sa-card" style="margin-bottom:1.5rem;border:1px solid #f59e0b40">
        <h3 style="color:#f59e0b">⏳ Pending KYC Review (${pending.length})</h3>
        <table class="sa-table"><thead><tr><th>Supplier</th><th>Type</th><th>Country</th><th>Contact</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>
          ${pending.map(s => `<tr>
            <td><strong>${s.name}</strong><div style="font-size:0.65rem;color:var(--text-secondary)">${s.id}</div></td>
            <td style="font-size:0.78rem">${s.type}</td>
            <td>${s.hqCountry}</td>
            <td style="font-size:0.75rem">${s.contact_email || s.contactEmail || '—'}</td>
            <td style="font-size:0.75rem">${s.since}</td>
            <td>
              <button class="btn btn-xs btn-primary" onclick="window._approveSupplier('${s.id}','${s.name.replace(/'/g, "\\'")}')">✓ Approve</button>
              <button class="btn btn-xs btn-ghost" onclick="window._rejectSupplier('${s.id}','${s.name.replace(/'/g, "\\'")}')">✗ Reject</button>
            </td>
          </tr>`).join('')}
        </tbody></table>
      </div>` : ''}

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Supplier Performance Matrix</h3>
        <table class="sa-table"><thead><tr><th>Supplier</th><th>HQ</th><th>Locations</th><th>Type</th><th>KYC</th><th>Trust</th><th>Delivery</th><th>Quality</th><th>Compliance</th><th>Financial</th><th>Composite</th><th>Tier</th><th>Risk</th></tr></thead><tbody>
          ${verified.map(s => {
    const tierColor = s.tier === 'Platinum' ? '#8b5cf6' : s.tier === 'Gold' ? '#f59e0b' : s.tier === 'Silver' ? '#94a3b8' : '#cd7f32';
    const locList = (s.locations || []).map(l => l.country).join(', ') || s.hqCountry;
    return `<tr class="${s.risk === 'High' ? 'ops-alert-row' : ''}">
              <td><strong>${s.name}</strong><div style="font-size:0.65rem;color:var(--text-secondary)">${s.id} · Since ${s.since}</div></td>
              <td>${s.hqCountry}</td>
              <td style="font-size:0.72rem" title="${locList}">${(s.locations || []).length} <span style="color:var(--text-muted)">(${locList})</span></td>
              <td style="font-size:0.78rem">${s.type}</td>
              <td><span class="sa-status-pill sa-pill-${s.kyc === 'verified' ? 'green' : 'orange'}">${s.kyc}</span></td>
              ${[s.trust, s.delivery, s.quality, s.compliance, s.financial].map(v => `<td style="text-align:center;font-weight:600;color:${v >= 90 ? '#22c55e' : v >= 75 ? '#f59e0b' : '#ef4444'}">${Math.round(v)}</td>`).join('')}
              <td style="text-align:center;font-weight:800;font-size:1.1rem;color:${s.composite >= 90 ? '#22c55e' : s.composite >= 75 ? '#f59e0b' : '#ef4444'}">${Math.round(s.composite)}</td>
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
      <div style="background:var(--card-bg, #fff);border-radius:14px;padding:28px 24px;width:540px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border, #e2e8f0)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0;color:var(--text-primary, #1e293b);font-size:1.1rem">🏢 Onboard New Supplier</h3>
          <button onclick="window._closeOnboardSupplier()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted, #94a3b8);padding:4px 8px;border-radius:6px" title="Close">✕</button>
        </div>
        <div id="ob-match-banner" style="display:none;margin-bottom:16px;padding:14px 16px;border-radius:10px;border:1px solid #f59e0b40;background:#fef3c740"></div>
        <div style="display:grid;gap:12px">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Legal Entity Name *</label>
            <input id="ob-name" placeholder="e.g. Acme Supplies Ltd" oninput="window._obCheckLive()" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">HQ Country *</label>
              <select id="ob-country" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="">— Select —</option>
                ${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Supplier Type *</label>
              <select id="ob-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="">— Select —</option>
                ${SUPPLIER_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
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
            <textarea id="ob-notes" rows="2" placeholder="Tax ID, registration number, additional details..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button onclick="window._submitOnboardSupplier()" style="flex:1;padding:11px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Submit for KYC Review</button>
          <button onclick="window._closeOnboardSupplier()" style="flex:0.5;padding:11px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border, #e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.9rem">Cancel</button>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE DETECTION (Client-side, uses loaded SUPPLIERS data)
// ═══════════════════════════════════════════════════════════════
const LEGAL_SUFFIXES = /\b(co\.?|company|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|plc\.?|gmbh|sa\.?|srl|pte\.?|pty\.?|group|holdings?)\b/gi;

function normalizeName(raw) {
  return (raw || '').toLowerCase().trim()
    .replace(LEGAL_SUFFIXES, '').replace(/[.\-_,&]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
  return d[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - levenshtein(a, b) / maxLen : 1;
}

function checkEntityMatch(inputName) {
  const rawLower = inputName.toLowerCase().trim();
  const normalized = normalizeName(inputName);
  if (!normalized) return null;

  const exact = SUPPLIERS.find(s => s.name.toLowerCase().trim() === rawLower);
  if (exact) return { type: 'exact', supplier: exact };

  const entityMatch = SUPPLIERS.find(s => normalizeName(s.name) === normalized);
  if (entityMatch) return { type: 'entity', supplier: entityMatch };

  let best = { score: 0, supplier: null };
  for (const s of SUPPLIERS) {
    const score = similarity(normalized, normalizeName(s.name));
    if (score > best.score) best = { score, supplier: s };
  }
  if (best.score >= 0.8 && best.supplier) return { type: 'fuzzy', supplier: best.supplier, score: best.score };

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MODAL HANDLERS
// ═══════════════════════════════════════════════════════════════
let _entityConfirmed = false;

window._showOnboardSupplier = () => {
  _entityConfirmed = false;
  document.getElementById('onboard-modal').style.display = 'flex';
  const banner = document.getElementById('ob-match-banner');
  if (banner) banner.style.display = 'none';
};

window._closeOnboardSupplier = () => {
  _entityConfirmed = false;
  document.getElementById('onboard-modal').style.display = 'none';
};

// Live duplicate check
let _checkTimer = null;
window._obCheckLive = () => {
  _entityConfirmed = false;
  clearTimeout(_checkTimer);
  _checkTimer = setTimeout(() => {
    const name = document.getElementById('ob-name')?.value?.trim();
    const banner = document.getElementById('ob-match-banner');
    if (!banner) return;
    if (!name || name.length < 3) { banner.style.display = 'none'; return; }

    const match = checkEntityMatch(name);
    if (!match) { banner.style.display = 'none'; return; }

    const s = match.supplier;
    const locs = (s.locations || []).map(l => l.country).join(', ') || s.hqCountry;

    if (match.type === 'exact') {
      banner.style.display = 'block';
      banner.style.borderColor = '#ef444440'; banner.style.background = '#fef2f240';
      banner.innerHTML = `<div style="font-weight:700;color:#ef4444;margin-bottom:6px">⛔ Exact match found</div>
        <div style="font-size:0.85rem;color:var(--text-primary)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">📍 Locations: ${locs}</div>`;
    } else if (match.type === 'entity') {
      banner.style.display = 'block';
      banner.style.borderColor = '#f59e0b40'; banner.style.background = '#fef3c740';
      banner.innerHTML = `<div style="font-weight:700;color:#f59e0b;margin-bottom:6px">⚠️ Possible duplicate entity</div>
        <div style="font-size:0.85rem;color:var(--text-primary)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">📍 Locations: ${locs}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="window._addLocationToExisting('${s.id}')" style="padding:7px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600">+ Add New Location</button>
          <button onclick="window._confirmNewEntity()" style="padding:7px 14px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary);border:1px solid var(--border,#e2e8f0);border-radius:6px;cursor:pointer;font-size:0.8rem">Different Legal Entity</button>
        </div>`;
    } else if (match.type === 'fuzzy') {
      banner.style.display = 'block';
      banner.style.borderColor = '#3b82f640'; banner.style.background = '#eff6ff40';
      banner.innerHTML = `<div style="font-weight:700;color:#3b82f6;margin-bottom:6px">💡 Similar supplier found (${Math.round(match.score * 100)}% match)</div>
        <div style="font-size:0.85rem;color:var(--text-primary)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">📍 Locations: ${locs}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="window._confirmNewEntity()" style="padding:7px 14px;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.8rem">This is a different supplier</button>
        </div>`;
    }
  }, 300);
};

window._addLocationToExisting = async (supplierId) => {
  const country = document.getElementById('ob-country')?.value;
  if (!country) { showToast('Please select a country first', 'warning'); return; }
  try {
    const res = await API.post(`/ops/data/suppliers/${supplierId}/locations`, { country, address: '' });
    window._closeOnboardSupplier();
    showToast(`✅ ${res.message || 'Location added'}`, 'success');
    loadSuppliers();
  } catch (e) {
    showToast(`❌ ${e.message || 'Failed to add location'}`, 'error');
  }
};

window._confirmNewEntity = () => {
  _entityConfirmed = true;
  const banner = document.getElementById('ob-match-banner');
  if (banner) {
    banner.style.display = 'block';
    banner.style.borderColor = '#22c55e40'; banner.style.background = '#f0fdf440';
    banner.innerHTML = `<div style="font-weight:600;color:#22c55e;font-size:0.85rem">✅ Confirmed: Creating as a separate legal entity</div>`;
  }
};

window._submitOnboardSupplier = async () => {
  const name = document.getElementById('ob-name')?.value?.trim();
  const country = document.getElementById('ob-country')?.value;
  const type = document.getElementById('ob-type')?.value;
  const contactEmail = document.getElementById('ob-email')?.value?.trim() || '';
  const contactPhone = document.getElementById('ob-phone')?.value?.trim() || '';
  const notes = document.getElementById('ob-notes')?.value?.trim() || '';

  if (!name) { showToast('Legal entity name is required', 'warning'); return; }

  if (!_entityConfirmed) {
    const match = checkEntityMatch(name);
    if (match && match.type === 'exact') {
      showToast(`⛔ "${match.supplier.name}" already exists. Use "Add New Location" instead.`, 'error');
      return;
    }
    if (match && (match.type === 'entity' || match.type === 'fuzzy')) {
      showToast('⚠️ Similar entity detected. Please use the buttons above to confirm.', 'warning');
      return;
    }
  }

  if (!country) { showToast('Please select HQ country', 'warning'); return; }
  if (!type) { showToast('Please select supplier type', 'warning'); return; }

  try {
    const res = await API.post('/ops/data/suppliers/onboard', { name, type, country, contactEmail, contactPhone, notes });
    _entityConfirmed = false;
    window._closeOnboardSupplier();
    showToast(`✅ ${res.message || 'Supplier submitted for KYC review'}`, 'success');
    loadSuppliers(); // Reload from DB
  } catch (e) {
    if (e.message?.includes('duplicate')) {
      showToast(`⛔ ${e.message}`, 'error');
    } else {
      showToast(`❌ ${e.message || 'Failed to create supplier'}`, 'error');
    }
  }
};

// KYC Actions
window._approveSupplier = async (id, name) => {
  try {
    await API.patch(`/ops/data/suppliers/${id}/approve`);
    showToast(`✅ "${name}" KYC approved`, 'success');
    loadSuppliers();
  } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
};

window._rejectSupplier = async (id, name) => {
  if (!confirm(`Reject "${name}"? This cannot be undone.`)) return;
  try {
    await API.patch(`/ops/data/suppliers/${id}/reject`);
    showToast(`🚫 "${name}" KYC rejected`, 'info');
    loadSuppliers();
  } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
};

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

// Auto-load on page render
loadSuppliers();
