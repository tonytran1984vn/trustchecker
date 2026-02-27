/**
 * Company Admin – KPI Overview
 * ═══════════════════════════════
 * Logical flow: Action Required → Health Status → Operations → Trends → Product Detail
 * API: /governance/kpi-overview
 */
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const d = _data;
  const fmtN = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);
  const fraud7d = d.scans.last_7d > 0 ? Math.round(d.scans.flagged_7d / d.scans.last_7d * 10000) / 100 : 0;

  return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>📊 KPI Overview</h1><p class="desc">Enterprise performance dashboard — Company Admin</p></div>

      <!-- ① ACTION REQUIRED — What needs attention NOW -->
      ${renderRecommendations(d, fmtN)}

      <!-- ② HEALTH STATUS — Traffic light overview -->
      <div style="margin-bottom:20px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">🩺 Health Status</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          ${healthCard('Fraud Rate', d.fraud_rate + '%', d.fraud_rate > 5 ? 'critical' : d.fraud_rate > 2 ? 'warning' : 'good', d.fraud_rate > 5 ? 'Above 5% — action required' : d.fraud_rate > 2 ? 'Elevated — monitor' : 'Normal range')}
          ${healthCard('Trust Score', d.avg_trust + '/100', d.avg_trust < 60 ? 'critical' : d.avg_trust < 80 ? 'warning' : 'good', d.avg_trust >= 80 ? 'Healthy' : d.avg_trust >= 60 ? 'Below target (80)' : 'Critical — investigate')}
          ${healthCard('Critical Alerts', String(d.alerts.critical_open), d.alerts.critical_open > 0 ? 'critical' : 'good', d.alerts.critical_open > 0 ? 'Unresolved — urgent' : 'All clear')}
          ${healthCard('7d Fraud Rate', fraud7d + '%', fraud7d > 5 ? 'critical' : fraud7d > 2 ? 'warning' : 'good', 'vs. overall ' + d.fraud_rate + '%')}
        </div>
      </div>

      <!-- ③ OPERATIONS — Volume metrics -->
      <div style="margin-bottom:20px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">📦 Operations</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          <div class="card" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:start">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted)">Products</div>
                <div style="font-size:2rem;font-weight:800;color:#6366f1">${d.products.total}</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">${d.products.active} active</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:0.75rem;color:var(--text-muted)">Auth Rate</div>
                <div style="font-size:2rem;font-weight:800;color:#22c55e">${d.detection_rate}%</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">authenticated</div>
              </div>
            </div>
          </div>
          <div class="card" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:start">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted)">Total Scans</div>
                <div style="font-size:2rem;font-weight:800;color:#3b82f6">${fmtN(d.scans.total)}</div>
              </div>
              <div style="text-align:right">
                <div style="display:grid;gap:4px">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
                    <span style="font-size:0.72rem;color:var(--text-muted)">7 days</span>
                    <span style="font-size:1rem;font-weight:700">${fmtN(d.scans.last_7d)}</span>
                    <span style="font-size:0.68rem;color:${d.scans.flagged_7d > 0 ? '#ef4444' : '#22c55e'}">${d.scans.flagged_7d} flagged</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
                    <span style="font-size:0.72rem;color:var(--text-muted)">30 days</span>
                    <span style="font-size:1rem;font-weight:700">${fmtN(d.scans.last_30d)}</span>
                    <span style="font-size:0.68rem;color:${d.scans.flagged_30d > 0 ? '#ef4444' : '#22c55e'}">${d.scans.flagged_30d} flagged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ④ ALERTS SUMMARY -->
      <div style="margin-bottom:20px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">🚨 Alert Status</div>
        <div class="card" style="padding:16px">
          <div style="display:flex;gap:20px;align-items:center">
            <div style="text-align:center;flex:1;border-right:1px solid var(--border);padding-right:16px">
              <div style="font-size:1.8rem;font-weight:800;color:${d.alerts.open > 0 ? '#f59e0b' : '#22c55e'}">${d.alerts.open}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">Open</div>
            </div>
            <div style="text-align:center;flex:1;border-right:1px solid var(--border);padding-right:16px">
              <div style="font-size:1.8rem;font-weight:800;color:${d.alerts.critical_open > 0 ? '#ef4444' : '#22c55e'}">${d.alerts.critical_open}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">Critical</div>
            </div>
            <div style="text-align:center;flex:1;border-right:1px solid var(--border);padding-right:16px">
              <div style="font-size:1.8rem;font-weight:800;color:#3b82f6">${d.alerts.total}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">Total</div>
            </div>
            <div style="flex:2;display:flex;justify-content:flex-end">
              ${d.alerts.open > 0 ? `<a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('fraud')" style="padding:10px 20px;border-radius:8px;background:${d.alerts.critical_open > 0 ? '#ef4444' : '#f59e0b'};color:#fff;font-weight:600;font-size:0.82rem;text-decoration:none">Review Alerts →</a>` : `<span style="color:#22c55e;font-weight:600;font-size:0.85rem">✓ No action needed</span>`}
            </div>
          </div>
        </div>
      </div>

      <!-- ⑤ WEEKLY TREND -->
      ${d.weekly.length > 0 ? `
      <div style="margin-bottom:20px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">📈 Weekly Scan Trend (12 weeks)</div>
        <div class="card" style="padding:16px">
          ${renderWeeklyBars(d.weekly)}
        </div>
      </div>` : ''}

      <!-- ⑥ TOP PRODUCTS — Detail drill-down -->
      ${d.top_products.length > 0 ? `
      <div>
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">🏆 Top Products by Scan Volume</div>
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>#</th><th>Product</th><th>Scans</th><th>Flagged</th><th>Trust</th><th>Status</th></tr></thead>
              <tbody>
                ${d.top_products.map((p, i) => {
    const risk = p.flagged > 3 ? 'critical' : p.flagged > 0 ? 'warning' : 'good';
    const rColors = { critical: '#ef4444', warning: '#f59e0b', good: '#22c55e' };
    const rLabels = { critical: '⚠ Investigate', warning: '⚡ Monitor', good: '✓ OK' };
    return `
                <tr>
                  <td style="font-weight:700;color:${i < 3 ? '#f59e0b' : 'var(--text-muted)'}">${i + 1}</td>
                  <td><strong>${p.name}</strong></td>
                  <td>${fmtN(p.scans)}</td>
                  <td style="color:${p.flagged > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:600">${p.flagged}</td>
                  <td style="color:${p.avg_trust >= 80 ? '#22c55e' : p.avg_trust >= 60 ? '#f59e0b' : '#ef4444'}">${p.avg_trust || '—'}</td>
                  <td>${risk !== 'good'
        ? `<a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${risk === 'critical' ? 'ca-incidents' : 'ca-scan-analytics'}')" style="font-size:0.72rem;color:${rColors[risk]};font-weight:600;text-decoration:none">${rLabels[risk]}</a>`
        : `<span style="font-size:0.72rem;color:#22c55e">${rLabels[risk]}</span>`}</td>
                </tr>`}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>` : ''}
    </div>
  `;
}

function healthCard(label, value, level, desc) {
  const colors = { critical: '#ef4444', warning: '#f59e0b', good: '#22c55e' };
  const bgs = { critical: 'rgba(239,68,68,0.08)', warning: 'rgba(245,158,11,0.08)', good: 'rgba(34,197,94,0.08)' };
  const dots = { critical: '🔴', warning: '🟡', good: '🟢' };
  const c = colors[level];
  return `
    <div class="card" style="padding:16px;background:${bgs[level]};border:1px solid ${c}20">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:0.72rem;font-weight:600;color:var(--text-muted)">${label}</span>
        <span style="font-size:0.85rem">${dots[level]}</span>
      </div>
      <div style="font-size:1.5rem;font-weight:800;color:${c}">${value}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${desc}</div>
    </div>`;
}

function renderRecommendations(d, fmtN) {
  const actions = [];

  if (d.alerts.critical_open > 0)
    actions.push({ level: 'critical', emoji: '🚨', title: `${d.alerts.critical_open} Critical Alert${d.alerts.critical_open > 1 ? 's' : ''} Unresolved`, desc: 'Potential counterfeit or high-risk activity — investigate now', btn: 'Open Incidents →', page: 'ca-incidents' });
  if (d.fraud_rate > 5)
    actions.push({ level: 'critical', emoji: '⛔', title: `Fraud Rate ${d.fraud_rate}% — Above Threshold`, desc: 'Tighten risk rules or review flagged products. Normal: < 2%', btn: 'Review Risk Rules →', page: 'ca-risk-rules' });
  else if (d.fraud_rate > 2)
    actions.push({ level: 'warning', emoji: '⚠️', title: `Fraud Rate ${d.fraud_rate}% — Elevated`, desc: 'Review scan analytics to identify patterns', btn: 'Scan Analytics →', page: 'ca-scan-analytics' });
  if (d.avg_trust && d.avg_trust < 70)
    actions.push({ level: 'warning', emoji: '📉', title: `Trust Score ${d.avg_trust} — Below Target`, desc: 'Product quality or supply chain integrity may be at risk', btn: 'Check Traceability →', page: 'ca-traceability' });
  if (d.scans.last_7d > 0 && d.scans.last_30d > 0) {
    const weeklyAvg = Math.round(d.scans.last_30d / 4);
    if (d.scans.last_7d < weeklyAvg * 0.5)
      actions.push({ level: 'warning', emoji: '📡', title: `Scan Volume Down ${Math.round((1 - d.scans.last_7d / weeklyAvg) * 100)}%`, desc: 'Devices may be offline or distributors stopped scanning', btn: 'Check Scans →', page: 'scans' });
  }
  const flagged = d.top_products.filter(p => p.flagged > 3);
  if (flagged.length > 0)
    actions.push({ level: 'warning', emoji: '🔍', title: `${flagged.length} Product${flagged.length > 1 ? 's' : ''} Repeatedly Flagged`, desc: flagged.map(p => p.name).slice(0, 3).join(', '), btn: 'Fraud Monitor →', page: 'fraud' });

  if (actions.length === 0)
    actions.push({ level: 'good', emoji: '✅', title: 'All Systems Normal', desc: `Fraud ${d.fraud_rate}% · Trust ${d.avg_trust}/100 · No critical alerts`, btn: 'View Reports →', page: 'ca-reports' });

  const cs = { critical: { bg: 'rgba(239,68,68,0.08)', b: '#ef4444' }, warning: { bg: 'rgba(245,158,11,0.08)', b: '#f59e0b' }, info: { bg: 'rgba(59,130,246,0.08)', b: '#3b82f6' }, good: { bg: 'rgba(34,197,94,0.08)', b: '#22c55e' } };

  return `
    <div style="margin-bottom:20px">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px">⚡ Action Required</div>
      <div style="display:grid;gap:8px">
        ${actions.map(a => {
    const c = cs[a.level]; return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:10px;background:${c.bg};border-left:4px solid ${c.b}">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <span style="font-size:1.2rem">${a.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:0.85rem;color:${c.b}">${a.title}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px">${a.desc}</div>
            </div>
          </div>
          <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${a.page}')" style="padding:7px 14px;border-radius:7px;background:${c.b};color:#fff;font-weight:600;font-size:0.75rem;text-decoration:none;white-space:nowrap">${a.btn}</a>
        </div>`;
  }).join('')}
      </div>
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
            ${fh > 0 ? `<div style="position:absolute;bottom:0;width:100%;height:${fh}px;background:#ef4444;opacity:0.7"></div>` : ''}
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
