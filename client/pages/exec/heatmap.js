/**
 * Executive – Risk Heatmap (Dedicated Page)
 * ═══════════════════════════════════════════
 * DEEP VIEW — uses dedicated /ccs/geo-detail API
 * Overview only shows top 3 + simple table
 * This page shows: per-country trends, product flags by country, monthly progression, regional clustering
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

const FLAG = (cc) => {
  if (!cc || cc.length !== 2) return '🌍';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const NAMES = { VN: 'Vietnam', PH: 'Philippines', AE: 'UAE', JP: 'Japan', US: 'United States', TH: 'Thailand', MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', KR: 'South Korea', CN: 'China', TW: 'Taiwan', HK: 'Hong Kong', IN: 'India', AU: 'Australia', GB: 'United Kingdom', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', BR: 'Brazil', MX: 'Mexico', CA: 'Canada', NZ: 'New Zealand', SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', NG: 'Nigeria', ZA: 'South Africa', EG: 'Egypt', KE: 'Kenya', GH: 'Ghana', RU: 'Russia', UA: 'Ukraine', TR: 'Turkey', PK: 'Pakistan', BD: 'Bangladesh', MM: 'Myanmar', KH: 'Cambodia', LA: 'Laos', NP: 'Nepal' };

const REGIONS = {
  'Southeast Asia': ['VN', 'TH', 'MY', 'SG', 'ID', 'PH', 'MM', 'KH', 'LA'],
  'East Asia': ['CN', 'JP', 'KR', 'TW', 'HK'],
  'South Asia': ['IN', 'PK', 'BD', 'NP'],
  'Middle East': ['AE', 'SA', 'QA', 'KW', 'TR'],
  'Europe': ['GB', 'DE', 'FR', 'IT', 'ES', 'RU', 'UA'],
  'Americas': ['US', 'CA', 'BR', 'MX'],
  'Africa': ['NG', 'ZA', 'EG', 'KE', 'GH'],
  'Oceania': ['AU', 'NZ'],
};

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const geo = _data.countries || [];
  const trends = _data.country_trends || {};
  const products = _data.top_products_by_country || [];
  const monthly = _data.monthly_geo || [];

  if (!geo.length) return `<div class="exec-page"><div style="text-align:center;padding:4rem;color:var(--text-secondary)">No geographic scan data available.</div></div>`;

  const totalScans = geo.reduce((s, g) => s + g.scans, 0);
  const totalFlagged = geo.reduce((s, g) => s + g.flagged, 0);
  const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
  geo.forEach(g => riskDist[g.risk_level] = (riskDist[g.risk_level] || 0) + 1);

  // Regional grouping
  const regionData = {};
  for (const [region, codes] of Object.entries(REGIONS)) {
    const cs = geo.filter(g => codes.includes(g.country));
    if (cs.length > 0) {
      const scans = cs.reduce((s, g) => s + g.scans, 0);
      const flagged = cs.reduce((s, g) => s + g.flagged, 0);
      regionData[region] = { countries: cs, scans, flagged, avgFraud: scans > 0 ? Math.round(flagged / scans * 10000) / 100 : 0 };
    }
  }

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('globe', 28)} Geographic Risk — Deep Analysis</h1>
        <div class="exec-timestamp">${geo.length} countries · ${totalScans.toLocaleString()} total scans · 30-day window</div>
      </div>

      <!-- Overview KPIs -->
      <section class="exec-section">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
          ${kpiCard('Countries', geo.length, '', '#6366f1')}
          ${kpiCard('Total Scans', totalScans.toLocaleString(), '', '#22c55e')}
          ${kpiCard('Total Flagged', totalFlagged.toLocaleString(), Math.round(totalFlagged / Math.max(totalScans, 1) * 100) + '%', '#ef4444')}
          ${kpiCard('High/Critical', (riskDist.high + riskDist.critical) + ' countries', '', '#dc2626')}
          ${kpiCard('Avg Trust', (geo.reduce((s, g) => s + g.avg_trust, 0) / Math.max(geo.length, 1)).toFixed(1), '', '#22c55e')}
        </div>
      </section>

      <!-- Risk Distribution Bar -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Risk Distribution</h2>
        <div style="display:flex;height:28px;border-radius:14px;overflow:hidden;margin-bottom:8px">
          ${riskDist.low > 0 ? `<div style="flex:${riskDist.low};background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff">${riskDist.low} Low</div>` : ''}
          ${riskDist.medium > 0 ? `<div style="flex:${riskDist.medium};background:#eab308;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff">${riskDist.medium} Med</div>` : ''}
          ${riskDist.high > 0 ? `<div style="flex:${riskDist.high};background:#ef4444;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff">${riskDist.high} High</div>` : ''}
          ${riskDist.critical > 0 ? `<div style="flex:${riskDist.critical};background:#dc2626;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff">${riskDist.critical} Crit</div>` : ''}
        </div>
      </section>

      <!-- TOP 5 Country Trends (12 weeks — NOT in overview) -->
      ${Object.keys(trends).length > 0 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Top Country Risk Trends — 12 Weeks</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:12px">
          ${Object.entries(trends).map(([cc, wks]) => {
    const name = NAMES[cc] || cc;
    const maxF = Math.max(...wks.map(w => w.fraud_rate), 1);
    return `
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div><span style="font-size:1.1rem;margin-right:6px">${FLAG(cc)}</span><strong>${name}</strong></div>
                <span style="font-size:0.62rem;opacity:0.4">${wks.length} weeks</span>
              </div>
              <div style="display:flex;align-items:end;gap:3px;height:60px">
                ${wks.map(w => {
      const h = Math.max(4, (w.fraud_rate / maxF) * 55);
      const color = w.fraud_rate > 5 ? '#ef4444' : w.fraud_rate > 2 ? '#f59e0b' : '#22c55e';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                    <div style="font-size:0.5rem;opacity:0.3">${w.fraud_rate}%</div>
                    <div style="width:100%;height:${h}px;background:${color};border-radius:3px 3px 0 0;opacity:0.7"></div>
                  </div>`;
    }).join('')}
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.55rem;opacity:0.3;margin-top:4px">
                <span>${formatDate(wks[0]?.week)}</span><span>${formatDate(wks[wks.length - 1]?.week)}</span>
              </div>
            </div>`;
  }).join('')}
        </div>
      </section>` : ''}

      <!-- Regional Analysis -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Regional Risk Clusters</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
          ${Object.entries(regionData).sort((a, b) => b[1].avgFraud - a[1].avgFraud).map(([region, rd]) => {
    const riskColor = rd.avgFraud > 5 ? '#ef4444' : rd.avgFraud > 2 ? '#f59e0b' : '#22c55e';
    return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-weight:700;font-size:0.85rem">${region}</div>
                <span style="font-size:0.6rem;font-weight:600;padding:2px 8px;border-radius:10px;background:${riskColor}18;color:${riskColor}">${rd.avgFraud}%</span>
              </div>
              <div style="font-size:0.68rem;opacity:0.5">${rd.scans.toLocaleString()} scans · ${rd.flagged} flagged · ${rd.countries.length} countries</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
                ${rd.countries.map(c => `<span style="font-size:0.72rem" title="${NAMES[c.country] || c.country}: ${c.fraud_rate}%">${FLAG(c.country)}</span>`).join('')}
              </div>
            </div>`;
  }).join('')}
        </div>
      </section>

      <!-- Flagged Products by Country (NOT in overview) -->
      ${products.length > 0 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('alertTriangle', 20)} Top Flagged Products by Country</h2>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead><tr><th>Country</th><th>Product</th><th>Flags</th><th>Counterfeit</th></tr></thead>
          <tbody>
            ${products.map(p => {
    const rc = p.counterfeit > 0 ? '#ef4444' : '#f59e0b';
    return `<tr>
                <td>${FLAG(p.country)} <strong>${NAMES[p.country] || p.country}</strong></td>
                <td>${p.product}</td>
                <td>${p.flags}</td>
                <td style="color:${rc};font-weight:600">${p.counterfeit}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </section>` : ''}

      <!-- Monthly Geographic Progression (NOT in overview) -->
      ${monthly.length > 1 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('clock', 20)} Monthly Geographic Progression</h2>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead><tr><th>Month</th><th>Countries</th><th>Scans</th><th>Flagged</th><th>Flag Rate</th><th>Δ Flagged</th></tr></thead>
          <tbody>
            ${monthly.map((m, i) => {
    const rate = m.scans > 0 ? Math.round(m.flagged / m.scans * 10000) / 100 : 0;
    const prev = i > 0 ? monthly[i - 1].flagged : m.flagged;
    const delta = prev > 0 ? Math.round((m.flagged - prev) / prev * 100) : 0;
    return `<tr>
                <td><strong>${formatMonth(m.month)}</strong></td>
                <td>${m.countries}</td>
                <td>${m.scans.toLocaleString()}</td>
                <td style="color:#ef4444">${m.flagged}</td>
                <td style="font-weight:600;color:${rate > 5 ? '#ef4444' : rate > 2 ? '#f59e0b' : '#22c55e'}">${rate}%</td>
                <td style="color:${delta > 0 ? '#ef4444' : delta < 0 ? '#22c55e' : '#888'};font-weight:600">${delta > 0 ? '+' : ''}${delta}%</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </section>` : ''}

      <!-- Full Country Table -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('list', 20)} Full Country Detail</h2>
        <div style="max-height:400px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:10px">
        <table class="ccs-table" style="font-size:0.75rem">
          <thead style="position:sticky;top:0;background:var(--surface-color,#12122a);z-index:1">
            <tr><th>Country</th><th>Scans</th><th>Suspicious</th><th>Counterfeit</th><th>Fraud %</th><th>Trust</th><th>Risk</th></tr>
          </thead>
          <tbody>
            ${[...geo].sort((a, b) => b.fraud_rate - a.fraud_rate).map(g => {
    const rc = { low: '#22c55e', medium: '#eab308', high: '#ef4444', critical: '#dc2626' }[g.risk_level] || '#888';
    return `<tr>
                <td>${FLAG(g.country)} <strong>${NAMES[g.country] || g.country}</strong></td>
                <td>${g.scans.toLocaleString()}</td>
                <td style="color:#f59e0b">${g.suspicious}</td>
                <td style="color:#ef4444">${g.counterfeit}</td>
                <td style="font-weight:700;color:${rc}">${g.fraud_rate}%</td>
                <td>${g.avg_trust}</td>
                <td><span style="font-size:0.6rem;font-weight:600;padding:2px 8px;border-radius:10px;background:${rc}18;color:${rc};text-transform:uppercase">${g.risk_level}</span></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  `;
}

function kpiCard(label, value, sub, color) {
  return `
    <div style="background:linear-gradient(135deg,${color}0a,transparent);border:1px solid ${color}20;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.3rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.68rem;font-weight:600;margin-top:2px">${label}</div>
      ${sub ? `<div style="font-size:0.6rem;opacity:0.4;margin-top:2px">${sub}</div>` : ''}
    </div>`;
}

function formatDate(d) {
  if (!d) return '??';
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function formatMonth(m) {
  if (!m) return '??';
  const d = new Date(m);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/geo-detail');
    _data = r;
    rerender();
  } catch (e) { console.error('[Heatmap]', e); }
}

function rerender() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading geographic risk detail...</div></div></div>`;
}
