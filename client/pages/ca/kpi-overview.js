/**
 * Company Admin – CRCE Dashboard
 * ═══════════════════════════════════════════
 * Company Risk Control Effectiveness KPI Tree
 * CRCE = 0.30×T1 + 0.30×T2 + 0.25×T3 + 0.15×T4
 */
import { API as api } from '../../core/api.js';

let _d = null;
const $ = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v;

export function renderPage() {
  if (!_d) { load(); return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Computing CRCE...</span></div>'; }
  const d = _d;
  const t = d.tiers;

  return `<div class="page-content" style="max-width:100%;overflow:hidden;box-sizing:border-box;padding:16px">

    <!-- CRCE HEADER -->
    ${renderCRCE(d.crce, d.crce_history)}

    <!-- EXECUTIVE BRIEFING -->
    ${renderBriefing(d)}

    <!-- 4 TIER BLOCKS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${tierBlock('Risk Exposure Health', t.risk_exposure, '🔥', [
    ['Critical Exposure', $(t.risk_exposure.metrics.open_critical_exposure.value), t.risk_exposure.metrics.open_critical_exposure.cases + ' cases'],
    ['Concentration', t.risk_exposure.metrics.concentration_ratio.value + '%', t.risk_exposure.metrics.concentration_ratio.value > 50 ? '⚠ Systemic' : 'Distributed'],
    ['7d Trend', (t.risk_exposure.metrics.trend_delta_7d.value > 0 ? '+' : '') + t.risk_exposure.metrics.trend_delta_7d.value + '%', t.risk_exposure.metrics.trend_delta_7d.value > 0 ? '↑ Increasing' : '↓ Improving'],
    ['Fraud Density', t.risk_exposure.metrics.fraud_density.value + '/1K', 'per 1,000 txn'],
  ])}
      ${tierBlock('SLA & Escalation', t.sla_control, '⏱', [
    ['Overdue Rate', t.sla_control.metrics.overdue_rate.value + '%', t.sla_control.metrics.overdue_rate.overdue + '/' + t.sla_control.metrics.overdue_rate.open + ' cases', t.sla_control.metrics.overdue_rate.value > 15],
    ['Overdue Exposure', $(t.sla_control.metrics.overdue_exposure.value), 'at risk'],
    ['Avg Breach', t.sla_control.metrics.avg_breach_time.value + 'h', 'past SLA'],
    ['Critical/High', t.sla_control.metrics.critical_open.value + '/' + t.sla_control.metrics.critical_open.high_open, 'open'],
  ])}
      ${tierBlock('Operational Throughput', t.throughput, '⚙️', [
    ['Resolution Rate', t.throughput.metrics.resolution_rate.value + '%', t.throughput.metrics.resolution_rate.resolved + '/' + t.throughput.metrics.resolution_rate.created + ' (7d)'],
    ['Net Backlog', String(t.throughput.metrics.net_backlog.value), 'pending'],
    ['Avg Resolution', t.throughput.metrics.avg_resolution_time.value + 'h', ''],
    ['Load Variance', String(t.throughput.metrics.investigator_variance.value), t.throughput.metrics.investigator_variance.count + ' investigators'],
  ])}
      ${tierBlock('Investigation Quality', t.quality, '🎯', [
    ['Speed Quality', t.quality.metrics.speed_quality.value + '/100', ''],
    ['Consistency', t.quality.metrics.consistency.value + '/100', ''],
    ['Total Resolved', String(t.quality.metrics.total_resolved.value), 'all-time'],
  ], t.quality.partial)}
    </div>

    <!-- TREND CHARTS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="card" style="padding:12px">
        <div style="font-size:0.72rem;font-weight:700;margin-bottom:6px">Fraud Rate Trend (12w)</div>
        ${renderFraudTrend(d.trends.fraud_weekly)}
      </div>
      <div class="card" style="padding:12px">
        <div style="font-size:0.72rem;font-weight:700;margin-bottom:6px">Alerts: Created vs Resolved</div>
        ${renderAlertTrend(d.trends.alert_weekly)}
      </div>
    </div>

    <!-- INVESTIGATION TABLE -->
    ${d.investigation.length > 0 ? `
    <div>
      <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">🔍 Investigation Queue</div>
      <div class="card"><div class="table-container" style="overflow-x:auto">
        <table style="width:100%">
          <thead><tr><th>#</th><th>Product</th><th>Flagged</th><th>Risk</th><th>Exposure</th><th>Severity</th></tr></thead>
          <tbody>
            ${d.investigation.map(p => {
    const sc = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e' };
    return `<tr>
                <td style="font-weight:700;color:${p.rank <= 3 ? '#ef4444' : 'var(--text-muted)'}">${p.rank}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>${p.name}</strong></td>
                <td style="color:#ef4444;font-weight:600">${p.flagged}</td>
                <td style="font-weight:800;color:${sc[p.severity]}">${p.risk_score}</td>
                <td style="font-weight:600">${$(p.exposure)}</td>
                <td><span style="padding:2px 6px;border-radius:4px;font-size:0.62rem;font-weight:700;color:#fff;background:${sc[p.severity]};text-transform:uppercase">${p.severity}</span></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div></div>
    </div>` : ''}
  </div>`;
}

// ── CRCE Score + History ──
function renderCRCE(score, history) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#ef4444' : '#dc2626';
  const label = score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : score >= 40 ? 'WEAK' : 'CRITICAL';
  const prev = history.length >= 2 ? history[history.length - 2].crce : score;
  const delta = score - prev;

  return `
    <div style="background:${color}08;border:1px solid ${color}25;border-radius:12px;padding:16px;margin-bottom:16px;box-sizing:border-box">
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center">
        <div style="text-align:center">
          <div style="font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px">Company Risk Control</div>
          <div style="font-size:2.5rem;font-weight:900;color:${color};line-height:1">${score}</div>
          <div style="font-size:0.82rem;font-weight:800;color:${color}">${label}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px">
            ${delta > 0 ? `<span style="color:#22c55e">↑ +${delta}</span>` : delta < 0 ? `<span style="color:#ef4444">↓ ${delta}</span>` : '→ stable'} vs last week
          </div>
        </div>
        <div>
          <div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:4px">CRCE History (12 weeks)</div>
          <div style="display:flex;align-items:end;gap:2px;height:50px">
            ${history.map(h => {
    const hh = Math.max(3, h.crce / 100 * 45);
    const hc = h.crce >= 80 ? '#22c55e' : h.crce >= 60 ? '#f59e0b' : '#ef4444';
    return `<div style="flex:1;height:${hh}px;background:${hc};opacity:0.6;border-radius:2px 2px 0 0" title="CRCE: ${h.crce}"></div>`;
  }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ── Tier Block ──
function tierBlock(title, tier, emoji, metrics, partial) {
  const score = tier.score;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#ef4444' : '#dc2626';
  const pct = Math.round(tier.weight * 100);

  return `
    <div class="card" style="padding:12px;border-top:3px solid ${color};box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:0.75rem;font-weight:700">${emoji} ${title}</div>
        <div style="text-align:right">
          <span style="font-size:1.3rem;font-weight:900;color:${color}">${score}</span>
          <span style="font-size:0.6rem;color:var(--text-muted)">/ 100</span>
        </div>
      </div>
      <div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:8px;overflow:hidden">
        <div style="height:100%;width:${score}%;background:${color};border-radius:2px;transition:width 0.5s"></div>
      </div>
      <div style="font-size:0.58rem;color:var(--text-muted);margin-bottom:6px">Weight: ${pct}%${partial ? ' · ⚠ Partial data' : ''}</div>
      ${metrics.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:0.7rem;color:var(--text-muted)">${m[0]}</span>
          <div style="text-align:right">
            <span style="font-size:0.78rem;font-weight:700;color:${m[3] ? '#ef4444' : 'var(--text-primary)'}">${m[1]}</span>
            ${m[2] ? `<span style="font-size:0.6rem;color:var(--text-muted);margin-left:4px">${m[2]}</span>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

// ── Executive Briefing ──
function renderBriefing(d) {
  const b = d.briefing;
  const risks = [];
  if (b.critical_alerts > 0) risks.push(`<strong>${b.critical_alerts}</strong> critical alerts unresolved${b.sla_overdue > 0 ? `, <span style="color:#ef4444">${b.sla_overdue} past SLA</span>` : ''}.`);
  if (b.flagged_products > 0) risks.push(`<strong>${b.flagged_products}</strong> products flagged >5% rate.`);
  if (b.region_spikes > 0) risks.push(`<strong>${b.region_spikes}</strong> regions with abnormal spikes.`);
  if (risks.length === 0) risks.push('No significant risks. All systems normal.');

  const severity = [];
  if (b.trend_delta !== 0) severity.push(`Fraud trend: <strong>${b.trend_delta > 0 ? '↑ +' : '↓ '}${Math.abs(b.trend_delta)}%</strong> WoW${b.trend_delta > 20 ? ' — <span style="color:#ef4444">accelerating</span>' : b.trend_delta > 0 ? '' : ' — <span style="color:#22c55e">improving</span>'}.`);
  if (b.exposure > 0) severity.push(`Exposure: <strong>${$(b.exposure)}</strong> at risk.`);
  if (severity.length === 0) severity.push('Within acceptable range.');

  const actions = [];
  if (b.sla_overdue > 0) actions.push({ p: 1, t: `Resolve ${b.sla_overdue} overdue alerts`, pg: 'ca-incidents', btn: 'Incidents' });
  else if (b.critical_alerts > 0) actions.push({ p: 1, t: `Investigate ${b.critical_alerts} critical alerts`, pg: 'ca-incidents', btn: 'Incidents' });
  if (b.flagged_products > 0) actions.push({ p: 2, t: `Review ${b.flagged_products} flagged products`, pg: 'products', btn: 'Products' });
  if (b.region_spikes > 0) actions.push({ p: 3, t: `Investigate ${b.region_spikes} region anomalies`, pg: 'ca-traceability', btn: 'Traceability' });
  if (actions.length === 0) actions.push({ p: 0, t: 'No immediate actions', pg: 'ca-reports', btn: 'Reports' });

  const bc = d.crce >= 80 ? '#22c55e' : d.crce >= 60 ? '#f59e0b' : '#ef4444';
  const priC = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 0: '#22c55e' };

  return `
    <div style="margin-bottom:16px;border:1px solid ${bc}25;border-radius:10px;overflow:hidden;box-sizing:border-box">
      <div style="background:${bc}10;padding:8px 14px;display:flex;align-items:center;gap:6px;border-bottom:1px solid ${bc}15">
        <span style="font-size:0.9rem">📋</span>
        <span style="font-weight:800;font-size:0.78rem;color:${bc}">EXECUTIVE RISK BRIEFING</span>
        <span style="margin-left:auto;font-size:0.55rem;color:var(--text-muted)">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style="padding:12px 14px;font-size:0.75rem;line-height:1.6">
        <div style="margin-bottom:10px">
          <div style="font-size:0.68rem;font-weight:800;margin-bottom:4px">1. WHAT RISKS DO WE HAVE?</div>
          <div style="padding-left:10px;border-left:2px solid ${bc}25;color:var(--text-secondary)">
            ${risks.map(r => `<div>→ ${r}</div>`).join('')}
          </div>
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:0.68rem;font-weight:800;margin-bottom:4px">2. HOW SEVERE IS IT?</div>
          <div style="padding-left:10px;border-left:2px solid ${bc}25;color:var(--text-secondary)">
            ${severity.map(s => `<div>→ ${s}</div>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:0.68rem;font-weight:800;margin-bottom:6px">3. WHAT TO DO NOW?</div>
          <div style="display:grid;gap:4px">
            ${actions.map(a => `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:${priC[a.p]}08;border-left:3px solid ${priC[a.p]}">
              <span style="font-weight:800;font-size:0.75rem;color:${priC[a.p]};flex-shrink:0">[${a.p}]</span>
              <span style="flex:1;font-size:0.72rem">${a.t}</span>
              <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('${a.pg}')" style="padding:3px 8px;border-radius:4px;background:${priC[a.p]};color:#fff;font-weight:600;font-size:0.62rem;text-decoration:none;flex-shrink:0">→ ${a.btn}</a>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ── Fraud Trend ──
function renderFraudTrend(weeks) {
  if (!weeks || !weeks.length) return '<div style="font-size:0.7rem;color:var(--text-muted)">No data</div>';
  const mx = Math.max(...weeks.map(w => w.rate), 1);
  const avg = weeks.reduce((s, w) => s + w.rate, 0) / weeks.length;
  return `
    <div style="display:flex;align-items:end;gap:2px;height:70px;position:relative">
      ${weeks.map(w => {
    const h = Math.max(3, (w.rate / mx) * 60);
    const spike = w.rate > avg * 1.5;
    const dt = new Date(w.week);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0" title="${w.rate}%">
          <div style="font-size:0.42rem;color:${spike ? '#ef4444' : 'var(--text-muted)'}">${w.rate}</div>
          <div style="width:100%;height:${h}px;background:${spike ? '#ef4444' : '#3b82f6'};opacity:${spike ? 0.8 : 0.4};border-radius:2px 2px 0 0"></div>
          <div style="font-size:0.38rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="font-size:0.55rem;color:var(--text-muted);text-align:center;margin-top:3px">avg ${avg.toFixed(1)}% · <span style="color:#ef4444">■</span> anomaly</div>`;
}

// ── Alert Trend ──
function renderAlertTrend(weeks) {
  if (!weeks || !weeks.length) return '<div style="font-size:0.7rem;color:var(--text-muted)">No data</div>';
  const mx = Math.max(...weeks.map(w => Math.max(w.created, w.resolved)), 1);
  return `
    <div style="display:flex;align-items:end;gap:2px;height:70px">
      ${weeks.map(w => {
    const ch = Math.max(2, (w.created / mx) * 60);
    const rh = Math.max(2, (w.resolved / mx) * 60);
    const dt = new Date(w.week);
    const gap = w.created - w.resolved;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0" title="C:${w.created} R:${w.resolved}">
          <div style="font-size:0.42rem;color:${gap > 0 ? '#ef4444' : '#22c55e'}">${gap > 0 ? '+' : ''}${gap}</div>
          <div style="width:100%;display:flex;gap:1px;align-items:end;height:60px">
            <div style="flex:1;height:${ch}px;background:#ef4444;opacity:0.45;border-radius:2px 2px 0 0"></div>
            <div style="flex:1;height:${rh}px;background:#22c55e;opacity:0.45;border-radius:2px 2px 0 0"></div>
          </div>
          <div style="font-size:0.38rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>
        </div>`;
  }).join('')}
    </div>
    <div style="font-size:0.55rem;color:var(--text-muted);text-align:center;margin-top:3px"><span style="color:#ef4444">■</span> Created · <span style="color:#22c55e">■</span> Resolved</div>`;
}

async function load() {
  try {
    _d = await api.get('/tenant/governance/kpi-overview');
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[CRCE]', e); }
}
