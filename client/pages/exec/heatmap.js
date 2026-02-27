/**
 * Executive – Risk Heatmap (Dedicated Page)
 * ═══════════════════════════════════════════
 * Deep view: risk distribution, country drill-down, region clustering
 * API: /owner/ccs/exposure → geo_risk array
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
    const geo = _data.geo_risk || [];
    if (!geo.length) return `<div class="exec-page"><div style="text-align:center;padding:4rem;color:var(--text-secondary)">No geographic scan data available.</div></div>`;

    const sorted = [...geo].sort((a, b) => (parseFloat(b.fraud_rate) || 0) - (parseFloat(a.fraud_rate) || 0));
    const totalScans = geo.reduce((s, g) => s + (parseInt(g.scans) || 0), 0);
    const totalFlagged = geo.reduce((s, g) => s + (parseInt(g.flagged) || 0), 0);
    const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
    geo.forEach(g => riskDist[g.risk_level] = (riskDist[g.risk_level] || 0) + 1);

    // Group by region
    const regionData = {};
    for (const [region, codes] of Object.entries(REGIONS)) {
        const countries = geo.filter(g => codes.includes(g.country));
        if (countries.length > 0) {
            const scans = countries.reduce((s, g) => s + (parseInt(g.scans) || 0), 0);
            const flagged = countries.reduce((s, g) => s + (parseInt(g.flagged) || 0), 0);
            const avgFraud = scans > 0 ? Math.round(flagged / scans * 10000) / 100 : 0;
            regionData[region] = { countries, scans, flagged, avgFraud };
        }
    }

    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('globe', 28)} Geographic Risk Heatmap</h1>
        <div class="exec-timestamp">${geo.length} countries · ${totalScans.toLocaleString()} total scans</div>
      </div>

      <!-- Overview KPIs -->
      <section class="exec-section">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:#22c55e">${riskDist.low}</div>
            <div style="font-size:0.72rem;font-weight:600">Low Risk</div>
          </div>
          <div style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:#eab308">${riskDist.medium}</div>
            <div style="font-size:0.72rem;font-weight:600">Medium Risk</div>
          </div>
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:#ef4444">${riskDist.high + riskDist.critical}</div>
            <div style="font-size:0.72rem;font-weight:600">High/Critical Risk</div>
          </div>
          <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:#6366f1">${totalScans > 0 ? Math.round(totalFlagged / totalScans * 100) : 0}%</div>
            <div style="font-size:0.72rem;font-weight:600">Global Flag Rate</div>
          </div>
        </div>
      </section>

      <!-- Risk Distribution Bar -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Risk Distribution</h2>
        <div style="display:flex;height:24px;border-radius:12px;overflow:hidden;margin-bottom:8px">
          ${riskDist.low > 0 ? `<div style="flex:${riskDist.low};background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#fff">${riskDist.low}</div>` : ''}
          ${riskDist.medium > 0 ? `<div style="flex:${riskDist.medium};background:#eab308;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#fff">${riskDist.medium}</div>` : ''}
          ${riskDist.high > 0 ? `<div style="flex:${riskDist.high};background:#ef4444;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#fff">${riskDist.high}</div>` : ''}
          ${riskDist.critical > 0 ? `<div style="flex:${riskDist.critical};background:#dc2626;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#fff">${riskDist.critical}</div>` : ''}
        </div>
        <div style="display:flex;gap:16px;font-size:0.65rem;opacity:0.5">
          <span>🟢 Low (${riskDist.low})</span><span>🟡 Medium (${riskDist.medium})</span>
          <span>🔴 High (${riskDist.high})</span><span>🔴 Critical (${riskDist.critical})</span>
        </div>
      </section>

      <!-- Regional Analysis -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Regional Risk Analysis</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${Object.entries(regionData).sort((a, b) => b[1].avgFraud - a[1].avgFraud).map(([region, rd]) => {
        const riskColor = rd.avgFraud > 5 ? '#ef4444' : rd.avgFraud > 2 ? '#f59e0b' : '#22c55e';
        return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-weight:700;font-size:0.88rem">${region}</div>
                <span style="font-size:0.62rem;font-weight:600;padding:2px 8px;border-radius:10px;background:${riskColor}18;color:${riskColor}">${rd.avgFraud}%</span>
              </div>
              <div style="font-size:0.7rem;opacity:0.5;margin-bottom:8px">${rd.scans.toLocaleString()} scans · ${rd.flagged} flagged · ${rd.countries.length} countries</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                ${rd.countries.map(c => `<span style="font-size:0.72rem" title="${NAMES[c.country] || c.country}: ${c.fraud_rate}%">${FLAG(c.country)}</span>`).join('')}
              </div>
            </div>`;
    }).join('')}
        </div>
      </section>

      <!-- Full Country Table -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('list', 20)} Country Detail (sorted by fraud rate)</h2>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead>
            <tr><th>Country</th><th>Scans</th><th>Flagged</th><th>Fraud %</th><th>Volume %</th><th>Risk Level</th></tr>
          </thead>
          <tbody>
            ${sorted.map(g => {
        const scans = parseInt(g.scans) || 0;
        const flagged = parseInt(g.flagged) || 0;
        const volPct = totalScans > 0 ? Math.round(scans / totalScans * 100) : 0;
        const rc = { low: '#22c55e', medium: '#eab308', high: '#ef4444', critical: '#dc2626' }[g.risk_level] || '#888';
        return `
              <tr>
                <td><span style="font-size:1rem;margin-right:6px">${FLAG(g.country)}</span><strong>${NAMES[g.country] || g.country}</strong> <span style="opacity:0.4">${g.country}</span></td>
                <td>${scans.toLocaleString()}</td>
                <td>${flagged}</td>
                <td style="font-weight:700;color:${rc}">${g.fraud_rate}%</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
                      <div style="width:${volPct}%;height:100%;background:${rc};border-radius:2px"></div>
                    </div>
                    <span style="font-size:0.7rem;opacity:0.5">${volPct}%</span>
                  </div>
                </td>
                <td><span style="font-size:0.62rem;font-weight:600;padding:2px 8px;border-radius:10px;background:${rc}18;color:${rc};text-transform:uppercase">${g.risk_level}</span></td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

async function loadData() {
    try {
        const r = await api.get('/tenant/owner/ccs/exposure');
        _data = r;
        rerender();
    } catch (e) { console.error('[Heatmap]', e); }
}

function rerender() {
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading risk heatmap...</div></div></div>`;
}
