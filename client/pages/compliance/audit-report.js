/** Compliance – Audit Report — Full compliance report with GDPR sections */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const { report = {}, stats = {} } = State._complianceReport || {};
  const areas = report.compliance_status || {};

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('fileText', 28)} Compliance Audit Report</h1>
      <div class="sa-title-actions">
        <button class="sa-btn sa-btn-sm" onclick="window._downloadAuditReport()">📥 Download Report</button>
      </div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Report Type', report.report_type || 'Compliance Report', '', 'blue', 'fileText')}
      ${_m('Total Audit', stats.total || 0, 'entries', 'purple', 'scroll')}
      ${_m("Today's Activity", stats.today || 0, 'entries', 'teal', 'clock')}
      ${_m('Users', report.total_users || 0, `${report.consented_users || 0} consented`, 'green', 'users')}
    </div>

    ${Object.keys(areas).length > 0 ? `<div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('checkCircle', 18)} Compliance Areas Status</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem">
        ${Object.entries(areas).map(([k, v]) => {
    const statusColor = v === 'compliant' ? 'green' : v === 'monitoring_active' ? 'blue' : v === 'needs_attention' ? 'orange' : 'red';
    return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent-${statusColor},#ccc)">
            <span style="font-size:1.1rem">${v === 'compliant' ? '✅' : v === 'monitoring_active' ? '🔍' : '⚠️'}</span>
            <div>
              <div style="font-weight:600;font-size:0.78rem">${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${v.replace(/_/g, ' ')}</div>
            </div>
          </div>`;
  }).join('')}
      </div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('activity', 18)} Top Actions by Volume</h3>
        ${(stats.by_action || []).length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No audit action stats available</p>' : `
        <div style="display:grid;gap:0.4rem">
          ${(stats.by_action || []).slice(0, 10).map(a => {
    const max = stats.by_action[0]?.count || 1;
    const pct = Math.round((a.count / max) * 100);
    return `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem">
              <span class="sa-code" style="min-width:120px;font-size:0.7rem">${a.action || '—'}</span>
              <div style="flex:1;height:18px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:var(--accent-blue,#3b82f6);border-radius:4px;transition:width 0.3s"></div>
              </div>
              <span style="font-weight:600;min-width:40px;text-align:right">${a.count}</span>
            </div>`;
  }).join('')}
        </div>`}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('shield', 18)} Security Controls</h3>
        <div style="display:grid;gap:0.5rem">
          ${_ctrl('Password Hashing', 'bcrypt (12 rounds)', true)}
          ${_ctrl('Session Management', 'JWT + refresh tokens', true)}
          ${_ctrl('MFA Support', 'TOTP + Passkeys', true)}
          ${_ctrl('Audit Trail', 'Immutable chain', true)}
          ${_ctrl('Encryption', 'SHA-256 seals', true)}
          ${_ctrl('Rate Limiting', 'Per-route limits', true)}
        </div>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
function _ctrl(name, desc, ok) { return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:var(--bg-secondary);border-radius:6px"><span>${ok ? '✅' : '❌'}</span><div style="flex:1"><div style="font-weight:600;font-size:0.78rem">${name}</div><div style="font-size:0.68rem;color:var(--text-secondary)">${desc}</div></div></div>`; }

export function initPage() {
  window._downloadAuditReport = async () => {
    try {
      const data = await API.get('/compliance/report');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Download failed: ' + e.message); }
  };
}
