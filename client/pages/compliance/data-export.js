/** Compliance – Data Export (GDPR Right of Access) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const data = State._gdprExport || {};
  const hasData = !!data.user_profile;

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('download', 28)} GDPR Data Export</h1>
      <div class="sa-title-actions">
        <button class="sa-btn sa-btn-sm" onclick="window._gdprDownload()">📥 Download My Data</button>
      </div>
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem;background:linear-gradient(135deg,rgba(59,130,246,0.05),rgba(99,102,241,0.05));border:1px solid rgba(59,130,246,0.15)">
      <div style="display:flex;align-items:center;gap:0.75rem">
        ${icon('shield', 24)}
        <div>
          <div style="font-weight:700;font-size:0.88rem">GDPR Right of Access (Article 15)</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">You have the right to access all personal data we hold about you. Click "Download My Data" to export everything.</div>
        </div>
      </div>
    </div>

    ${!hasData ? '<div class="sa-card"><p style="color:var(--text-secondary);text-align:center;padding:2rem">Click "Download My Data" to generate your data export.</p></div>' : `

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Export Type', data.export_type || 'DSAR', '', 'blue', 'fileText')}
      ${_m('Exported At', data.exported_at ? new Date(data.exported_at).toLocaleDateString() : '—', '', 'teal', 'clock')}
      ${_m('Controller', data.data_controller || 'TrustChecker', '', 'purple', 'building')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('users', 18)} User Profile</h3>
        ${data.user_profile ? `<table class="sa-table"><tbody>
          ${Object.entries(data.user_profile).map(([k, v]) => `<tr><td style="font-weight:600;text-transform:capitalize;width:40%">${k.replace(/_/g, ' ')}</td><td style="font-size:0.78rem">${v || '—'}</td></tr>`).join('')}
        </tbody></table>` : '<p style="color:var(--text-secondary)">No profile data</p>'}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('activity', 18)} Data Categories</h3>
        <div style="display:grid;gap:0.5rem">
          ${_cat('Audit Log', data.audit_log?.length || 0, 'scroll')}
          ${_cat('Scan History', data.scan_history?.length || 0, 'search')}
          ${_cat('Support Tickets', data.support_tickets?.length || 0, 'messageSquare')}
          ${_cat('Billing', data.billing?.invoices?.length || 0, 'creditCard')}
          ${_cat('Sessions', data.sessions?.length || 0, 'monitor')}
        </div>
      </div>
    </div>`}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
function _cat(name, count, i) { return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem;background:var(--bg-secondary);border-radius:6px">${icon(i, 16)}<span style="flex:1;font-size:0.78rem;font-weight:600">${name}</span><span class="sa-code" style="font-size:0.72rem">${count} records</span></div>`; }

export function initPage() {
  window._gdprDownload = async () => {
    try {
      const data = await API.get('/compliance/gdpr/export');
      State._gdprExport = data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `gdpr-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      window.showToast?.('📥 GDPR data exported', 'success');
      window.renderCurrentPage?.();
    } catch (e) { window.showToast?.('❌ Data export failed: ' + e.message, 'error'); }
  };
}
