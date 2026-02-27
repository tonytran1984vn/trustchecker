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
    <div style="max-width:100%;overflow:hidden;box-sizing:border-box;padding:0 4px">
      <div class="page-header"><h1>📊 KPI Overview</h1><p class="desc">Enterprise performance dashboard</p></div>

      <!-- ① ACTION REQUIRED -->
      ${renderRecommendations(d, fmtN)}

      <!-- ② HEALTH STATUS -->
      <div style="margin-bottom:18px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">🩺 Health Status</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          ${healthCard('Fraud Rate', d.fraud_rate + '%', d.fraud_rate > 5 ? 'critical' : d.fraud_rate > 2 ? 'warning' : 'good', d.fraud_rate > 5 ? 'Above 5%' : d.fraud_rate > 2 ? 'Elevated' : 'Normal')}
          ${healthCard('Trust Score', d.avg_trust + '/100', d.avg_trust < 60 ? 'critical' : d.avg_trust < 80 ? 'warning' : 'good', d.avg_trust >= 80 ? 'Healthy' : 'Below 80')}
          ${healthCard('Critical Alerts', String(d.alerts.critical_open), d.alerts.critical_open > 0 ? 'critical' : 'good', d.alerts.critical_open > 0 ? 'Urgent' : 'Clear')}
          ${healthCard('7d Fraud', fraud7d + '%', fraud7d > 5 ? 'critical' : fraud7d > 2 ? 'warning' : 'good', 'vs ' + d.fraud_rate + '%')}
        </div>
      </div>

      <!-- ③ OPERATIONS -->
      <div style="margin-bottom:18px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">📦 Operations</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="card" style="padding:16px">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Products</div>
            <div style="font-size:1.8rem;font-weight:800;color:#6366f1">${d.products.total}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${d.products.active} active · ${d.detection_rate}% auth</div>
          </div>
          <div class="card" style="padding:16px">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Total Scans</div>
            <div style="font-size:1.8rem;font-weight:800;color:#3b82f6">${fmtN(d.scans.total)}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${fmtN(d.scans.last_7d)} (7d) · ${fmtN(d.scans.last_30d)} (30d)</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
          <div class="card" style="padding:16px">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Flagged (7d)</div>
            <div style="font-size:1.8rem;font-weight:800;color:${d.scans.flagged_7d > 0 ? '#ef4444' : '#22c55e'}">${d.scans.flagged_7d}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">of ${fmtN(d.scans.last_7d)} scans</div>
          </div>
          <div class="card" style="padding:16px">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Flagged (30d)</div>
            <div style="font-size:1.8rem;font-weight:800;color:${d.scans.flagged_30d > 0 ? '#ef4444' : '#22c55e'}">${d.scans.flagged_30d}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">of ${fmtN(d.scans.last_30d)} scans</div>
          </div>
        </div>
      </div>

      <!-- ④ ALERT STATUS -->
      <div style="margin-bottom:18px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">🚨 Alert Status</div>
        <div class="card" style="padding:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:center">
            <div style="text-align:center">
              <div style="font-size:1.5rem;font-weight:800;color:${d.alerts.open > 0 ? '#f59e0b' : '#22c55e'}">${d.alerts.open}</div>
              <div style="font-size:0.68rem;color:var(--text-muted)">Open</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:1.5rem;font-weight:800;color:${d.alerts.critical_open > 0 ? '#ef4444' : '#22c55e'}">${d.alerts.critical_open}</div>
              <div style="font-size:0.68rem;color:var(--text-muted)">Critical</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:1.5rem;font-weight:800;color:#3b82f6">${d.alerts.total}</div>
              <div style="font-size:0.68rem;color:var(--text-muted)">Total</div>
            </div>
            <div>
              ${d.alerts.open > 0 ? `<a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('fraud')" style="padding:8px 14px;border-radius:8px;background:${d.alerts.critical_open > 0 ? '#ef4444' : '#f59e0b'};color:#fff;font-weight:600;font-size:0.75rem;text-decoration:none;white-space:nowrap">Review →</a>` : `<span style="color:#22c55e;font-size:0.75rem;font-weight:600">✓ OK</span>`}
            </div>
          </div>
        </div>
      </div>

      <!-- ⑤ WEEKLY TREND -->
      ${d.weekly.length > 0 ? `
      <div style="margin-bottom:18px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">📈 Weekly Trend (12w)</div>
        <div class="card" style="padding:14px">${renderWeeklyBars(d.weekly)}</div>
      </div>` : ''}

      <!-- ⑥ TOP PRODUCTS -->
      ${d.top_products.length > 0 ? `
      <div>
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">🏆 Top Products</div>
        <div class="card">
          <div class="table-container" style="overflow-x:auto">
            <table style="width:100%;min-width:0">
              <thead><tr><th>#</th><th>Product</th><th>Scans</th><th>Flag</th><th>Trust</th><th>Status</th></tr></thead>
              <tbody>
                ${d.top_products.map((p, i) => {
    const risk = p.flagged > 3 ? 'critical' : p.flagged > 0 ? 'warning' : 'good';
    const rc = { critical: '#ef4444', warning: '#f59e0b', good: '#22c55e' };
    const rl = { critical: '⚠ Check', warning: '⚡ Watch', good: '✓' };
    return `
                <tr>
                  <td style="font-weight:700;color:${i < 3 ? '#f59e0b' : 'var(--text-muted)'}">${i + 1}</td>
                  <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>${p.name}</strong></td>
                  <td>${fmtN(p.scans)}</td>
                  <td style="color:${p.flagged > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:600">${p.flagged}</td>
                  <td style="color:${p.avg_trust >= 80 ? '#22c55e' : p.avg_trust >= 60 ? '#f59e0b' : '#ef4444'}">${p.avg_trust || '—'}</td>
                  <td><span style="font-size:0.72rem;color:${rc[risk]};font-weight:600">${rl[risk]}</span></td>
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
  const c = { critical: '#ef4444', warning: '#f59e0b', good: '#22c55e' };
  const bg = { critical: 'rgba(239,68,68,0.06)', warning: 'rgba(245,158,11,0.06)', good: 'rgba(34,197,94,0.06)' };
  const dot = { critical: '🔴', warning: '🟡', good: '🟢' };
  return `
    <div class="card" style="padding:14px;background:${bg[level]};border:1px solid ${c[level]}20;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted)">${label}</span>
        <span>${dot[level]}</span>
      </div>
      <div style="font-size:1.4rem;font-weight:800;color:${c[level]}">${value}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin-top:3px">${desc}</div>
    </div>`;
}

function renderRecommendations(d, fmtN) {
  const actions = [];
  if (d.alerts.critical_open > 0)
    actions.push({ level: 'critical', emoji: '🚨', title: `${d.alerts.critical_open} Critical Alert${d.alerts.critical_open > 1 ? 's' : ''}`, desc: 'Investigate now', btn: 'Incidents →', page: 'ca-incidents' });
  if (d.fraud_rate > 5)
    actions.push({ level: 'critical', emoji: '⛔', title: `Fraud ${d.fraud_rate}% — High`, desc: 'Tighten rules', btn: 'Risk Rules →', page: 'ca-risk-rules' });
  else if (d.fraud_rate > 2)
    actions.push({ level: 'warning', emoji: '⚠️', title: `Fraud ${d.fraud_rate}% — Elevated`, desc: 'Review patterns', btn: 'Analytics →', page: 'ca-scan-analytics' });
  if (d.avg_trust && d.avg_trust < 70)
    actions.push({ level: 'warning', emoji: '📉', title: `Trust ${d.avg_trust} — Low`, desc: 'Check supply chain', btn: 'Traceability →', page: 'ca-traceability' });
  if (d.scans.last_7d > 0 && d.scans.last_30d > 0) {
    const avg = Math.round(d.scans.last_30d / 4);
    if (d.scans.last_7d < avg * 0.5)
      actions.push({ level: 'warning', emoji: '📡', title: `Scans -${Math.round((1 - d.scans.last_7d / avg) * 100)}%`, desc: 'Devices offline?', btn: 'Scans →', page: 'scans' });
  }
  const flagged = d.top_products.filter(p => p.flagged > 3);
  if (flagged.length > 0)
    actions.push({ level: 'warning', emoji: '🔍', title: `${flagged.length} Product${flagged.length > 1 ? 's' : ''} Flagged`, desc: flagged.slice(0, 2).map(p => p.name).join(', '), btn: 'Monitor →', page: 'fraud' });
  if (actions.length === 0)
    actions.push({ level: 'good', emoji: '✅', title: 'All Systems Normal', desc: `${d.fraud_rate}% fraud · ${d.avg_trust} trust`, btn: 'Reports →', page: 'ca-reports' });

  const cs = { critical: { bg: 'rgba(239,68,68,0.07)', b: '#ef4444' }, warning: { bg: 'rgba(245,158,11,0.07)', b: '#f59e0b' }, good: { bg: 'rgba(34,197,94,0.07)', b: '#22c55e' } };
  return `
    <div style="margin-bottom:18px">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;padding-left:2px">⚡ Action Required</div>
      <div style="display:grid;gap:6px">
        ${actions.map(a => {
    const c = cs[a.level]; return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:${c.bg};border-left:3px solid ${c.b};box-sizing:border-box">
          <span style="font-size:1.1rem;flex-shrink:0">${a.emoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.82rem;color:${c.b}">${a.title}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${a.desc}</div>
          </div>
          <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${a.page}')" style="padding:6px 12px;border-radius:6px;background:${c.b};color:#fff;font-weight:600;font-size:0.72rem;text-decoration:none;white-space:nowrap;flex-shrink:0">${a.btn}</a>
        </div>`;
  }).join('')}
      </div>
    </div>`;
}

function renderWeeklyBars(weekly) {
  const mx = Math.max(...weekly.map(w => w.scans), 1);
  return `
    <div style="display:flex;align-items:end;gap:4px;height:100px">
      ${weekly.map(w => {
    const h = Math.max(4, (w.scans / mx) * 85);
    const fh = w.scans > 0 ? Math.max(2, (w.flagged / mx) * 85) : 0;
    const dt = new Date(w.week);
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0">
          <div style="font-size:0.5rem;color:var(--text-muted)">${w.scans}</div>
          <div style="width:100%;position:relative;height:${h}px">
            <div style="position:absolute;bottom:0;width:100%;height:${h}px;background:#3b82f6;border-radius:3px 3px 0 0;opacity:0.3"></div>
            ${fh > 0 ? `<div style="position:absolute;bottom:0;width:100%;height:${fh}px;background:#ef4444;opacity:0.7"></div>` : ''}
          </div>
          <div style="font-size:0.48rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:6px;font-size:0.6rem;color:var(--text-muted)">
      <span>🔵 Scans</span><span>🔴 Flagged</span>
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
