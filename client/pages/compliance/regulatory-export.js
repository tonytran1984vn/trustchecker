/** Compliance – Regulatory Export — Export compliance data for regulators */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const { report = {}, frameworks = [] } = State._regtechData || {};
  const fws = report.frameworks_checked || report.applicable_frameworks || [];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('download', 28)} Regulatory Export</h1>
      <div class="sa-title-actions">
        <button class="sa-btn sa-btn-sm" onclick="window._regExportJSON()">📄 Export JSON</button>
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="window._regExportCSV()">📊 Export CSV</button>
      </div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Overall Readiness', (report.overall_readiness_pct || 0) + '%', '', (report.overall_readiness_pct || 0) >= 80 ? 'green' : 'orange', 'shield')}
      ${_m('Frameworks', fws.length || frameworks.length, 'assessed', 'blue', 'fileText')}
      ${_m('Gaps', report.gaps?.length || 0, '', (report.gaps?.length || 0) > 0 ? 'red' : 'green', 'alertTriangle')}
      ${_m('Generated', report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'Now', '', 'slate', 'clock')}
    </div>

    ${fws.length > 0 ? `<div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('shield', 18)} Framework Assessment</h3>
      <table class="sa-table"><thead><tr><th>Framework</th><th>Region</th><th>Requirements</th><th>Readiness</th><th>Status</th></tr></thead>
      <tbody>${fws.map(f => {
    const pct = f.readiness_pct || f.readiness || 0;
    return `<tr>
        <td style="font-weight:600;font-size:0.78rem">${f.name || f.framework || '—'}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${f.region || '—'}</span></td>
        <td style="font-size:0.78rem">${f.requirements?.length || f.total_requirements || '—'}</td>
        <td><div style="display:flex;align-items:center;gap:0.5rem">
          <div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--accent-${pct >= 80 ? 'green' : pct >= 50 ? 'orange' : 'red'},#ccc);border-radius:3px"></div></div>
          <span style="font-size:0.72rem;font-weight:600;min-width:35px">${pct}%</span>
        </div></td>
        <td><span class="sa-status-pill sa-pill-${pct >= 80 ? 'green' : pct >= 50 ? 'orange' : 'red'}" style="font-size:0.68rem">${pct >= 80 ? 'Ready' : pct >= 50 ? 'Partial' : 'Gap'}</span></td>
      </tr>`;
  }).join('')}</tbody></table>
    </div>` : ''}

    ${frameworks.length > 0 && fws.length === 0 ? `<div class="sa-card">
      <h3 style="margin-bottom:1rem">${icon('globe', 18)} Available Frameworks</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem">
        ${frameworks.map(f => `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:600;font-size:0.78rem">${f.name || f.id || '—'}</div>
          <div style="font-size:0.68rem;color:var(--text-secondary)">${f.region || '—'} · ${f.requirements?.length || 0} requirements</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }

export function initPage() {
  window._regExportJSON = async () => {
    try {
      const data = await API.get('/compliance-regtech/report');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `regulatory-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      window.showToast?.('📄 Regulatory JSON exported', 'success');
    } catch (e) { window.showToast?.('❌ Export failed: ' + e.message, 'error'); }
  };

  window._regExportCSV = async () => {
    try {
      const resp = await fetch(API.base + '/audit-log/export', { credentials: 'include' });
      if (!resp.ok) throw new Error('CSV export failed');
      const blob = await resp.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `regulatory-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      window.showToast?.('📊 CSV exported', 'success');
    } catch (e) { window.showToast?.('❌ CSV export failed: ' + e.message, 'error'); }
  };
}
