/**
 * Executive – Overview (CEO Decision Intelligence Dashboard)
 * ═════════════════════════════════════════════════════════
 * Decision-Ready Metrics: WHAT → SO WHAT → NOW WHAT
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('star', 28)} CEO Decision Intelligence</h1>
        <div class="exec-timestamp">Live · ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</div>
      </div>

      <!-- Decision Cards: What → So What → Now What -->
      <section class="exec-section">
        <h2 class="exec-section-title">Decision Metrics</h2>
        <div class="exec-grid-2">
          ${decisionCard(
    'Revenue Protection', '$2.4M', '+18%', 'up',
    'Counterfeit interception saved $2.4M in brand damage this quarter.',
    'Expand QR coverage to Thailand market (est. +$800K protection).',
    'green'
  )}
          ${decisionCard(
    'Supply Chain Risk', '0.23', '−0.08', 'down-good',
    'Risk index dropped 26% after Cambodia distributor removal.',
    'Approve Jakarta distributor audit ($12K) to maintain downtrend.',
    'green'
  )}
          ${decisionCard(
    'Fraud Detection Rate', '94.7%', '+2.3%', 'up',
    'AI model v3 catching 94.7% of counterfeit scans vs 92.4% last quarter.',
    'No action needed. Next model upgrade scheduled for Q2.',
    'green'
  )}
          ${decisionCard(
    'Geo Anomaly Alert', '7 regions', '+2', 'up-bad',
    'Cambodia (+340%) and Laos (+180%) show unusual scan patterns. Possible gray market.',
    'DECISION REQUIRED: Authorize field investigation team ($25K budget).',
    'red'
  )}
        </div>
      </section>

      <!-- Business KPIs -->
      <section class="exec-section">
        <h2 class="exec-section-title">Business Performance</h2>
        <div class="exec-kpi-grid">
          ${kpi('Products in Market', '1,247', '+12%', 'up', 'products')}
          ${kpi('QR Verification Rate', '94.7%', '+2.3%', 'up', 'check')}
          ${kpi('Brand Protection Score', '87/100', '+5 pts', 'up', 'shield')}
          ${kpi('Counterfeit Incidents', '3', '−40%', 'down-good', 'alert')}
          ${kpi('Market Penetration', '72%', '+8%', 'up', 'globe')}
          ${kpi('Channel Coverage', '89%', '+4%', 'up', 'network')}
          ${kpi('Revenue Protected', '$2.4M', '+18%', 'up', 'creditCard')}
          ${kpi('Regional Risk Index', '0.23', '−0.08', 'down-good', 'target')}
        </div>
      </section>

      <!-- Governance Scorecard -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('shield', 20)} Governance Scorecard</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Compliance Health</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
              ${govMetric('SoD Violations', '0', 'green')}
              ${govMetric('Self-Approval Flags', '2', 'orange')}
              ${govMetric('Pending Approvals', '3', 'blue')}
              ${govMetric('Policy Violations (30d)', '1', 'green')}
              ${govMetric('Audit Chain Integrity', '100%', 'green')}
              ${govMetric('SLA Compliance', '99.97%', 'green')}
            </div>
          </div>
          <div class="exec-card">
            <h3>Security Posture</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
              ${govMetric('MFA Adoption', '98%', 'green')}
              ${govMetric('Untrusted Devices', '1', 'orange')}
              ${govMetric('Failed Logins (24h)', '4', 'green')}
              ${govMetric('ABAC Denials (24h)', '18', 'blue')}
              ${govMetric('Key Rotation', 'On schedule', 'green')}
              ${govMetric('Open Incidents', '0', 'green')}
            </div>
          </div>
        </div>
      </section>

      <!-- Trend Intelligence -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Trend Intelligence</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Scan Growth (30d)</h3>
            <div class="exec-trend-row">
              <div class="exec-trend-value">+23.4%</div>
              <div class="exec-trend-spark">▂▃▄▅▆▇█▇▆▇█</div>
            </div>
            <div class="exec-trend-sub">142K total scans · 4.7K avg/day</div>
          </div>
          <div class="exec-card">
            <h3>Fraud Trend (30d)</h3>
            <div class="exec-trend-row">
              <div class="exec-trend-value exec-trend-good">−12.8%</div>
              <div class="exec-trend-spark">█▇▆▅▄▃▃▂▂▂▁</div>
            </div>
            <div class="exec-trend-sub">23 incidents · Down from 37 last month</div>
          </div>
          <div class="exec-card">
            <h3>Integration Health</h3>
            <div class="exec-trend-row">
              <div class="exec-trend-value">7/8</div>
              <div class="exec-trend-spark">████████████</div>
            </div>
            <div class="exec-trend-sub">1 connector degraded (WMS) · 28K events/day</div>
          </div>
          <div class="exec-card">
            <h3>Blockchain Verified</h3>
            <div class="exec-trend-row">
              <div class="exec-trend-value">99.9%</div>
              <div class="exec-trend-spark">████████████</div>
            </div>
            <div class="exec-trend-sub">21K on-chain txns · VeChain + Polygon</div>
          </div>
        </div>
      </section>

      <!-- Executive Alerts -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('alertTriangle', 20)} Executive Alerts</h2>
        <div class="exec-alerts">
          ${alertItem('CRITICAL', 'Counterfeit batch detected in Thai market', '2h ago', 'BATCH-2026-0138 · Bangkok region · 3 retailers affected', 'DECISION: Approve batch recall + notify distributor')}
          ${alertItem('HIGH', 'Unusual scan surge from Cambodia (+340%)', '5h ago', 'Phnom Penh district · Potential gray market activity', 'DECISION: Authorize field investigation ($25K)')}
          ${alertItem('MEDIUM', 'WMS integration degraded for 35 minutes', '1h ago', 'Warehouse sync delayed · Ops team investigating', 'INFO: Auto-escalated to IT · No action needed')}
        </div>
      </section>
    </div>
  `;
}

function decisionCard(title, value, change, direction, soWhat, nowWhat, color) {
  const isGood = direction === 'up' || direction === 'down-good';
  const borderColor = color === 'red' ? '#ef4444' : '#22c55e';
  return `
    <div class="exec-card" style="border-left:4px solid ${borderColor}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <h3 style="margin:0">${title}</h3>
        <div style="text-align:right">
          <span style="font-size:1.5rem;font-weight:800">${value}</span>
          <span class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}" style="margin-left:0.5rem">${change}</span>
        </div>
      </div>
      <div style="background:rgba(99,102,241,0.04);border-radius:6px;padding:0.6rem;margin-bottom:0.4rem;font-size:0.82rem">
        <strong style="color:var(--text-secondary)">SO WHAT:</strong> ${soWhat}
      </div>
      <div style="background:${color === 'red' ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)'};border-radius:6px;padding:0.6rem;font-size:0.82rem;font-weight:500">
        <strong style="color:${borderColor}">NOW WHAT:</strong> ${nowWhat}
      </div>
    </div>`;
}

function kpi(label, value, change, direction, iconName) {
  const isGood = direction === 'up' || direction === 'down-good';
  return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon">${icon(iconName, 20)}</div>
      <div class="exec-kpi-value">${value}</div>
      <div class="exec-kpi-label">${label}</div>
      <div class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}">${change}</div>
    </div>
  `;
}

function govMetric(label, value, color) {
  const bg = color === 'green' ? 'rgba(34,197,94,0.06)' : color === 'orange' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.06)';
  const textColor = color === 'green' ? '#22c55e' : color === 'orange' ? '#f59e0b' : '#3b82f6';
  return `<div style="background:${bg};border-radius:6px;padding:0.5rem;text-align:center">
      <div style="font-size:1.1rem;font-weight:700;color:${textColor}">${value}</div>
      <div style="font-size:0.68rem;color:var(--text-secondary)">${label}</div>
    </div>`;
}

function alertItem(severity, title, time, detail, decision) {
  const cls = severity === 'CRITICAL' ? 'exec-alert-critical' : severity === 'HIGH' ? 'exec-alert-high' : 'exec-alert-medium';
  return `
    <div class="exec-alert ${cls}">
      <div class="exec-alert-header">
        <span class="exec-alert-severity">${severity}</span>
        <span class="exec-alert-time">${time}</span>
      </div>
      <div class="exec-alert-title">${title}</div>
      <div class="exec-alert-detail">${detail}</div>
      <div style="margin-top:0.5rem;padding:0.4rem 0.6rem;background:rgba(99,102,241,0.06);border-radius:4px;font-size:0.78rem;font-weight:500;color:var(--text-primary)">${decision}</div>
    </div>
  `;
}
