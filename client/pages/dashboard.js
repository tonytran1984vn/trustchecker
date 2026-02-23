/**
 * TrustChecker – Dashboard Page
 */
import { State } from '../core/state.js';
import { timeAgo, scoreColor, eventIcon } from '../utils/helpers.js';

export function renderPage() {
  const s = State.dashboardStats;
  if (!s) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading dashboard...</span></div>';

  return `
    <div class="stats-grid stagger-in">
      <div class="stat-card cyan">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Registered Products</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">📱</div>
        <div class="stat-value">${s.total_scans}</div>
        <div class="stat-label">Total Scans</div>
        <div class="stat-change up">↗ ${s.today_scans} today</div>
      </div>
      <div class="stat-card ${s.open_alerts > 0 ? 'rose' : 'emerald'}">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Open Alerts</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${s.total_blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
    </div>

    <div class="grid-2-1">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Recent Activity</div>
        </div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Result</th><th>Fraud</th><th>Trust</th><th>Time</th></tr>
            ${(s.recent_activity || []).map(a => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${a.product_name || '—'}</td>
                <td><span class="badge ${a.result}">${a.result}</span></td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${a.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(a.fraud_score * 100).toFixed(0)}%</td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(a.trust_score)}">${Math.round(a.trust_score)}</td>
                <td class="event-time">${timeAgo(a.scanned_at)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">📡 Live Events</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.78rem;color:var(--text-muted);user-select:none">
            <span>${isLiveEventsOn() ? 'On' : 'Off'}</span>
            <span onclick="toggleLiveEvents()" style="position:relative;width:36px;height:20px;display:inline-block;cursor:pointer">
              <span style="position:absolute;inset:0;background:${isLiveEventsOn() ? '#10b981' : '#cbd5e1'};border-radius:10px;transition:background 0.3s"></span>
              <span style="position:absolute;top:2px;left:${isLiveEventsOn() ? '18px' : '2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:left 0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.25)"></span>
            </span>
          </label>
        </div>
        ${isLiveEventsOn()
      ? `<div class="event-feed" id="event-feed">${renderEventFeed()}</div>`
      : `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Live event feed is off. Toggle on to monitor real-time activity.</div>`
    }
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Scan Results</div></div>
        <div class="chart-donut-wrap" id="scanDonutWrap"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Alert Severity</div></div>
        <div class="chart-bars-wrap" id="alertBarsWrap"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;background:linear-gradient(135deg,rgba(16,185,129,0.06),rgba(59,130,246,0.04));border:1px solid rgba(16,185,129,0.2)">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title" style="color:#10b981">🌱 Carbon Integrity Engine</div>
        <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('scm/carbon-credit')" style="font-size:0.72rem;color:#3b82f6;text-decoration:none;font-weight:600">Open CIE →</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:4px 0">
        <div style="text-align:center">
          <div style="font-size:26px;font-weight:800;color:#10b981">87<span style="font-size:12px;color:var(--text-muted)">/100</span></div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Integrity Score</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:26px;font-weight:800;color:#f59e0b">3</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Anomalies</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:26px;font-weight:800;color:#3b82f6">3</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Sealed CIPs</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:26px;font-weight:800;color:#8b5cf6">5</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Anchored Proofs</div>
        </div>
      </div>
    </div>
  `;
}

function renderEventFeed() {
  if (!State.events.length) return '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-text">Waiting for events...</div></div>';
  return State.events.slice(0, 20).map(ev => `
    <div class="event-item">
      <div class="event-icon">${eventIcon(ev.type)}</div>
      <div class="event-content">
        <div class="event-title">${ev.type}</div>
        <div class="event-desc">${ev.data?.product_name || ev.data?.message || ev.data?.type || JSON.stringify(ev.data || {}).substring(0, 60)}</div>
      </div>
      <div class="event-time">${ev.timestamp ? timeAgo(ev.timestamp) : 'now'}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════════
   PREMIUM CHART COMPONENTS
   ════════════════════════════════════════════════════════════════ */

const SCAN_COLORS = {
  valid: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  suspicious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  counterfeit: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  pending: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const SEV_COLORS = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  medium: { color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
  low: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
};

function buildDonut(data, total) {
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = data.map(d => {
    const pct = total > 0 ? d.count / total : 0;
    const len = pct * C;
    const arc = `<circle cx="64" cy="64" r="${R}" fill="none"
      stroke="${SCAN_COLORS[d.result]?.color || '#6b7280'}"
      stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${len - 2} ${C - len + 2}"
      stroke-dashoffset="-${offset}"
      style="transition:stroke-dasharray .6s ease,stroke-dashoffset .6s ease"/>`;
    offset += len;
    return arc;
  });

  const legend = data.map(d => {
    const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : 0;
    const c = SCAN_COLORS[d.result] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
    return `<div class="cleg-item">
      <span class="cleg-dot" style="background:${c.color}"></span>
      <span class="cleg-label">${d.result}</span>
      <span class="cleg-val">${d.count}</span>
      <span class="cleg-pct">${pct}%</span>
    </div>`;
  }).join('');

  return `
    <div class="chart-donut">
      <svg viewBox="0 0 128 128" class="donut-svg">
        <circle cx="64" cy="64" r="${R}" fill="none" stroke="var(--border)" stroke-width="11" opacity=".25"/>
        ${arcs.join('')}
      </svg>
      <div class="donut-center">
        <span class="donut-total">${total}</span>
        <span class="donut-label">scans</span>
      </div>
    </div>
    <div class="chart-legend">${legend}</div>
  `;
}

function buildBars(data) {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  return data.map(d => {
    const c = SEV_COLORS[d.severity] || { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' };
    const pct = ((d.count / maxVal) * 100).toFixed(0);
    return `
      <div class="sev-row">
        <div class="sev-header">
          <span class="sev-dot" style="background:${c.color}"></span>
          <span class="sev-name">${d.severity}</span>
          <span class="sev-count">${d.count}</span>
        </div>
        <div class="sev-track">
          <div class="sev-fill" style="width:${pct}%;background:${c.color}"></div>
        </div>
      </div>
    `;
  }).join('');
}

export function initDashboardCharts() {
  const s = State.dashboardStats;
  if (!s) return;

  // Scan donut
  const scanWrap = document.getElementById('scanDonutWrap');
  const scanData = s.scans_by_result || [];
  if (scanWrap && scanData.length) {
    const total = scanData.reduce((a, d) => a + d.count, 0);
    scanWrap.innerHTML = buildDonut(scanData, total);
  }

  // Alert severity bars
  const alertWrap = document.getElementById('alertBarsWrap');
  const alertData = s.alerts_by_severity || [];
  if (alertWrap && alertData.length) {
    alertWrap.innerHTML = buildBars(alertData);
  }
}

window.initDashboardCharts = initDashboardCharts;

// ── Live Events Toggle (default: off) ──
function isLiveEventsOn() {
  return localStorage.getItem('tc_live_events') === 'on';
}

window.toggleLiveEvents = function () {
  const next = isLiveEventsOn() ? 'off' : 'on';
  localStorage.setItem('tc_live_events', next);
  if (typeof window.render === 'function') window.render();
};

