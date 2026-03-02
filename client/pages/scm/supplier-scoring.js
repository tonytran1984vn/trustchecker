/**
 * SCM – Supplier Scoring (Enterprise Supplier Evaluation)
 * Architecture: 1 Supplier (Legal Entity) → N Locations (Operational Nodes)
 * KYC + Trust + Delivery + Compliance + Financial scoring
 */
import { icon } from '../../core/icons.js';

// ═══════════════════════════════════════════════════════════════
// DATA MODEL: Supplier (Legal Entity) → Locations[]
// ═══════════════════════════════════════════════════════════════
const SUPPLIERS = [
  {
    id: 'SUP-001', name: 'Golden Beans Co.', hqCountry: 'Vietnam', type: 'Manufacturer',
    kyc: 'Verified', trust: 92, delivery: 96, quality: 94, compliance: 88, financial: 85,
    composite: 91, tier: 'Gold', contracts: 2, risk: 'Low', since: '2022',
    locations: [
      { locId: 'LOC-001', country: 'Vietnam', address: 'Ho Chi Minh City', status: 'active' },
      { locId: 'LOC-002', country: 'Thailand', address: 'Bangkok', status: 'active' },
    ]
  },
  {
    id: 'SUP-002', name: 'Ceylon Leaf Ltd', hqCountry: 'Sri Lanka', type: 'Manufacturer',
    kyc: 'Verified', trust: 88, delivery: 91, quality: 93, compliance: 90, financial: 82,
    composite: 89, tier: 'Gold', contracts: 1, risk: 'Low', since: '2023',
    locations: [
      { locId: 'LOC-003', country: 'Sri Lanka', address: 'Colombo', status: 'active' },
    ]
  },
  {
    id: 'SUP-003', name: 'NZ Manuka Inc', hqCountry: 'New Zealand', type: 'Producer',
    kyc: 'Verified', trust: 95, delivery: 89, quality: 98, compliance: 95, financial: 92,
    composite: 94, tier: 'Platinum', contracts: 1, risk: 'Low', since: '2024',
    locations: [
      { locId: 'LOC-004', country: 'New Zealand', address: 'Auckland', status: 'active' },
      { locId: 'LOC-005', country: 'Australia', address: 'Sydney', status: 'active' },
    ]
  },
  {
    id: 'SUP-004', name: 'Pacific Pack', hqCountry: 'Thailand', type: 'Packaging',
    kyc: 'Verified', trust: 78, delivery: 85, quality: 82, compliance: 75, financial: 80,
    composite: 80, tier: 'Silver', contracts: 1, risk: 'Medium', since: '2024',
    locations: [
      { locId: 'LOC-006', country: 'Thailand', address: 'Chon Buri', status: 'active' },
    ]
  },
  {
    id: 'SUP-005', name: 'Mekong Logistics', hqCountry: 'Vietnam', type: '3PL',
    kyc: 'Pending', trust: 65, delivery: 72, quality: 70, compliance: 60, financial: 68,
    composite: 67, tier: 'Bronze', contracts: 0, risk: 'High', since: '2025',
    locations: [
      { locId: 'LOC-007', country: 'Vietnam', address: 'Ho Chi Minh City', status: 'active' },
      { locId: 'LOC-008', country: 'Cambodia', address: 'Phnom Penh', status: 'active' },
      { locId: 'LOC-009', country: 'Vietnam', address: 'Hanoi', status: 'active' },
    ]
  },
];

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
// RENDER PAGE
// ═══════════════════════════════════════════════════════════════
export function renderPage() {
  const totalLocs = SUPPLIERS.reduce((s, sup) => s + sup.locations.length, 0);
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} Supplier Scoring</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._showOnboardSupplier()">+ Onboard Supplier</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Legal Entities', SUPPLIERS.length.toString(), `${SUPPLIERS.filter(s => s.tier === 'Gold' || s.tier === 'Platinum').length} Gold/Platinum`, 'green', 'users')}
        ${m('Locations', totalLocs.toString(), `Across ${new Set(SUPPLIERS.flatMap(s => s.locations.map(l => l.country))).size} countries`, 'blue', 'globe')}
        ${m('KYC Pending', SUPPLIERS.filter(s => s.kyc === 'Pending').length.toString(), 'Requires verification', 'orange', 'shield')}
        ${m('High Risk', SUPPLIERS.filter(s => s.risk === 'High').length.toString(), 'Below threshold (< 70)', 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Supplier Performance Matrix</h3>
        <table class="sa-table"><thead><tr><th>Supplier</th><th>HQ</th><th>Locations</th><th>Type</th><th>KYC</th><th>Trust</th><th>Delivery</th><th>Quality</th><th>Compliance</th><th>Financial</th><th>Composite</th><th>Tier</th><th>Risk</th></tr></thead><tbody>
          ${SUPPLIERS.map(s => {
    const tierColor = s.tier === 'Platinum' ? '#8b5cf6' : s.tier === 'Gold' ? '#f59e0b' : s.tier === 'Silver' ? '#94a3b8' : '#cd7f32';
    const locList = s.locations.map(l => l.country).join(', ');
    return `<tr class="${s.risk === 'High' ? 'ops-alert-row' : ''}">
              <td><strong>${s.name}</strong><div style="font-size:0.65rem;color:var(--text-secondary)">${s.id} · Since ${s.since}</div></td>
              <td>${s.hqCountry}</td>
              <td style="font-size:0.72rem" title="${locList}">${s.locations.length} <span style="color:var(--text-muted)">(${locList})</span></td>
              <td style="font-size:0.78rem">${s.type}</td>
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
      <div id="onboard-modal-body" style="background:var(--card-bg, #fff);border-radius:14px;padding:28px 24px;width:540px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border, #e2e8f0)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0;color:var(--text-primary, #1e293b);font-size:1.1rem">🏢 Onboard New Supplier</h3>
          <button onclick="window._closeOnboardSupplier()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted, #94a3b8);padding:4px 8px;border-radius:6px" title="Close">✕</button>
        </div>

        <!-- Entity match warning banner (hidden by default) -->
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
        <div id="ob-actions" style="display:flex;gap:10px;margin-top:20px">
          <button onclick="window._submitOnboardSupplier()" style="flex:1;padding:11px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Submit for KYC Review</button>
          <button onclick="window._closeOnboardSupplier()" style="flex:0.5;padding:11px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border, #e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.9rem">Cancel</button>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE DETECTION v3: Entity-Location Aware
// ═══════════════════════════════════════════════════════════════
const LEGAL_SUFFIXES = /\b(co\.?|company|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|plc\.?|gmbh|sa\.?|srl|pte\.?|pty\.?|group|holdings?)\b/gi;

// Country tokens → canonical country name
const COUNTRY_TOKENS = {
  'us': 'USA', 'usa': 'USA', 'united states': 'USA', 'america': 'USA',
  'uk': 'Germany', 'de': 'Germany', 'germany': 'Germany',
  'ca': 'Canada', 'canada': 'Canada',
  'cn': 'China', 'china': 'China', 'prc': 'China',
  'vn': 'Vietnam', 'vietnam': 'Vietnam', 'viet nam': 'Vietnam',
  'th': 'Thailand', 'thailand': 'Thailand',
  'sg': 'Singapore', 'singapore': 'Singapore',
  'nz': 'New Zealand', 'new zealand': 'New Zealand',
  'au': 'Australia', 'australia': 'Australia',
  'in': 'India', 'india': 'India',
  'jp': 'Japan', 'japan': 'Japan',
  'kr': 'South Korea', 'south korea': 'South Korea', 'korea': 'South Korea',
  'id': 'Indonesia', 'indonesia': 'Indonesia',
  'my': 'Malaysia', 'malaysia': 'Malaysia',
  'ph': 'Philippines', 'philippines': 'Philippines',
  'kh': 'Cambodia', 'cambodia': 'Cambodia',
  'lk': 'Sri Lanka', 'sri lanka': 'Sri Lanka',
};

function normalizeName(raw) {
  return (raw || '').toLowerCase().trim()
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[.\-_,&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeInput(raw) {
  const lower = (raw || '').toLowerCase().trim();
  let detectedCountry = null;
  let baseName = lower;

  // Try to detect country token at end of string (e.g. "Golden Beans US")
  const words = lower.split(/\s+/);
  // Check last 1-2 words for country
  for (let n = 1; n <= Math.min(2, words.length - 1); n++) {
    const tail = words.slice(-n).join(' ');
    if (COUNTRY_TOKENS[tail]) {
      detectedCountry = COUNTRY_TOKENS[tail];
      baseName = words.slice(0, -n).join(' ');
      break;
    }
  }

  return {
    rawName: raw.trim(),
    baseName: normalizeName(baseName),
    country: detectedCountry,
    normalizedFull: normalizeName(raw),
  };
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

/**
 * Check for entity and location duplicates
 * Returns: { type, supplier, locationMatch?, score? }
 */
function checkEntityMatch(inputName) {
  const tok = tokenizeInput(inputName);
  if (!tok.baseName) return null;

  // 1. Exact raw match
  const rawLower = inputName.toLowerCase().trim();
  const exact = SUPPLIERS.find(s => s.name.toLowerCase().trim() === rawLower);
  if (exact) {
    const locMatch = tok.country ? exact.locations.find(l => l.country === tok.country) : null;
    return { type: 'exact', supplier: exact, locationMatch: locMatch, inputCountry: tok.country };
  }

  // 2. Normalized base name match (entity identity)
  const entityMatch = SUPPLIERS.find(s => normalizeName(s.name) === tok.baseName);
  if (entityMatch) {
    const locMatch = tok.country ? entityMatch.locations.find(l => l.country === tok.country) : null;
    return { type: 'entity', supplier: entityMatch, locationMatch: locMatch, inputCountry: tok.country };
  }

  // 3. Fuzzy match on base name (≥80% similarity)
  let best = { score: 0, supplier: null };
  for (const s of SUPPLIERS) {
    const score = similarity(tok.baseName, normalizeName(s.name));
    if (score > best.score) { best = { score, supplier: s }; }
  }
  if (best.score >= 0.8 && best.supplier) {
    return { type: 'fuzzy', supplier: best.supplier, score: best.score, inputCountry: tok.country };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MODAL HANDLERS
// ═══════════════════════════════════════════════════════════════
let _entityConfirmed = false;

window._showOnboardSupplier = () => {
  _entityConfirmed = false;
  const banner = document.getElementById('ob-match-banner');
  if (banner) banner.style.display = 'none';
  document.getElementById('onboard-modal').style.display = 'flex';
};

window._closeOnboardSupplier = () => {
  _entityConfirmed = false;
  document.getElementById('onboard-modal').style.display = 'none';
};

// Live check as user types
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
    const locs = s.locations.map(l => l.country).join(', ');

    if (match.type === 'exact') {
      banner.style.display = 'block';
      banner.style.borderColor = '#ef444440';
      banner.style.background = '#fef2f240';
      banner.innerHTML = `
        <div style="font-weight:700;color:#ef4444;margin-bottom:6px">⛔ Exact match found</div>
        <div style="font-size:0.85rem;color:var(--text-primary, #1e293b)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary, #64748b);margin-top:4px">📍 Locations: ${locs}</div>`;
    } else if (match.type === 'entity') {
      banner.style.display = 'block';
      banner.style.borderColor = '#f59e0b40';
      banner.style.background = '#fef3c740';
      const locNote = match.locationMatch
        ? `<div style="color:#f59e0b;font-size:0.82rem;margin-top:6px">📍 ${match.inputCountry} location already exists (${match.locationMatch.locId})</div>`
        : match.inputCountry
          ? `<div style="color:#3b82f6;font-size:0.82rem;margin-top:6px">📍 No ${match.inputCountry} location found — you can add it</div>`
          : '';
      banner.innerHTML = `
        <div style="font-weight:700;color:#f59e0b;margin-bottom:6px">⚠️ Possible duplicate entity</div>
        <div style="font-size:0.85rem;color:var(--text-primary, #1e293b)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary, #64748b);margin-top:4px">📍 Existing locations: ${locs}</div>
        ${locNote}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="window._addLocationToExisting('${s.id}')" style="padding:7px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600">+ Add New Location</button>
          <button onclick="window._confirmNewEntity()" style="padding:7px 14px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border,#e2e8f0);border-radius:6px;cursor:pointer;font-size:0.8rem">Different Legal Entity</button>
        </div>`;
    } else if (match.type === 'fuzzy') {
      banner.style.display = 'block';
      banner.style.borderColor = '#3b82f640';
      banner.style.background = '#eff6ff40';
      banner.innerHTML = `
        <div style="font-weight:700;color:#3b82f6;margin-bottom:6px">💡 Similar supplier found (${Math.round(match.score * 100)}% match)</div>
        <div style="font-size:0.85rem;color:var(--text-primary, #1e293b)"><strong>${s.name}</strong> (${s.id}, ${s.tier} tier)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary, #64748b);margin-top:4px">📍 Locations: ${locs}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="window._confirmNewEntity()" style="padding:7px 14px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border,#e2e8f0);border-radius:6px;cursor:pointer;font-size:0.8rem">This is a different supplier</button>
        </div>`;
    }
  }, 300);
};

// User clicks "Add New Location" to existing supplier
window._addLocationToExisting = (supplierId) => {
  const country = document.getElementById('ob-country')?.value;
  if (!country) { showToast('Please select a country first', 'warning'); return; }
  const sup = SUPPLIERS.find(s => s.id === supplierId);
  if (!sup) return;
  const existing = sup.locations.find(l => l.country === country);
  if (existing) {
    showToast(`📍 ${country} location already exists for ${sup.name} (${existing.locId})`, 'warning');
    return;
  }
  window._closeOnboardSupplier();
  showToast(`✅ ${country} location added to "${sup.name}" — pending verification`, 'success');
};

// User confirms this is a different legal entity
window._confirmNewEntity = () => {
  _entityConfirmed = true;
  const banner = document.getElementById('ob-match-banner');
  if (banner) {
    banner.style.display = 'block';
    banner.style.borderColor = '#22c55e40';
    banner.style.background = '#f0fdf440';
    banner.innerHTML = `<div style="font-weight:600;color:#22c55e;font-size:0.85rem">✅ Confirmed: Creating as a separate legal entity</div>`;
  }
  showToast('Confirmed as separate entity. Fill remaining fields and submit.', 'info');
};

window._submitOnboardSupplier = () => {
  const name = document.getElementById('ob-name')?.value?.trim();
  const country = document.getElementById('ob-country')?.value;
  const type = document.getElementById('ob-type')?.value;

  if (!name) { showToast('Legal entity name is required', 'warning'); return; }

  // Block exact match (can never create exact duplicate)
  if (!_entityConfirmed) {
    const match = checkEntityMatch(name);
    if (match && match.type === 'exact') {
      showToast(`⛔ "${match.supplier.name}" already exists. Use "Add New Location" instead.`, 'error');
      return;
    }
    if (match && (match.type === 'entity' || match.type === 'fuzzy')) {
      showToast(`⚠️ Similar entity detected. Please use the buttons above to confirm your intent.`, 'warning');
      return;
    }
  }

  if (!country) { showToast('Please select HQ country', 'warning'); return; }
  if (!type) { showToast('Please select supplier type', 'warning'); return; }

  _entityConfirmed = false;
  window._closeOnboardSupplier();
  showToast(`✅ "${name}" submitted for KYC review as new legal entity`, 'success');
};

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
