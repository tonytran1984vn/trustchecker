/**
 * Company Admin – KPI Overview
 * ═══════════════════════════════
 * Deep KPIs: products, scans (7d/30d/all), fraud rate, trust, alerts, weekly trends
 * API: /governance/kpi-overview
 */
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
    if (!_data) { loadData(); return loading(); }
    const d = _data;
    const fmtN = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v;

    return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>📊 KPI Overview</h1><p class="desc">Enterprise performance dashboard</p></div>

      <!-- Primary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${kpi('Products', d.products.total, d.products.active + ' active', '#6366f1')}
        ${kpi('Total Scans', fmtN(d.scans.total), fmtN(d.scans.last_7d) + ' (7d) · ' + fmtN(d.scans.last_30d) + ' (30d)', '#3b82f6')}
        ${kpi('Fraud Rate', d.fraud_rate + '%', d.detection_rate + '% auth rate', d.fraud_rate > 5 ? '#ef4444' : d.fraud_rate > 2 ? '#f59e0b' : '#22c55e')}
        ${kpi('Avg Trust', d.avg_trust, '/100', '#22c55e')}
      </div>

      <!-- Alert + Scan Period -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        ${kpi('Open Alerts', d.alerts.open, d.alerts.critical_open + ' critical', d.alerts.critical_open > 0 ? '#ef4444' : '#22c55e')}
        ${kpi('Flagged (7d)', d.scans.flagged_7d, 'of ' + fmtN(d.scans.last_7d) + ' scans', '#f59e0b')}
        ${kpi('Flagged (30d)', d.scans.flagged_30d, 'of ' + fmtN(d.scans.last_30d) + ' scans', '#f59e0b')}
      </div>

      <!-- Weekly Scan Trend -->
      ${d.weekly.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">📈 Weekly Scan Trend (12 weeks)</div></div>
        <div style="padding:16px">
          ${renderWeeklyBars(d.weekly)}
        </div>
      </div>` : ''}

      <!-- Top Products -->
      ${d.top_products.length > 0 ? `
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 Top Products by Scan Volume</div></div>
        <div class="table-container">
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Scans</th><th>Flagged</th><th>Trust</th></tr></thead>
            <tbody>
              ${d.top_products.map((p, i) => `
              <tr>
                <td style="font-weight:700;color:${i < 3 ? '#f59e0b' : 'var(--text-muted)'}">${i + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td>${fmtN(p.scans)}</td>
                <td style="color:${p.flagged > 0 ? '#ef4444' : 'var(--text-muted)'}">${p.flagged}</td>
                <td style="color:${p.avg_trust >= 80 ? '#22c55e' : p.avg_trust >= 60 ? '#f59e0b' : '#ef4444'}">${p.avg_trust || '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </div>
  `;
}

function kpi(label, value, sub, color) {
    return `
    <div class="card" style="text-align:center;padding:20px;border-left:3px solid ${color}">
      <div style="font-size:1.6rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.82rem;font-weight:600;margin-top:4px">${label}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${sub}</div>
    </div>`;
}

function renderWeeklyBars(weekly) {
    const mx = Math.max(...weekly.map(w => w.scans), 1);
    return `
    <div style="display:flex;align-items:end;gap:6px;height:120px">
      ${weekly.map(w => {
        const h = Math.max(4, (w.scans / mx) * 100);
        const fh = w.scans > 0 ? Math.max(2, (w.flagged / mx) * 100) : 0;
        const dt = new Date(w.week);
        return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="font-size:0.55rem;color:var(--text-muted)">${w.scans}</div>
          <div style="width:100%;position:relative;height:${h}px">
            <div style="position:absolute;bottom:0;width:100%;height:${h}px;background:#3b82f6;border-radius:4px 4px 0 0;opacity:0.3"></div>
            ${fh > 0 ? `<div style="position:absolute;bottom:0;width:100%;height:${fh}px;background:#ef4444;border-radius:0;opacity:0.7"></div>` : ''}
          </div>
          <div style="font-size:0.55rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
    }).join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;color:var(--text-muted)">
      <span>🔵 Total scans</span><span>🔴 Flagged</span>
    </div>`;
}

async function loadData() {
    try {
        _data = await api.get('/tenant/governance/kpi-overview');
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[KPI]', e); }
}

function loading() {
    return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading KPI overview...</span></div>';
}
