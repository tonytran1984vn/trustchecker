/**
 * Compliance – Dashboard (Landing)
 * KPIs + control status
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('dashboard', 28)} Compliance Dashboard</h1></div>

      <section class="sa-section">
        <h2 class="sa-section-title">Compliance KPIs</h2>
        <div class="sa-metrics-row">
          ${kpi('Audit Findings (Open)', '7', '3 high priority', 'orange', 'alertTriangle')}
          ${kpi('Policy Violations', '4', '+1 this week', 'red', 'alert')}
          ${kpi('Unresolved High-Risk Cases', '2', 'Pending CEO review', 'red', 'shield')}
          ${kpi('Access Violations', '3', '1 privilege escalation', 'orange', 'lock')}
          ${kpi('Data Export Events', '18', '5 bulk downloads', 'blue', 'scroll')}
          ${kpi('Overdue Reviews', '2', 'Role review + policy', 'orange', 'clock')}
        </div>
      </section>

      <section class="sa-section">
        <h2 class="sa-section-title">Control Status</h2>
        <div class="sa-grid-2col">
          <div class="sa-card">
            <h3>🔐 Security Controls</h3>
            ${control('MFA Enforcement', '94%', 'green', '3 users without MFA')}
            ${control('Role Review', 'Overdue', 'red', 'Last reviewed: 45 days ago')}
            ${control('Password Policy', '100%', 'green', 'All users compliant')}
            ${control('Session Timeout', 'Active', 'green', '30 min idle timeout')}
          </div>
          <div class="sa-card">
            <h3><span class="status-icon status-warn" aria-label="Warning">!</span> Recent Control Events</h3>
            ${control('Privilege Escalation', '1 event', 'red', 'admin@co → super_admin attempt')}
            ${control('Suspicious Admin Action', '0', 'green', 'No anomalies detected')}
            ${control('Failed Login Attempts', '12', 'orange', '3 accounts locked')}
            ${control('After-Hours Access', '2', 'orange', '2 logins after 11pm')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function kpi(label, value, sub, color, iconName) {
    return `<div class="sa-metric-card sa-metric-${color}"><div class="sa-metric-icon">${icon(iconName, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${value}</div><div class="sa-metric-label">${label}</div><div class="sa-metric-sub">${sub}</div></div></div>`;
}

function control(name, value, status, detail) {
    const c = status === 'green' ? '#22c55e' : status === 'red' ? '#ef4444' : '#f59e0b';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><div><strong style="font-size:0.85rem">${name}</strong><div style="font-size:0.72rem;color:var(--text-secondary)">${detail}</div></div><span style="font-weight:700;color:${c};font-size:0.82rem">${value}</span></div>`;
}
