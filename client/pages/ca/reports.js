/**
 * Company Admin – Reports & Export
 * ═════════════════════════════════
 * Operations reports with date range filter + CSV export
 * API: /governance/reports-data?range=7d|30d|90d
 */
import { API as api } from '../../core/api.js';

let _data = null;
let _range = '30d';

export function renderPage() {
    if (!_data) { loadData(); return loading(); }
    const d = _data;
    const s = d.scan_summary;

    return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>📋 Reports & Export</h1><p class="desc">Operations reports with data export</p></div>

      <!-- Range Selector -->
      <div style="display:flex;gap:8px;margin-bottom:20px">
        ${['7d', '30d', '90d'].map(r => `
          <button onclick="window.__setRange('${r}')"
                  style="padding:8px 20px;border-radius:8px;border:1px solid ${_range === r ? '#6366f1' : 'var(--border)'};
                         background:${_range === r ? 'rgba(99,102,241,0.15)' : 'var(--card-bg)'};
                         color:${_range === r ? '#6366f1' : 'var(--text-secondary)'};font-weight:600;cursor:pointer;font-size:0.82rem">
            ${r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>`).join('')}
      </div>

      <!-- Scan Summary -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">📊 Scan Summary (${_range})</div>
          <button onclick="window.__exportCSV('scans')" style="padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary);cursor:pointer;font-size:0.75rem;font-weight:600">⬇ Export CSV</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px">
          ${sumCard('Total', s.total, '#3b82f6')}
          ${sumCard('Authentic', s.authentic, '#22c55e')}
          ${sumCard('Suspicious', s.suspicious, '#f59e0b')}
          ${sumCard('Counterfeit', s.counterfeit, '#ef4444')}
          ${sumCard('Avg Trust', s.avg_trust, '#6366f1')}
        </div>
      </div>

      <!-- Daily Series Chart -->
      ${d.daily_series.length > 1 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">📈 Daily Scan Activity</div></div>
        <div style="padding:16px">${renderDailyBars(d.daily_series)}</div>
      </div>` : ''}

      <!-- Alert Summary -->
      ${d.alert_summary.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">🚨 Alert Summary</div>
          <button onclick="window.__exportCSV('alerts')" style="padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary);cursor:pointer;font-size:0.75rem;font-weight:600">⬇ Export CSV</button>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Severity</th><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              ${d.alert_summary.map(a => `
              <tr>
                <td><span class="badge ${a.severity}">${a.severity}</span></td>
                <td>${a.status}</td>
                <td><strong>${a.count}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Product Performance -->
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">📦 Product Performance</div>
          <button onclick="window.__exportCSV('products')" style="padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary);cursor:pointer;font-size:0.75rem;font-weight:600">⬇ Export CSV</button>
        </div>
        <div class="table-container" style="max-height:400px;overflow-y:auto">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Status</th><th>Scans</th><th>Flagged</th></tr></thead>
            <tbody>
              ${d.product_summary.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="color:var(--text-muted)">${p.category}</td>
                <td><span class="badge ${p.status}">${p.status}</span></td>
                <td>${p.scans}</td>
                <td style="color:${p.flagged > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:600">${p.flagged}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function sumCard(label, value, color) {
    return `
    <div style="text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">${label}</div>
    </div>`;
}

function renderDailyBars(series) {
    const mx = Math.max(...series.map(d => d.scans), 1);
    const labelEvery = Math.max(1, Math.ceil(series.length / 10));
    return `
    <div style="display:flex;align-items:end;gap:3px;height:100px">
      ${series.map((d, i) => {
        const h = Math.max(2, (d.scans / mx) * 85);
        const fh = d.scans > 0 ? Math.max(1, (d.flagged / mx) * 85) : 0;
        const dt = new Date(d.day);
        return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">
          <div style="width:100%;position:relative;height:${h}px">
            <div style="position:absolute;bottom:0;width:100%;height:${h}px;background:#3b82f6;border-radius:2px 2px 0 0;opacity:0.3"></div>
            ${fh > 0 ? `<div style="position:absolute;bottom:0;width:100%;height:${fh}px;background:#ef4444;opacity:0.7"></div>` : ''}
          </div>
          ${i % labelEvery === 0 ? `<div style="font-size:0.5rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>` : ''}
        </div>`;
    }).join('')}
    </div>`;
}

function toCSV(headers, rows) {
    const lines = [headers.join(',')];
    rows.forEach(r => lines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')));
    return lines.join('\n');
}

function downloadCSV(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

async function loadData() {
    try {
        _data = await api.get('/tenant/governance/reports-data?range=' + _range);
        window.__setRange = (r) => { _range = r; _data = null; const el = document.getElementById('main-content'); if (el) el.innerHTML = renderPage(); };
        window.__exportCSV = (type) => {
            if (!_data) return;
            if (type === 'scans') {
                const s = _data.scan_summary;
                downloadCSV(`scans_${_range}.csv`, toCSV(['Metric', 'Value'], [['Total', s.total], ['Authentic', s.authentic], ['Suspicious', s.suspicious], ['Counterfeit', s.counterfeit], ['Avg Trust', s.avg_trust]]));
            } else if (type === 'products') {
                downloadCSV(`products_${_range}.csv`, toCSV(['Product', 'Category', 'Status', 'Scans', 'Flagged'], _data.product_summary.map(p => [p.name, p.category, p.status, p.scans, p.flagged])));
            } else if (type === 'alerts') {
                downloadCSV(`alerts_${_range}.csv`, toCSV(['Severity', 'Status', 'Count'], _data.alert_summary.map(a => [a.severity, a.status, a.count])));
            }
        };
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[Reports]', e); }
}

function loading() {
    return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading reports...</span></div>';
}
