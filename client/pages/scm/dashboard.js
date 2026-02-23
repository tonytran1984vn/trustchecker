/**
 * TrustChecker – Scm Dashboard Page
 */
import { State, render } from '../../core/state.js';

export function renderPage() {
  const d = State.scmDashboard;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading supply chain data...</span></div>';

  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📦</div><div class="stat-value">${d.total_batches}</div><div class="stat-label">Batches</div></div>
      <div class="stat-card violet"><div class="stat-icon">🔗</div><div class="stat-value">${d.total_events}</div><div class="stat-label">SCM Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">🤝</div><div class="stat-value">${d.total_partners}</div><div class="stat-label">Partners</div></div>
      <div class="stat-card amber"><div class="stat-icon">🚚</div><div class="stat-value">${d.active_shipments}</div><div class="stat-label">Active Shipments</div></div>
      <div class="stat-card ${d.open_leaks > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">🔍</div><div class="stat-value">${d.open_leaks}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card ${d.sla_violations > 0 ? 'amber' : 'emerald'}"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${d.sla_violations}</div><div class="stat-label">SLA Violations</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Events by Type</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(d.events_by_type || []).map(e => `
            <div class="factor-bar-container">
              <div class="factor-bar-label"><span><span class="badge valid">${e.event_type}</span></span><span>${e.count}</span></div>
              <div class="factor-bar"><div class="fill" style="width:${Math.min(100, e.count / Math.max(...d.events_by_type.map(x => x.count)) * 100)}%;background:var(--cyan)"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📡 Recent SCM Events</div></div>
        <div class="table-container">
          <table>
            <tr><th>Type</th><th>Product</th><th>Partner</th></tr>
            ${(d.recent_events || []).slice(0, 8).map(e => `
              <tr>
                <td><span class="badge valid">${e.event_type}</span></td>
                <td style="font-size:0.78rem">${e.product_name || '—'}</td>
                <td style="font-size:0.78rem">${e.partner_name || '—'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📈 SCM Health</div></div>
      <div class="scm-health">
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--emerald)">${d.avg_partner_trust}</div>
          <div class="scm-health-label">Avg Partner Trust</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--cyan)">${d.total_shipments}</div>
          <div class="scm-health-label">Total Shipments</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:${d.open_leaks > 5 ? 'var(--rose)' : 'var(--emerald)'}">${d.open_leaks > 0 ? '<span class="status-icon status-warn" aria-label="Warning">!</span>' : '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>'}</div>
          <div class="scm-health-label">${d.open_leaks > 0 ? 'Leaks Detected' : 'No Leaks'}</div>
        </div>
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

