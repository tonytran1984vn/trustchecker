/** Compliance – Risk Policy — Risk management policies & controls */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const retPolicies = State._compliancePolicies?.policies || [];
  const gaps = State._complianceGaps?.gaps || [];

  // Built-in risk management controls
  const riskControls = [
    { name: 'Real-Time Fraud Detection', type: 'Detection', description: 'ML-based anomaly scoring on every QR scan — velocity checks, geo-fencing, device fingerprint analysis', status: 'active', severity: 'critical' },
    { name: 'Supply Chain Risk Scoring', type: 'Assessment', description: 'Partner risk scoring based on SLA compliance, delivery performance, and verification history', status: 'active', severity: 'high' },
    { name: 'Gray Market Detection', type: 'Detection', description: 'Unauthorized distribution monitoring via scan pattern analysis and geographic anomalies', status: 'active', severity: 'high' },
    { name: 'Data Breach Monitoring', type: 'Monitoring', description: 'Continuous monitoring for data leaks, credential exposure, and unauthorized data access', status: 'active', severity: 'critical' },
    { name: 'Compliance Gap Analysis', type: 'Assessment', description: 'Automated gap detection against GDPR, ISO 27001, SOC 2, and regional frameworks', status: 'active', severity: 'medium' },
    { name: 'Incident Response Protocol', type: 'Response', description: 'Automated escalation workflow: alert → investigate → contain → remediate → report', status: 'active', severity: 'critical' },
    { name: 'Anomaly Detection Engine', type: 'Detection', description: 'Statistical analysis of scan volumes, access patterns, and operational metrics', status: 'active', severity: 'high' },
    { name: 'SLA Violation Monitoring', type: 'Monitoring', description: 'Real-time tracking of partner SLA breaches with automated alerting', status: 'active', severity: 'medium' },
  ];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Risk Policies</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${riskControls.length} controls</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Risk Controls', riskControls.length, 'active', 'orange', 'alertTriangle')}
      ${_m('Critical', riskControls.filter(p => p.severity === 'critical').length, 'controls', 'red', 'zap')}
      ${_m('High', riskControls.filter(p => p.severity === 'high').length, 'controls', 'orange', 'activity')}
      ${_m('Compliance Gaps', gaps.length, '', gaps.length > 0 ? 'red' : 'green', 'shield')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('shield', 18)} Risk Management Controls</h3>
      <table class="sa-table"><thead><tr><th>Control</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>${riskControls.map(p => `<tr>
        <td style="font-weight:600;font-size:0.78rem">${p.name}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${p.type}</span></td>
        <td style="font-size:0.75rem;color:var(--text-secondary);max-width:300px">${p.description}</td>
        <td><span class="sa-status-pill sa-pill-${p.severity === 'critical' ? 'red' : p.severity === 'high' ? 'orange' : 'blue'}" style="font-size:0.7rem">${p.severity}</span></td>
        <td><span class="sa-status-pill sa-pill-green">active</span></td>
      </tr>`).join('')}</tbody></table>
    </div>

    ${gaps.length > 0 ? `<div class="sa-card" style="border:1px solid rgba(239,68,68,0.2)">
      <h3 style="margin-bottom:1rem;color:var(--accent-red,#ef4444)">${icon('alertTriangle', 18)} Identified Risk Gaps (${gaps.length})</h3>
      <div style="display:grid;gap:0.5rem">
        ${gaps.map(g => `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem;background:rgba(239,68,68,0.03);border-radius:6px;border-left:3px solid var(--accent-${g.severity === 'critical' ? 'red' : 'orange'},#ccc)">
          <span class="sa-status-pill sa-pill-${g.severity === 'critical' ? 'red' : 'orange'}" style="min-width:60px;text-align:center;font-size:0.68rem">${g.severity || 'medium'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:0.78rem">${g.framework || g.name || '—'}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">${g.description || g.gap || '—'}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>` : `<div class="sa-card" style="border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.03);padding:1rem;text-align:center">
      <span style="font-size:1.2rem">✅</span> <strong>No risk gaps detected.</strong> All risk controls are operating normally.
    </div>`}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
