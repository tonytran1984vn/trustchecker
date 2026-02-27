/**
 * Company Admin – KPI Overview
 * ═══════════════════════════════
 * Deep KPIs + Smart Action Recommendations
 * API: /governance/kpi-overview
 */
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const d = _data;
  const fmtN = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v;

  return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>📊 KPI Overview</h1><p class="desc">Enterprise performance dashboard</p></div>

      <!-- Smart Action Recommendations -->
      ${renderRecommendations(d, fmtN)}

      <!-- Primary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${kpi('Products', d.products.total, d.products.active + ' active', '#6366f1')}
        ${kpi('Total Scans', fmtN(d.scans.total), fmtN(d.scans.last_7d) + ' (7d) · ' + fmtN(d.scans.last_30d) + ' (30d)', '#3b82f6')}
        ${kpi('Fraud Rate', d.fraud_rate + '%', d.detection_rate + '% auth rate', d.fraud_rate > 5 ? '#ef4444' : d.fraud_rate > 2 ? '#f59e0b' : '#22c55e')}
        ${kpi('Avg Trust', d.avg_trust, '/100', '#22c55e')}
      </div>

      <!-- Alert + Scan Period -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        ${kpi('Open Alerts', d.alerts.open, d.alerts.critical_open + ' critical', d.alerts.critical_open > 0 ? '#ef4444' : '#22c55e')}
        ${kpi('Flagged (7d)', d.scans.flagged_7d, 'of ' + fmtN(d.scans.last_7d) + ' scans', '#f59e0b')}
        ${kpi('Flagged (30d)', d.scans.flagged_30d, 'of ' + fmtN(d.scans.last_30d) + ' scans', '#f59e0b')}
      </div>

      <!-- Weekly Scan Trend -->
      ${d.weekly.length > 0 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">📈 Weekly Scan Trend (12 weeks)</div></div>
        <div style="padding:16px">
          ${renderWeeklyBars(d.weekly)}
        </div>
      </div>` : ''}

      <!-- Top Products -->
      ${d.top_products.length > 0 ? `
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 Top Products by Scan Volume</div></div>
        <div class="table-container">
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Scans</th><th>Flagged</th><th>Trust</th><th>Action</th></tr></thead>
            <tbody>
              ${d.top_products.map((p, i) => {
    const needsAction = p.flagged > 0 || (p.avg_trust && p.avg_trust < 70);
    return `
              <tr>
                <td style="font-weight:700;color:${i < 3 ? '#f59e0b' : 'var(--text-muted)'}">${i + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td>${fmtN(p.scans)}</td>
                <td style="color:${p.flagged > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:600">${p.flagged}</td>
                <td style="color:${p.avg_trust >= 80 ? '#22c55e' : p.avg_trust >= 60 ? '#f59e0b' : '#ef4444'}">${p.avg_trust || '—'}</td>
                <td>${needsAction ? `<a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('ca-incidents')" style="font-size:0.72rem;color:#ef4444;font-weight:600;text-decoration:none">⚠ Investigate</a>` : `<span style="font-size:0.72rem;color:#22c55e">✓ OK</span>`}</td>
              </tr>`}).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </div>
  `;
}

function renderRecommendations(d, fmtN) {
  const actions = [];

  // Critical alerts
  if (d.alerts.critical_open > 0) {
    actions.push({
      level: 'critical', emoji: '🚨',
      title: `${d.alerts.critical_open} Critical Alert${d.alerts.critical_open > 1 ? 's' : ''} Unresolved`,
      desc: 'Immediate investigation required — potential counterfeit or high-risk activity detected',
      btn: 'Open Incidents →', page: 'ca-incidents',
    });
  }

  // High fraud rate
  if (d.fraud_rate > 5) {
    actions.push({
      level: 'critical', emoji: '⛔',
      title: `Fraud Rate ${d.fraud_rate}% — Above Threshold`,
      desc: 'Consider tightening risk rules or reviewing flagged products. Normal range: < 2%',
      btn: 'Review Risk Rules →', page: 'ca-risk-rules',
    });
  } else if (d.fraud_rate > 2) {
    actions.push({
      level: 'warning', emoji: '⚠️',
      title: `Fraud Rate ${d.fraud_rate}% — Elevated`,
      desc: 'Monitor closely. Review scan analytics to identify patterns',
      btn: 'Scan Analytics →', page: 'ca-scan-analytics',
    });
  }

  // Low trust score
  if (d.avg_trust && d.avg_trust < 70) {
    actions.push({
      level: 'warning', emoji: '📉',
      title: `Average Trust Score ${d.avg_trust} — Below Target (80)`,
      desc: 'Product quality or supply chain integrity may be compromised',
      btn: 'Check Traceability →', page: 'ca-traceability',
    });
  }

  // Open alerts (non-critical)
  if (d.alerts.open > 5 && d.alerts.critical_open === 0) {
    actions.push({
      level: 'info', emoji: '📋',
      title: `${d.alerts.open} Open Alerts Pending`,
      desc: 'Assign team members to review and resolve outstanding alerts',
      btn: 'View Alerts →', page: 'fraud',
    });
  }

  // Scan volume drop
  if (d.scans.last_7d > 0 && d.scans.last_30d > 0) {
    const weeklyAvg = Math.round(d.scans.last_30d / 4);
    if (d.scans.last_7d < weeklyAvg * 0.5) {
      actions.push({
        level: 'warning', emoji: '📡',
        title: `Scan Volume Down ${Math.round((1 - d.scans.last_7d / weeklyAvg) * 100)}% vs Average`,
        desc: 'Scanner devices may be offline or distributors stopped scanning',
        btn: 'Check Scan Monitor →', page: 'scans',
      });
    }
  }

  // Flagged products in top list
  const flaggedProducts = d.top_products.filter(p => p.flagged > 3);
  if (flaggedProducts.length > 0) {
    actions.push({
      level: 'warning', emoji: '🔍',
      title: `${flaggedProducts.length} Product${flaggedProducts.length > 1 ? 's' : ''} with Repeated Flags`,
      desc: flaggedProducts.map(p => p.name).slice(0, 3).join(', ') + (flaggedProducts.length > 3 ? '...' : ''),
      btn: 'Open Fraud Monitor →', page: 'fraud',
    });
  }

  // All good!
  if (actions.length === 0) {
    actions.push({
      level: 'good', emoji: '✅',
      title: 'All Systems Normal',
      desc: `Fraud rate ${d.fraud_rate}%, trust score ${d.avg_trust}/100, no critical alerts`,
      btn: 'View Reports →', page: 'ca-reports',
    });
  }

  const colors = {
    critical: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', text: '#dc2626' },
    warning: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', text: '#d97706' },
    info: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', text: '#2563eb' },
    good: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e', text: '#16a34a' },
  };

  return `
    <div style="margin-bottom:20px;display:grid;gap:10px">
      ${actions.map(a => {
    const c = colors[a.level];
    return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:12px;background:${c.bg};border-left:4px solid ${c.border}">
          <div style="display:flex;align-items:center;gap:12px;flex:1">
            <span style="font-size:1.3rem">${a.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:0.88rem;color:${c.text}">${a.title}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${a.desc}</div>
            </div>
          </div>
          <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${a.page}')"
             style="padding:8px 16px;border-radius:8px;background:${c.border};color:#fff;font-weight:600;font-size:0.78rem;text-decoration:none;white-space:nowrap;transition:opacity 0.2s"
             onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            ${a.btn}
          </a>
        </div>`;
  }).join('')}
    </div>`;
}

function kpi(label, value, sub, color) {
  return `
    <div class="card" style="text-align:center;padding:20px;border-left:3px solid ${color}">
      <div style="font-size:1.6rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.82rem;font-weight:600;margin-top:4px">${label}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${sub}</div>
    </div>`;
}

function renderWeeklyBars(weekly) {
  const mx = Math.max(...weekly.map(w => w.scans), 1);
  return `
    <div style="display:flex;align-items:end;gap:6px;height:120px">
      ${weekly.map(w => {
    const h = Math.max(4, (w.scans / mx) * 100);
    const fh = w.scans > 0 ? Math.max(2, (w.flagged / mx) * 100) : 0;
    const dt = new Date(w.week);
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="font-size:0.55rem;color:var(--text-muted)">${w.scans}</div>
          <div style="width:100%;position:relative;height:${h}px">
            <div style="position:absolute;bottom:0;width:100%;height:${h}px;background:#3b82f6;border-radius:4px 4px 0 0;opacity:0.3"></div>
            ${fh > 0 ? `<div style="position:absolute;bottom:0;width:100%;height:${fh}px;background:#ef4444;border-radius:0;opacity:0.7"></div>` : ''}
          </div>
          <div style="font-size:0.55rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;color:var(--text-muted)">
      <span>🔵 Total scans</span><span>🔴 Flagged</span>
    </div>`;
}

async function loadData() {
  try {
    _data = await api.get('/tenant/governance/kpi-overview');
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[KPI]', e); }
}

function loading() {
  return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading KPI overview...</span></div>';
}
