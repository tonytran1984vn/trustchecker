/** Compliance Dashboard — Full KPI + Gap Analysis + Quick Actions */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';
import { navigate } from '../../core/router.js';

export function renderPage() {
  const s = State._complianceData?.stats || {};
  const gaps = State._complianceData?.gaps || [];
  const report = State._complianceData?.report || {};

  const score = s.compliance_score ?? 0;
  const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield', 28)} Compliance Dashboard</h1>
      <div class="sa-title-actions">
        <button class="sa-btn sa-btn-sm" onclick="window._compExportReport()">📄 Export Report</button>
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="window._compRunSweep()">🧹 Run Retention Sweep</button>
      </div>
    </div>

    <div class="sa-metrics-row">
      ${_m('Compliance Score', score + '%', s.status === 'compliant' ? 'Compliant' : 'Needs Attention', scoreColor, 'shield')}
      ${_m('Active Policies', s.active_policies ?? 0, `of ${s.total_policies ?? 0} total`, 'blue', 'fileText')}
      ${_m('GDPR Requests', (s.gdpr?.exports ?? 0) + (s.gdpr?.deletions ?? 0), `${s.gdpr?.exports ?? 0} exports · ${s.gdpr?.deletions ?? 0} deletions`, 'purple', 'users')}
      ${_m('Audit Entries', s.audit_entries ?? 0, '', 'slate', 'scroll')}
      ${_m('Frameworks', Array.isArray(s.frameworks) ? new Set(s.frameworks.map(f => f.framework)).size : (s.frameworks ?? 0), 'monitored', 'teal', 'globe')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('alertTriangle', 18)} Compliance Gaps (${gaps.length})</h3>
        ${gaps.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">✅ No compliance gaps detected</p>' : `
        <div style="max-height:320px;overflow-y:auto">
          ${gaps.map(g => `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border-light)">
            <span class="sa-status-pill sa-pill-${g.severity === 'critical' ? 'red' : g.severity === 'high' ? 'orange' : 'yellow'}" style="min-width:70px;text-align:center">${g.severity || 'medium'}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.82rem">${g.framework || g.name || '—'}</div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">${g.description || g.gap || '—'}</div>
            </div>
            <span style="font-size:0.72rem;color:var(--text-secondary)">${g.readiness || '—'}</span>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('activity', 18)} Quick Navigator</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
          ${_nav('User Activity', 'compliance-user-activity', 'search')}
          ${_nav('System Changes', 'compliance-system-changes', 'scroll')}
          ${_nav('Data Retention', 'compliance-retention', 'database')}
          ${_nav('GDPR / Privacy', 'compliance-privacy-requests', 'lock')}
          ${_nav('Violation Log', 'compliance-violation-log', 'alertTriangle')}
          ${_nav('Audit Report', 'compliance-audit-report', 'fileText')}
          ${_nav('SoD Matrix', 'compliance-sod-matrix', 'shield')}
          ${_nav('Regulatory Export', 'compliance-regulatory-export', 'download')}
        </div>
      </div>
    </div>

    ${report.compliance_status ? `
    <div class="sa-card" style="margin-top:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('checkCircle', 18)} GDPR Compliance Areas</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem">
        ${Object.entries(report.compliance_status || {}).map(([k, v]) => `
          <div style="padding:0.75rem;border-radius:8px;background:var(--bg-secondary);display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.1rem">${v === 'compliant' ? '✅' : v === 'monitoring_active' ? '🔍' : '⚠️'}</span>
            <div>
              <div style="font-weight:600;font-size:0.78rem">${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${v}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function _m(l, v, s, c, i) {
  return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`;
}

function _nav(label, page, i) {
  return `<button class="sa-btn sa-btn-outline" style="justify-content:flex-start;gap:0.5rem;font-size:0.78rem" onclick="window.navigateTo('${page}')">${icon(i, 16)} ${label}</button>`;
}

export function initPage() {
  window._compExportReport = async () => {
    try {
      const data = await API.get('/compliance/report');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      window.showToast?.('📄 Report exported', 'success');
    } catch (e) { window.showToast?.('❌ Export failed: ' + e.message, 'error'); }
  };

  window._compRunSweep = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = '_comp_sweep_modal';
    modal.innerHTML = `<div class="modal-card" style="max-width:380px;padding:1.5rem;border-radius:12px;background:var(--bg-primary);box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 0.5rem">🧹 Run Retention Sweep</h3>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">This will archive/delete old records based on all active retention policies.</p>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end">
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="document.getElementById('_comp_sweep_modal')?.remove()">Cancel</button>
        <button class="sa-btn sa-btn-sm" onclick="window._compDoSweep()">Execute</button>
      </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  };

  window._compDoSweep = async () => {
    document.getElementById('_comp_sweep_modal')?.remove();
    try {
      const result = await API.post('/compliance/policies/execute');
      window.showToast?.(`✅ Sweep: ${result.executed} policies executed`, 'success');
      window.navigateTo?.('compliance-dashboard');
    } catch (e) { window.showToast?.('❌ Sweep failed: ' + e.message, 'error'); }
  };
}

