/**
 * CA – Supply Route Engine (Factory→WH→Dist→Retail + Channel Integrity Rules)
 * Route definition, geo-fence rules, code collision prevention
 */
import { icon } from '../../core/icons.js';

const ROUTES = [
    { id: 'SR-001', name: 'Vietnam South Route', chain: ['Factory HCM', 'WH-HCM-01', 'D-VN-012 (Saigon Trading)', 'Retail VN-South'], products: 8, status: 'Active', geoFence: 'VN-South only', integrity: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Clean' },
    { id: 'SR-002', name: 'Vietnam North Route', chain: ['Factory HN', 'WH-HN-01', 'D-VN-008 (Hanoi Dist)', 'Retail VN-North'], products: 5, status: 'Active', geoFence: 'VN-North only', integrity: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Clean' },
    { id: 'SR-003', name: 'Cambodia Export Route', chain: ['Factory HCM', 'WH-HCM-01', 'WH-PP-01 (transit)', 'D-KH-001 (Phnom Penh Corp)', 'Retail Cambodia'], products: 3, status: 'Active', geoFence: 'KH only', integrity: '🚨 Breach detected' },
    { id: 'SR-004', name: 'Thailand Export Route', chain: ['Factory HCM', 'WH-SG-01 (hub)', 'D-TH-003 (Bangkok Trade)', 'Retail Thailand'], products: 4, status: 'Active', geoFence: 'TH only', integrity: '<span class="status-icon status-warn" aria-label="Warning">!</span> Warning' },
    { id: 'SR-005', name: 'Singapore Hub Route', chain: ['Factory HCM', 'WH-SG-01', 'D-SG-002 (SG Dist)', 'Retail Singapore'], products: 6, status: 'Active', geoFence: 'SG only', integrity: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Clean' },
];

const CHANNEL_RULES = [
    { id: 'CR-001', name: 'Geo-Fence Violation', logic: 'Scan geo ∉ assigned distributor region → auto-flag', severity: 'High', autoAction: 'Create case + alert Ops', active: true, triggers30d: 42 },
    { id: 'CR-002', name: 'Cross-Route Detection', logic: 'Code from Route A scanned in Route B territory → flag leakage', severity: 'High', autoAction: 'Create case + alert Ops + flag distributor', active: true, triggers30d: 18 },
    { id: 'CR-003', name: 'Reverse Flow', logic: 'Code scanned at upstream node after downstream → flag diversion', severity: 'Critical', autoAction: 'Lock batch + alert Compliance', active: true, triggers30d: 3 },
    { id: 'CR-004', name: 'Unauthorized Region', logic: 'Scan from country not in any active route → flag counterfeit', severity: 'Critical', autoAction: 'Lock batch + escalate Risk', active: true, triggers30d: 7 },
    { id: 'CR-005', name: 'Distributor Concentration', logic: '>80% of batch scans from single distributor in <48h → flag dumping', severity: 'Medium', autoAction: 'Soft case + monitor', active: true, triggers30d: 2 },
];

const COLLISION_PREVENTION = {
    tenantSalt: 'HMAC-SHA256(tenant_id + master_secret)',
    preGenCheck: 'Bloom filter (1M capacity, 0.001% FP) → DB uniqueness check',
    postActivation: 'Real-time dedup via Redis SET → reject if exists',
    crossTenant: 'Namespace isolation: prefix per tenant (e.g., ACME-..., BRAND-B-...)',
    checkDigit: 'CRC-16 or HMAC-SHA256 truncated to 4 chars',
};

const ROUTE_BREACHES = [
    { code: 'ACME-2026-004891-3L', route: 'SR-001 (VN South)', scannedIn: 'Phnom Penh, Cambodia 🇰🇭', ruleTriggered: 'CR-001 + CR-002', severity: 'High', action: 'Case FC-089 created', time: '2h ago' },
    { code: 'ACME-2026-001842-7P', route: 'SR-004 (Thailand)', scannedIn: 'Yangon, Myanmar 🇲🇲', ruleTriggered: 'CR-004', severity: 'Critical', action: 'Batch locked + Risk escalated', time: '5h ago' },
    { code: 'ACME-D-VN045-002319', route: 'SR-002 (VN North)', scannedIn: 'Ho Chi Minh City, VN', ruleTriggered: 'CR-002', severity: 'Medium', action: 'Soft case — possible internal transfer', time: '1d ago' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Supply Route Engine</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Route</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Routes', ROUTES.length.toString(), `${ROUTES.reduce((s, r) => s + r.products, 0)} products mapped`, 'blue', 'network')}
        ${m('Channel Rules', CHANNEL_RULES.length.toString(), `${CHANNEL_RULES.reduce((s, r) => s + r.triggers30d, 0)} triggers in 30d`, 'orange', 'target')}
        ${m('Route Breaches', ROUTE_BREACHES.length.toString(), 'Last 24h', 'red', 'alertTriangle')}
        ${m('Collision Guard', 'Active', 'Bloom + Redis + HMAC', 'green', 'shield')}
      </div>

      <!-- SUPPLY ROUTES -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🗺 Supply Route Map</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Define authorized product path: Factory → Warehouse → Distributor → Retail. Any scan outside this path triggers channel integrity rules.</p>
        ${ROUTES.map(r => `
          <div style="padding:0.75rem;border-bottom:1px solid var(--border);${r.integrity.includes('Breach') ? 'background:rgba(239,68,68,0.03)' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><span class="sa-code" style="color:#6366f1;font-weight:600">${r.id}</span> <strong>${r.name}</strong></div>
              <div style="display:flex;gap:0.5rem;align-items:center">
                <span style="font-size:0.72rem">${r.integrity}</span>
                <span class="sa-status-pill sa-pill-green" style="font-size:0.62rem">${r.status}</span>
              </div>
            </div>
            <div style="display:flex;gap:0.3rem;margin:0.4rem 0;flex-wrap:wrap;align-items:center">
              ${r.chain.map((node, i) => `<span style="font-size:0.72rem;padding:0.2rem 0.5rem;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:4px">${node}</span>${i < r.chain.length - 1 ? '<span style="color:#6366f1">→</span>' : ''}`).join('')}
            </div>
            <div style="font-size:0.68rem;color:var(--text-secondary)">${r.products} products · Geo-fence: <strong>${r.geoFence}</strong></div>
          </div>
        `).join('')}
      </div>

      <!-- CHANNEL INTEGRITY RULES + COLLISION PREVENTION -->
      <div style="display:grid;grid-template-columns:3fr 2fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>🛡 Channel Integrity Rules</h3>
          <table class="sa-table"><thead><tr><th>ID</th><th>Rule</th><th>Logic</th><th>Severity</th><th>Auto-Action</th><th>30d</th></tr></thead><tbody>
            ${CHANNEL_RULES.map(c => `<tr>
              <td class="sa-code">${c.id}</td><td><strong>${c.name}</strong></td>
              <td style="font-size:0.68rem">${c.logic}</td>
              <td><span class="sa-status-pill sa-pill-${c.severity === 'Critical' ? 'red' : c.severity === 'High' ? 'orange' : 'blue'}">${c.severity}</span></td>
              <td style="font-size:0.68rem">${c.autoAction}</td>
              <td style="text-align:center;font-weight:600;color:${c.triggers30d > 10 ? '#ef4444' : 'inherit'}">${c.triggers30d}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="sa-card" style="border-left:4px solid #22c55e">
          <h3>🔐 Code Collision Prevention</h3>
          ${Object.entries(COLLISION_PREVENTION).map(([k, v]) => `
            <div style="padding:0.4rem 0;border-bottom:1px solid var(--border)">
              <div style="font-size:0.72rem;font-weight:600">${k.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div style="font-size:0.68rem;font-family:monospace;color:#22c55e">${v}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- RECENT ROUTE BREACHES -->
      <div class="sa-card" style="border-left:4px solid #ef4444">
        <h3>🚨 Recent Route Breaches</h3>
        <table class="sa-table"><thead><tr><th>Code</th><th>Assigned Route</th><th>Scanned In</th><th>Rules Triggered</th><th>Severity</th><th>Action</th><th>When</th></tr></thead><tbody>
          ${ROUTE_BREACHES.map(b => `<tr class="ops-alert-row">
            <td class="sa-code" style="font-size:0.72rem;color:#6366f1">${b.code}</td>
            <td style="font-size:0.78rem">${b.route}</td>
            <td style="font-size:0.78rem;color:#ef4444"><strong>${b.scannedIn}</strong></td>
            <td class="sa-code" style="font-size:0.72rem">${b.ruleTriggered}</td>
            <td><span class="sa-status-pill sa-pill-${b.severity === 'Critical' ? 'red' : 'orange'}">${b.severity}</span></td>
            <td style="font-size:0.72rem">${b.action}</td>
            <td style="font-size:0.72rem">${b.time}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
