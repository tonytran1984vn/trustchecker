/** Compliance – Data Retention Policy Manager */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const data = State._complianceRetention || {};
  const policies = data.policies || [];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('database', 28)} Data Retention</h1>
      <div class="sa-title-actions">
        <button class="sa-btn sa-btn-sm" onclick="window._retAddPolicy()">➕ Add Policy</button>
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="window._retExecuteSweep()">🧹 Execute Sweep</button>
      </div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Total Policies', policies.length, '', 'blue', 'fileText')}
      ${_m('Active', policies.filter(p => p.is_active !== false && p.is_active !== 0).length, '', 'green', 'checkCircle')}
      ${_m('Archive', policies.filter(p => p.action === 'archive').length, '', 'orange', 'archive')}
      ${_m('Delete', policies.filter(p => p.action === 'delete').length, '', 'red', 'trash')}
    </div>

    <div class="sa-card">
      <h3 style="margin-bottom:1rem">Retention Policies</h3>
      ${policies.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No retention policies configured. Click "Add Policy" to create one.</p>' : `
      <table class="sa-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Run</th><th>Records</th></tr></thead>
      <tbody>${policies.map(p => `<tr>
        <td style="font-weight:600;font-size:0.78rem"><span class="sa-code">${p.table_name || '—'}</span></td>
        <td style="font-size:0.78rem">${p.retention_days || '—'} days</td>
        <td><span class="sa-status-pill sa-pill-${p.action === 'delete' ? 'red' : 'orange'}" style="font-size:0.7rem">${p.action || 'archive'}</span></td>
        <td>${(p.is_active !== false && p.is_active !== 0) ? '✅' : '❌'}</td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${p.last_run ? new Date(p.last_run).toLocaleString() : 'Never'}</td>
        <td style="font-size:0.78rem">${p.records_affected ?? '—'}</td>
      </tr>`).join('')}</tbody></table>`}
    </div>

    <div class="sa-card" style="margin-top:1rem">
      <h3 style="margin-bottom:0.75rem">${icon('info', 18)} Retention Guidelines</h3>
      <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.6">
        <p><strong>Archive</strong> — Records are marked as 'archived' but remain in the database for audit purposes.</p>
        <p><strong>Delete</strong> — Records are permanently removed. Use with caution — some data may be subject to legal hold requirements.</p>
        <p style="margin-top:0.5rem">Allowed tables: <code>scan_events</code>, <code>audit_log</code>, <code>fraud_alerts</code>, <code>support_tickets</code>, <code>usage_metrics</code>, <code>webhook_events</code>, <code>supply_chain_events</code>, <code>leak_alerts</code>, <code>anomaly_detections</code>, <code>ticket_messages</code></p>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }

export function initPage() {
  window._retAddPolicy = async () => {
    const validTables = ['scan_events', 'audit_log', 'fraud_alerts', 'support_tickets', 'usage_metrics', 'webhook_events', 'supply_chain_events', 'leak_alerts', 'anomaly_detections', 'ticket_messages'];
    const table = prompt(`Table name:\n\n${validTables.join('\n')}`);
    if (!table || !validTables.includes(table)) { alert('Invalid table name. Choose from: ' + validTables.join(', ')); return; }
    const days = parseInt(prompt('Retention days (e.g., 365):'));
    if (!days || days < 1) { alert('Invalid retention days'); return; }
    const action = (prompt('Action — "archive" or "delete":') || 'archive').toLowerCase();
    if (!['archive', 'delete'].includes(action)) { alert('Action must be "archive" or "delete"'); return; }
    try {
      await API.post('/compliance/policies', { table_name: table, retention_days: days, action });
      alert('✅ Retention policy created');
      window.navigateTo('compliance-retention');
    } catch (e) { alert('Failed to create policy: ' + e.message); }
  };

  window._retExecuteSweep = async () => {
    if (!confirm('Execute retention sweep now?\nThis will process all active policies.')) return;
    try {
      const result = await API.post('/compliance/policies/execute');
      alert(`Sweep complete: ${result.executed} policies executed.\n${result.results?.map(r => `${r.table}: ${r.affected} records ${r.action}ed (${r.status})`).join('\n') || ''}`);
      window.navigateTo('compliance-retention');
    } catch (e) { alert('Sweep failed: ' + e.message); }
  };
}
