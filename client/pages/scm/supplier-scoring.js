/**
 * SCM – Supplier Scoring (Enterprise Supplier Evaluation)
 * Architecture: 1 Supplier (Legal Entity) → N Locations (Operational Nodes)
 * Data loaded from DB via /ops/data/supplier-scoring API
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { State, render as globalRender } from '../../core/state.js';

// Org-level L3+ roles that can approve/reject KYC (NOT platform roles like super_admin)
const KYC_APPROVER_ROLES = ['org_owner', 'company_admin', 'executive', 'compliance_officer'];
function canApproveKYC() { return KYC_APPROVER_ROLES.includes(State.user?.active_role || State.user?.role); }

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
    globalRender();
  } catch (e) {
    console.warn('[supplier-scoring] API error:', e);
    _loading = false;
    globalRender();
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER — uses global SPA render() to re-render the entire page
// ═══════════════════════════════════════════════════════════════
let _initialized = false;

export function renderPage() {
  // Lazy init: load data on first render, not at import time
  if (!_initialized) { _initialized = true; loadSuppliers(); }
  if (_loading) return `<div class="sa-page"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem"><div class="sa-spinner" style="margin-bottom:16px"></div><div style="color:var(--text-secondary);font-size:0.85rem">Loading suppliers from database…</div></div></div>`;

  const verified = SUPPLIERS.filter(s => s.kyc === 'verified');
  const pending = SUPPLIERS.filter(s => s.kyc === 'pending_kyc' || s.kyc === 'pending');
  const totalLocs = SUPPLIERS.reduce((s, sup) => s + (sup.locations?.length || 0), 0);
  const highRisk = SUPPLIERS.filter(s => s.risk === 'High').length;
  const countriesCount = new Set(SUPPLIERS.flatMap(s => (s.locations || []).map(l => l.country))).size;

  return `
    <div class="sa-page">
      <div style="display:flex;justify-content:flex-end;margin-bottom:1.2rem">
        <button style="padding:7px 18px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='#0f766e'" onmouseout="this.style.background='#0d9488'" onclick="window._showOnboardSupplier()">+ Onboard Supplier</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${_statCard(icon('users',20),'Legal Entities',SUPPLIERS.length,verified.length+' verified','#0d9488')}
        ${_statCard(icon('globe',20),'Locations',totalLocs,countriesCount+' countries','#3b82f6')}
        ${_statCard(icon('shield',20),'Pending KYC',pending.length,'Awaiting verification','#f59e0b')}
        ${_statCard(icon('alertTriangle',20),'High Risk',highRisk,'Below threshold (< 70)',highRisk>0?'#ef4444':'#22c55e')}
      </div>

      ${pending.length > 0 ? `
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid rgba(245,158,11,0.15);border-left:4px solid #f59e0b;padding:20px 24px;margin-bottom:1.5rem">
        <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:700;color:#f59e0b;display:flex;align-items:center;gap:6px">⏳ Pending KYC Review (${pending.length})</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${pending.map(s => `
            <div style="padding:14px 16px;border-radius:10px;background:rgba(245,158,11,0.03);border:1px solid rgba(245,158,11,0.08);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;transition:all 0.15s"
              onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.04)'" onmouseout="this.style.boxShadow=''">
              <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:200px">
                <div style="width:38px;height:38px;border-radius:10px;background:rgba(245,158,11,0.08);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">🏢</div>
                <div>
                  <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary)">${s.name}</div>
                  <div style="font-size:0.72rem;color:var(--text-secondary)">${s.id} · ${s.type} · ${s.hqCountry}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
                <div style="text-align:center"><div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Contact</div><div style="font-size:0.72rem;color:var(--text-secondary)">${s.contact_email || s.contactEmail || '—'}</div></div>
                <div style="text-align:center"><div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Since</div><div style="font-size:0.72rem;color:var(--text-secondary)">${s.since}</div></div>
                ${canApproveKYC() ? `<div style="display:flex;gap:6px">
                  <button style="padding:5px 14px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.72rem;font-weight:600;cursor:pointer" onclick="window._approveSupplier('${s.id}','${s.name.replace(/'/g, "\\'")}')">✓ Approve</button>
                  <button style="padding:5px 14px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;background:transparent;color:var(--text-secondary);font-size:0.72rem;font-weight:600;cursor:pointer" onclick="window._rejectSupplier('${s.id}','${s.name.replace(/'/g, "\\'")}')">✗ Reject</button>
                </div>` : `<span style="font-size:0.68rem;padding:3px 10px;border-radius:12px;font-weight:600;background:rgba(245,158,11,0.08);color:#f59e0b">Awaiting review</span>`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px;margin-bottom:1.5rem">
        <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:700;display:flex;align-items:center;gap:6px">📊 Supplier Performance Matrix</h3>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
          <thead><tr>
            ${['Supplier','HQ','Locs','Type','KYC','Trust','Delivery','Quality','Compliance','Financial','Score','Tier','Risk'].map(h=>`<th style="padding:10px 10px;font-weight:600;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;white-space:nowrap">${h}</th>`).join('')}
          </tr></thead>
          <tbody>${verified.map(s => {
        const tierColor = s.tier === 'Platinum' ? '#8b5cf6' : s.tier === 'Gold' ? '#f59e0b' : s.tier === 'Silver' ? '#94a3b8' : '#cd7f32';
        const locList = (s.locations || []).map(l => l.country).join(', ') || s.hqCountry;
        const _td = 'padding:10px 10px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';
        return `<tr style="transition:background 0.15s${s.risk==='High'?';background:rgba(239,68,68,0.02)':''}" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background='${s.risk==='High'?'rgba(239,68,68,0.02)':''}'"><td style="${_td}"><span style="font-weight:600;color:var(--text-primary)">${s.name}</span><div style="font-size:0.62rem;color:var(--text-secondary)">${s.id}</div></td><td style="${_td}font-size:0.75rem">${s.hqCountry}</td><td style="${_td}font-size:0.72rem" title="${locList}">${(s.locations||[]).length}</td><td style="${_td}font-size:0.72rem">${s.type}</td><td style="${_td}"><span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${s.kyc==='verified'?'rgba(34,197,94,0.08)':'rgba(245,158,11,0.08)'};color:${s.kyc==='verified'?'#22c55e':'#f59e0b'}">${s.kyc}</span></td>${[s.trust,s.delivery,s.quality,s.compliance,s.financial].map(v=>{const c=v>=90?'#22c55e':v>=75?'#f59e0b':'#ef4444';return`<td style="${_td}text-align:center"><span style="font-weight:600;color:${c}">${Math.round(v)}</span></td>`;}).join('')}<td style="${_td}text-align:center"><span style="font-weight:800;font-size:1.05rem;color:${s.composite>=90?'#22c55e':s.composite>=75?'#f59e0b':'#ef4444'}">${Math.round(s.composite)}</span></td><td style="${_td}"><span style="font-weight:700;color:${tierColor}">⬤ ${s.tier}</span></td><td style="${_td}"><span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${s.risk==='Low'?'rgba(34,197,94,0.08)':s.risk==='Medium'?'rgba(245,158,11,0.08)':'rgba(239,68,68,0.08)'};color:${s.risk==='Low'?'#22c55e':s.risk==='Medium'?'#f59e0b':'#ef4444'}">${s.risk}</span></td></tr>`;
      }).join('')}</tbody></table></div>
      </div>

      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <h3 style="margin:0 0 8px;font-size:0.95rem;font-weight:700;display:flex;align-items:center;gap:6px">📐 Scoring Methodology</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin:0 0 14px">Composite Score = Σ(Dimension × Weight). Review cycle: quarterly. Auto-downgrade if composite falls below 70.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${SCORING_DIMENSIONS.map(d => `
            <div style="padding:14px 16px;border-radius:10px;background:rgba(13,148,136,0.03);border:1px solid rgba(13,148,136,0.06);transition:transform 0.15s"
              onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-weight:700;font-size:0.82rem;color:var(--text-primary)">${d.dim}</span>
                <span style="font-size:0.72rem;font-weight:700;padding:2px 10px;border-radius:12px;background:rgba(13,148,136,0.08);color:#0d9488">${d.weight}</span>
              </div>
              <div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:4px">${d.factors}</div>
              <div style="font-size:0.65rem;color:var(--text-secondary);opacity:0.7">📊 ${d.source}</div>
            </div>
          `).join('')}
        </div>
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
          <button onclick="window._submitOnboardSupplier()" style="flex:1;padding:11px;background:#0d9488;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='#0f766e'" onmouseout="this.style.background='#0d9488'">Submit for KYC Review</button>
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
          <button onclick="window._addLocationToExisting('${s.id}')" style="padding:7px 14px;background:#0d9488;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600">+ Add New Location</button>
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

window._rejectSupplier = (id, name) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = '_reject_supplier_modal';
  modal.innerHTML = `<div class="modal-card" style="max-width:380px;padding:1.5rem;border-radius:12px;background:var(--bg-primary,#fff);box-shadow:0 20px 60px rgba(0,0,0,0.3)">
    <h3 style="margin:0 0 0.5rem;color:var(--accent-red,#ef4444)">🚫 Reject Supplier</h3>
    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Reject "<strong>${name}</strong>"? This action cannot be undone.</p>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end">
      <button onclick="document.getElementById('_reject_supplier_modal')?.remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;color:var(--text-primary)">Cancel</button>
      <button onclick="window._doRejectSupplier('${id}','${name.replace(/'/g, "\\\\'")}')" style="padding:8px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-weight:600">Reject</button>
    </div>
  </div>`;
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
};

window._doRejectSupplier = async (id, name) => {
  document.getElementById('_reject_supplier_modal')?.remove();
  try {
    await API.patch(`/ops/data/suppliers/${id}/reject`);
    showToast(`🚫 "${name}" KYC rejected`, 'info');
    loadSuppliers();
  } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
};

function _statCard(iconHtml, label, value, sub, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:18px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:transform 0.15s"
    onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="width:36px;height:36px;border-radius:10px;background:${color}12;display:flex;align-items:center;justify-content:center;color:${color}">${iconHtml}</div>
      <span style="font-size:0.6rem;padding:3px 8px;border-radius:12px;background:${color}08;color:${color};font-weight:600">${sub}</span>
    </div>
    <div style="font-size:1.5rem;font-weight:800;color:${color};line-height:1">${value}</div>
    <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600;margin-top:4px">${label}</div>
  </div>`;
}

// No auto-load at import — lazy init via renderPage()
