/**
 * Company Admin – Risk Command Dashboard
 * ═══════════════════════════════════════════
 * Risk-First Architecture: 7 Layers
 * ① Risk Command Bar → ② Action Queue → ③ Health Signals
 * → ④ Risk Distribution → ⑤ Trend Intelligence → ⑥ Exposure → ⑦ Investigation
 */
import { API as api } from '../../core/api.js';

let _d = null;
const $ = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v;
const N = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);

export function renderPage() {
  if (!_d) { load(); return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading Risk Command...</span></div>'; }
  const d = _d;
  const rc = d.risk_command;
  const ca = d.critical_actions;
  const h = d.health;
  const ex = d.exposure;

  const lvlColor = { CRITICAL: '#dc2626', HIGH: '#ef4444', ELEVATED: '#f59e0b', NORMAL: '#22c55e' };
  const lvlBg = { CRITICAL: 'rgba(220,38,38,0.12)', HIGH: 'rgba(239,68,68,0.08)', ELEVATED: 'rgba(245,158,11,0.06)', NORMAL: 'rgba(34,197,94,0.06)' };
  const c = lvlColor[rc.level] || '#64748b';

  return `<div style="max-width:100%;overflow:hidden;box-sizing:border-box">

    <!-- ① RISK COMMAND BAR -->
    <div style="background:${lvlBg[rc.level]};border:1px solid ${c}30;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center">
        <div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Risk Level</div>
          <div style="font-size:1.3rem;font-weight:900;color:${c};letter-spacing:1px">${rc.level === 'CRITICAL' ? '🔴' : rc.level === 'HIGH' ? '🟠' : rc.level === 'ELEVATED' ? '🟡' : '🟢'} ${rc.level}</div>
        </div>
        <div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Exposure</div>
          <div style="font-size:1.3rem;font-weight:900;color:${c}">${$(rc.exposure)}</div>
          <div style="font-size:0.6rem;color:var(--text-muted)">${$(rc.exposure_7d)} this week</div>
        </div>
        <div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Trend (WoW)</div>
          <div style="font-size:1.3rem;font-weight:900;color:${rc.wow_trend > 0 ? '#ef4444' : rc.wow_trend < 0 ? '#22c55e' : 'var(--text-muted)'}">
            ${rc.wow_trend > 0 ? '↑' : rc.wow_trend < 0 ? '↓' : '→'} ${rc.wow_trend > 0 ? '+' : ''}${rc.wow_trend}%
          </div>
        </div>
        <div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">SLA Breach</div>
          <div style="font-size:1.3rem;font-weight:900;color:${rc.sla_overdue > 0 ? '#ef4444' : '#22c55e'}">${rc.sla_overdue} overdue</div>
        </div>
      </div>
    </div>

    <!-- ② CRITICAL ACTION QUEUE -->
    <div style="margin-bottom:16px">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">⚡ Critical Actions</div>
      <div style="display:grid;gap:5px">
        ${actionRow('🔴', ca.critical_alerts + ' Critical Alerts', ca.sla_overdue + ' over SLA', ca.critical_alerts > 0, 'Investigate →', 'ca-incidents')}
        ${ca.high_alerts > 0 ? actionRow('🟠', ca.high_alerts + ' High-Severity Alerts', 'Pending review', true, 'Review →', 'fraud') : ''}
        ${ca.flagged_products > 0 ? actionRow('🟠', ca.flagged_products + ' Products flagged >5%', 'Needs investigation', true, 'Products →', 'products') : ''}
        ${ca.region_spikes > 0 ? actionRow('🟡', ca.region_spikes + ' Region' + (ca.region_spikes > 1 ? 's' : '') + ' abnormal spike', 'Geographic anomaly', true, 'Regions →', 'ca-traceability') : ''}
        ${ca.critical_alerts === 0 && ca.flagged_products === 0 && ca.region_spikes === 0 ? actionRow('🟢', 'No critical actions', 'Systems normal', false, 'Reports →', 'ca-reports') : ''}
      </div>
    </div>

    <!-- ③ RISK HEALTH SNAPSHOT -->
    <div style="margin-bottom:16px">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">🩺 Risk Signals</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        ${signal('Severity Index', h.severity_index.toFixed(1) + '/4.0', h.severity_index > 3 ? 'critical' : h.severity_index > 2 ? 'high' : h.severity_index > 1 ? 'elevated' : 'normal', 'Weighted open alert severity')}
        ${signal('Fraud Rate', h.fraud_rate + '%', h.fraud_rate > 5 ? 'critical' : h.fraud_rate > 2 ? 'elevated' : 'normal', 'Overall detection rate')}
        ${signal('Fraud Velocity', (h.fraud_velocity > 0 ? '+' : '') + h.fraud_velocity + '% WoW', h.fraud_velocity > 20 ? 'critical' : h.fraud_velocity > 0 ? 'elevated' : 'normal', '7d vs previous 7d')}
        ${signal('Trust Stability', h.trust_stability + '/100', h.trust_stability < 70 ? 'critical' : h.trust_stability < 85 ? 'elevated' : 'normal', 'Lower stddev = more stable')}
      </div>
    </div>

    <!-- ④ RISK DISTRIBUTION -->
    <div style="margin-bottom:16px">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">📍 Risk Distribution</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="card" style="padding:14px">
          <div style="font-size:0.78rem;font-weight:700;margin-bottom:8px">By Region</div>
          ${d.distribution.by_region.length > 0 ? d.distribution.by_region.slice(0, 6).map(r =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:0.75rem;font-weight:600">${r.region || '—'}</span>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:0.68rem;color:var(--text-muted)">${r.flagged}/${r.scans}</span>
                <span style="font-size:0.72rem;font-weight:700;color:${r.fraud_rate > 5 ? '#ef4444' : r.fraud_rate > 2 ? '#f59e0b' : '#22c55e'};min-width:40px;text-align:right">${r.fraud_rate}%</span>
              </div>
            </div>`
  ).join('') : '<div style="font-size:0.72rem;color:var(--text-muted)">No data</div>'}
        </div>
        <div class="card" style="padding:14px">
          <div style="font-size:0.78rem;font-weight:700;margin-bottom:8px">High-Risk Products</div>
          ${d.distribution.by_product.length > 0 ? d.distribution.by_product.slice(0, 6).map(p =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:0.72rem;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</span>
              <span style="font-size:0.72rem;font-weight:700;color:#ef4444">${p.flag_rate}%</span>
            </div>`
  ).join('') : '<div style="font-size:0.72rem;color:var(--text-muted)">No high-risk products</div>'}
        </div>
      </div>
    </div>

    <!-- ⑤ TREND INTELLIGENCE -->
    <div style="margin-bottom:16px">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">📈 Trend Intelligence</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="card" style="padding:14px">
          <div style="font-size:0.78rem;font-weight:700;margin-bottom:8px">Fraud Rate Trend</div>
          ${renderFraudTrend(d.trends.fraud_weekly)}
        </div>
        <div class="card" style="padding:14px">
          <div style="font-size:0.78rem;font-weight:700;margin-bottom:8px">Alerts: Created vs Resolved</div>
          ${renderAlertTrend(d.trends.alert_weekly)}
        </div>
      </div>
    </div>

    <!-- ⑥ EXPOSURE & IMPACT -->
    <div style="margin-bottom:16px">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">💰 Exposure & Impact</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        <div class="card" style="padding:14px;border-left:3px solid #ef4444">
          <div style="font-size:0.68rem;color:var(--text-muted)">Counterfeit Exposure</div>
          <div style="font-size:1.6rem;font-weight:900;color:#ef4444">${$(ex.counterfeit_value)}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${N(ex.counterfeit_count)} counterfeit detections</div>
        </div>
        <div class="card" style="padding:14px;border-left:3px solid #f59e0b">
          <div style="font-size:0.68rem;color:var(--text-muted)">Brand Impact Index</div>
          <div style="font-size:1.6rem;font-weight:900;color:${ex.brand_impact_index > 60 ? '#ef4444' : ex.brand_impact_index > 30 ? '#f59e0b' : '#22c55e'}">${ex.brand_impact_index}/100</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${ex.brand_impact_index > 60 ? 'Critical' : ex.brand_impact_index > 30 ? 'Moderate' : 'Low'} brand risk</div>
        </div>
        <div class="card" style="padding:14px;border-left:3px solid #6366f1">
          <div style="font-size:0.68rem;color:var(--text-muted)">High-Risk Inventory</div>
          <div style="font-size:1.6rem;font-weight:900;color:#6366f1">${ex.high_risk_pct}%</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${ex.high_risk_products} of ${ex.total_products} products</div>
        </div>
        <div class="card" style="padding:14px;border-left:3px solid #3b82f6">
          <div style="font-size:0.68rem;color:var(--text-muted)">Capital at Risk (7d)</div>
          <div style="font-size:1.6rem;font-weight:900;color:#3b82f6">${$(d.risk_command.exposure_7d)}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${d.risk_command.wow_trend > 0 ? '↑' : '↓'} ${Math.abs(d.risk_command.wow_trend)}% vs last week</div>
        </div>
      </div>
    </div>

    <!-- ⑦ INVESTIGATION TABLE -->
    ${d.investigation.length > 0 ? `
    <div>
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">🔍 Investigation Queue (sorted by Risk Score)</div>
      <div class="card">
        <div class="table-container" style="overflow-x:auto">
          <table style="width:100%">
            <thead><tr>
              <th>Rank</th><th>Product</th><th>Category</th>
              <th>Flag Rate</th><th>Risk Score</th><th>Exposure</th><th>Severity</th>
            </tr></thead>
            <tbody>
              ${d.investigation.map((p, i) => {
    const sc = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e' };
    return `
              <tr>
                <td style="font-weight:700;color:${i < 3 ? '#ef4444' : 'var(--text-muted)'}">${i + 1}</td>
                <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>${p.name}</strong></td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${p.category || '—'}</td>
                <td style="font-weight:700;color:${p.flag_rate > 5 ? '#ef4444' : p.flag_rate > 2 ? '#f59e0b' : '#22c55e'}">${p.flag_rate}%</td>
                <td><span style="font-weight:800;color:${sc[p.severity]}">${p.risk_score}</span></td>
                <td style="font-weight:600">${$(p.exposure_est)}</td>
                <td><span style="padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;color:#fff;background:${sc[p.severity]};text-transform:uppercase">${p.severity}</span></td>
              </tr>`}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>` : ''}

  </div>`;
}

function actionRow(emoji, title, sub, active, btn, page) {
  const bg = active ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.05)';
  const bc = active ? '#ef4444' : '#22c55e';
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:${bg};border-left:3px solid ${bc};box-sizing:border-box">
      <span style="font-size:1rem;flex-shrink:0">${emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.8rem;color:${bc}">${title}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${sub}</div>
      </div>
      <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${page}')" style="padding:5px 10px;border-radius:6px;background:${bc};color:#fff;font-weight:600;font-size:0.68rem;text-decoration:none;white-space:nowrap;flex-shrink:0">${btn}</a>
    </div>`;
}

function signal(label, value, level, desc) {
  const c = { critical: '#ef4444', high: '#f59e0b', elevated: '#f59e0b', normal: '#22c55e' };
  const bg = { critical: 'rgba(239,68,68,0.06)', high: 'rgba(245,158,11,0.06)', elevated: 'rgba(245,158,11,0.04)', normal: 'rgba(34,197,94,0.04)' };
  const band = { critical: '🔴 Critical', high: '🟠 High', elevated: '🟡 Elevated', normal: '🟢 Normal' };
  return `
    <div class="card" style="padding:12px;background:${bg[level]};border:1px solid ${c[level]}15;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:0.68rem;font-weight:600;color:var(--text-muted)">${label}</span>
        <span style="font-size:0.62rem;color:${c[level]};font-weight:600">${band[level]}</span>
      </div>
      <div style="font-size:1.3rem;font-weight:800;color:${c[level]}">${value}</div>
      <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px">${desc}</div>
    </div>`;
}

function renderFraudTrend(weeks) {
  if (!weeks || weeks.length === 0) return '<div style="font-size:0.72rem;color:var(--text-muted)">No data</div>';
  const mx = Math.max(...weeks.map(w => w.fraud_rate), 1);
  const avg = weeks.reduce((s, w) => s + w.fraud_rate, 0) / weeks.length;
  return `
    <div style="display:flex;align-items:end;gap:3px;height:80px;position:relative">
      <div style="position:absolute;top:${Math.max(0, 80 - (avg / mx) * 75)}px;left:0;right:0;border-top:1px dashed #f59e0b;opacity:0.4"></div>
      ${weeks.map(w => {
    const h = Math.max(3, (w.fraud_rate / mx) * 70);
    const dt = new Date(w.week);
    const isSpike = w.fraud_rate > avg * 1.5;
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0" title="${w.fraud_rate}% (${w.flagged}/${w.scans})">
          <div style="font-size:0.45rem;color:${isSpike ? '#ef4444' : 'var(--text-muted)'};font-weight:${isSpike ? '700' : '400'}">${w.fraud_rate}</div>
          <div style="width:100%;height:${h}px;background:${isSpike ? '#ef4444' : w.fraud_rate > avg ? '#f59e0b' : '#3b82f6'};border-radius:2px 2px 0 0;opacity:${isSpike ? 0.85 : 0.5}"></div>
          <div style="font-size:0.4rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="font-size:0.58rem;color:var(--text-muted);text-align:center;margin-top:4px">— avg ${avg.toFixed(1)}% · <span style="color:#ef4444">■</span> anomaly</div>`;
}

function renderAlertTrend(weeks) {
  if (!weeks || weeks.length === 0) return '<div style="font-size:0.72rem;color:var(--text-muted)">No data</div>';
  const mx = Math.max(...weeks.map(w => Math.max(w.created, w.resolved)), 1);
  return `
    <div style="display:flex;align-items:end;gap:3px;height:80px">
      ${weeks.map(w => {
    const ch = Math.max(2, (w.created / mx) * 70);
    const rh = Math.max(2, (w.resolved / mx) * 70);
    const dt = new Date(w.week);
    const gap = w.created - w.resolved;
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0" title="Created: ${w.created}, Resolved: ${w.resolved}">
          <div style="font-size:0.45rem;color:${gap > 0 ? '#ef4444' : '#22c55e'}">${gap > 0 ? '+' : ''}${gap}</div>
          <div style="width:100%;display:flex;gap:1px;align-items:end;height:70px">
            <div style="flex:1;height:${ch}px;background:#ef4444;opacity:0.5;border-radius:2px 2px 0 0"></div>
            <div style="flex:1;height:${rh}px;background:#22c55e;opacity:0.5;border-radius:2px 2px 0 0"></div>
          </div>
          <div style="font-size:0.4rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="font-size:0.58rem;color:var(--text-muted);text-align:center;margin-top:4px"><span style="color:#ef4444">■</span> Created · <span style="color:#22c55e">■</span> Resolved</div>`;
}

async function load() {
  try {
    _d = await api.get('/tenant/governance/kpi-overview');
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Risk Dashboard]', e); }
}
