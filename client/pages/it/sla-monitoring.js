/**
 * IT – SLA Monitoring (Uptime, Response Time, Incidents, Escalation)
 */
import { icon } from '../../core/icons.js';

const SLA_TARGETS = [
    { metric: 'Platform Uptime', target: '99.95%', actual: '99.97%', period: 'Last 30 days', status: 'met', trend: '↑' },
    { metric: 'API Response (P50)', target: '< 100ms', actual: '65ms', period: 'Last 7 days', status: 'met', trend: '↓' },
    { metric: 'API Response (P99)', target: '< 500ms', actual: '340ms', period: 'Last 7 days', status: 'met', trend: '↓' },
    { metric: 'Incident Response', target: '< 15 min', actual: '8 min', period: 'Avg last 30 days', status: 'met', trend: '↓' },
    { metric: 'Incident Resolution', target: '< 4 hours', actual: '2.1h', period: 'Avg last 30 days', status: 'met', trend: '↓' },
    { metric: 'Scheduled Downtime', target: '< 4h/month', actual: '1.5h', period: 'February 2026', status: 'met', trend: '—' },
];

const INCIDENTS = [
    { id: 'INC-048', severity: 'P2', title: 'Salesforce sync timeout', start: '2026-02-19 16:30', duration: '45m', status: 'resolved', impact: 'Integration delay', escalated: false },
    { id: 'INC-047', severity: 'P3', title: 'Webhook delivery degradation', start: '2026-02-18 09:15', duration: '2h 10m', status: 'resolved', impact: 'Analytics webhook delayed', escalated: false },
    { id: 'INC-046', severity: 'P1', title: 'Database failover event', start: '2026-02-10 03:42', duration: '12m', status: 'resolved', impact: 'Brief read-only mode', escalated: true },
];

const ESCALATION = [
    { level: 'L1 — On-Call Engineer', time: '0–15 min', channel: 'PagerDuty + Slack #incidents', contact: 'oncall@company.com' },
    { level: 'L2 — Engineering Lead', time: '15–60 min', channel: 'Phone + Slack', contact: 'eng-lead@company.com' },
    { level: 'L3 — VP Engineering', time: '1–4 hours', channel: 'Phone + SMS', contact: 'vp-eng@company.com' },
    { level: 'L4 — CTO + Executive', time: '> 4 hours (P1)', channel: 'War Room (Zoom)', contact: 'cto@company.com' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('dashboard', 28)} SLA Monitoring</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export SLA Report</button></div></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 SLA Performance</h3>
        <table class="sa-table"><thead><tr><th>Metric</th><th>Target</th><th>Actual</th><th>Period</th><th>Trend</th><th>Status</th></tr></thead><tbody>
          ${SLA_TARGETS.map(s => `<tr>
            <td><strong>${s.metric}</strong></td>
            <td class="sa-code">${s.target}</td>
            <td class="sa-code" style="color:#22c55e;font-weight:600">${s.actual}</td>
            <td style="font-size:0.82rem">${s.period}</td>
            <td style="font-size:1.1rem">${s.trend}</td>
            <td><span class="sa-status-pill sa-pill-${s.status === 'met' ? 'green' : 'red'}">${s.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🚨 Recent Incidents</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Severity</th><th>Title</th><th>Start</th><th>Duration</th><th>Impact</th><th>Escalated</th><th>Status</th></tr></thead><tbody>
          ${INCIDENTS.map(i => `<tr class="${i.severity === 'P1' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${i.id}</td>
            <td><span class="sa-status-pill sa-pill-${i.severity === 'P1' ? 'red' : i.severity === 'P2' ? 'orange' : 'blue'}">${i.severity}</span></td>
            <td><strong>${i.title}</strong></td>
            <td class="sa-code" style="font-size:0.78rem">${i.start}</td>
            <td>${i.duration}</td>
            <td style="font-size:0.82rem">${i.impact}</td>
            <td>${i.escalated ? '<span style="color:#ef4444">Yes</span>' : 'No'}</td>
            <td><span class="sa-status-pill sa-pill-green">${i.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Report Incident</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div class="sa-card">
          <h3>📈 Escalation Path</h3>
          <table class="sa-table"><thead><tr><th>Level</th><th>Timeframe</th><th>Channel</th><th>Contact</th></tr></thead><tbody>
            ${ESCALATION.map(e => `<tr><td><strong>${e.level}</strong></td><td>${e.time}</td><td style="font-size:0.82rem">${e.channel}</td><td class="sa-code" style="font-size:0.78rem">${e.contact}</td></tr>`).join('')}
          </tbody></table>
        </div>

        <div class="sa-card">
          <h3>📡 Status Page Configuration</h3>
          <div class="sa-threshold-list">
            ${th('Public URL', 'https://status.trustchecker.io')}
            ${th('Current Status', 'All Systems Operational <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>')}
            ${th('Auto-publish', 'P1/P2 incidents auto-publish')}
            ${th('Subscriber Count', '142 email subscribers')}
            ${th('Update Frequency', 'Every 15 min during incident')}
          </div>
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:280px;text-align:center;font-size:0.78rem" /></div></div>`; }
