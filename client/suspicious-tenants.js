/**
 * Super Admin – Cases (Suspicious Tenants) — Real PG data
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try { data = await API.get('/risk-graph/risk-analytics'); } catch (e) { data = { suspiciousTenants: [] }; }
  loading = false;
}

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading risk data...</div></div>`;

  const tenants = data?.suspiciousTenants || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alert', 28)} Risk & Fraud Management</h1>
        <span style="font-size:0.72rem;color:#94a3b8">Monitor organization risk scores and take action on suspicious activity in real-time</span>
      </div>

      ${tenants.length === 0 ? '<div class="sa-card" style="text-align:center;padding:40px;color:#94a3b8">No suspicious organizations detected</div>' : ''}

      <style>
        .st-wrap{overflow-x:auto;border-radius:12px}
        .st-table{width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem}
        .st-table thead th{padding:14px 20px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap;background:#f8fafc}
        .st-table tbody td{padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
        .st-table tbody tr{transition:all 0.15s ease;cursor:pointer}
        .st-table tbody tr:hover{background:#f1f5f9;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.02)}
        .st-row-alert{background:#FEF2F2}
        .st-row-alert:hover{background:#FEE2E2}
        .st-org{font-weight:700;color:#1e293b;font-size:0.84rem;white-space:nowrap}
        .st-slug{font-size:0.7rem;color:#64748b;margin-top:3px;font-family:'JetBrains Mono',monospace}
        .st-score{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:30px;border-radius:8px;font-weight:800;font-size:1.05rem;padding:0 8px}
        .st-score-crit{background:#FEE2E2;color:#991B1B}
        .st-score-high{background:#FFEDD5;color:#C2410C}
        .st-score-med{background:#FEF3C7;color:#92400E}
        .st-score-low{background:#DBEAFE;color:#1E40AF}
        .st-tag{display:inline-block;font-size:0.64rem;font-weight:500;padding:3px 10px;border-radius:9999px;margin:2px 3px;white-space:nowrap;line-height:1.3}
        .st-tag-red{background:#FEE2E2;color:#DC2626}
        .st-tag-amber{background:#FEF3C7;color:#D97706}
        .st-tag-gray{background:#F1F5F9;color:#475569}
        .st-tag-more{background:#E2E8F0;color:#475569;font-weight:600}
        .st-num{font-weight:700;font-size:0.88rem;font-variant-numeric:tabular-nums}
        .st-num-amber{color:#D97706}
        .st-num-red{color:#EF4444}
        .st-btn-solid{padding:6px 16px;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;color:#fff}
        .st-btn-solid-red{background:#EF4444}
        .st-btn-solid-red:hover{background:#DC2626;box-shadow:0 3px 10px rgba(239,68,68,0.3)}
        .st-btn-ghost{padding:5px 14px;border-radius:8px;font-size:0.72rem;font-weight:600;cursor:pointer;background:transparent;transition:all 0.15s}
        .st-btn-ghost-amber{color:#D97706;border:1.5px solid #FCD34D}
        .st-btn-ghost-amber:hover{background:#FFFBEB;box-shadow:0 2px 8px rgba(245,158,11,0.15)}
        .st-btn-ghost-blue{color:#2563EB;border:1.5px solid #93C5FD}
        .st-btn-ghost-blue:hover{background:#EFF6FF;box-shadow:0 2px 8px rgba(59,130,246,0.15)}
        .st-level{font-size:0.72rem;font-weight:700;padding:5px 12px;border-radius:9999px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .st-lv-high{background:#FEE2E2;color:#991B1B}
        .st-lv-med{background:#FEF3C7;color:#92400E}
        .st-lv-low{background:#DBEAFE;color:#1E40AF}
      </style>

      <div class="sa-card st-wrap">
        <table class="st-table">
          <thead><tr>
            <th style="text-align:left;min-width:170px">Organization</th>
            <th style="text-align:right">Risk Score</th>
            <th style="text-align:right">Fraud Alerts</th>
            <th style="text-align:right">Open Cases</th>
            <th style="text-align:right">Critical</th>
            <th style="text-align:left">Detected Patterns</th>
            <th style="text-align:center">Action</th>
            <th style="text-align:center">Level</th>
          </tr></thead>
          <tbody>
            ${tenants.map(t => {
    const s = t.risk_score;
    const tier = s >= 90 ? 'crit' : s >= 70 ? 'high' : s >= 40 ? 'med' : 'low';
    const tierLabel = tier === 'crit' || tier === 'high' ? 'High' : tier === 'med' ? 'Medium' : 'Low';
    const tierIcon = tier === 'crit' || tier === 'high' ? '🔥' : tier === 'med' ? '⚡' : '✅';
    const lvClass = tier === 'crit' || tier === 'high' ? 'st-lv-high' : tier === 'med' ? 'st-lv-med' : 'st-lv-low';
    const action = (tier === 'crit' || tier === 'high')
      ? '<button class="st-btn-solid st-btn-solid-red">Suspend</button>'
      : tier === 'med'
        ? '<button class="st-btn-ghost st-btn-ghost-amber">Review</button>'
        : '<button class="st-btn-ghost st-btn-ghost-blue">Monitor</button>';
    const tagClass = (tier === 'crit' || tier === 'high') ? 'st-tag-red' : tier === 'med' ? 'st-tag-amber' : 'st-tag-gray';
    var pats = t.top_patterns || [];
    var shown = pats.slice(0, 2).map(function (p) { return '<span class="st-tag ' + tagClass + '">' + p + '</span>'; }).join('');
    if (pats.length > 2) shown += '<span class="st-tag st-tag-more">+' + (pats.length - 2) + '</span>';
    if (!pats.length) shown = '<span class="st-tag st-tag-gray">' + t.pattern_types + ' types</span>';
    var rowCls = s >= 90 ? ' class="st-row-alert"' : '';
    return '<tr' + rowCls + '>'
      + '<td style="text-align:left"><div class="st-org">' + t.name + '</div><div class="st-slug">' + t.slug + '</div></td>'
      + '<td style="text-align:right"><span class="st-score st-score-' + tier + '">' + s + '</span></td>'
      + '<td style="text-align:right"><span class="st-num">' + t.fraud_count + '</span></td>'
      + '<td style="text-align:right"><span class="st-num st-num-amber">' + t.open_count + '</span></td>'
      + '<td style="text-align:right"><span class="st-num st-num-red">' + t.critical_count + '</span></td>'
      + '<td style="text-align:left">' + shown + '</td>'
      + '<td style="text-align:center">' + action + '</td>'
      + '<td style="text-align:center"><span class="st-level ' + lvClass + '">' + tierIcon + ' ' + tierLabel + '</span></td>'
      + '</tr>';
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
