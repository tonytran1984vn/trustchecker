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
        .st-table{width:100%;border-collapse:collapse;font-size:0.82rem}
        .st-table thead{background:#fafbfd}
        .st-table th{text-align:left!important;padding:10px 14px!important;font-size:0.68rem!important;font-weight:600!important;text-transform:uppercase!important;letter-spacing:0.04em!important;color:#94a3b8!important;border-bottom:1px solid #f0f2f5!important;white-space:nowrap}
        .st-table th.st-right{text-align:right!important}
        .st-table td{padding:12px 14px!important;border-bottom:1px solid #f0f2f5!important;vertical-align:middle!important}
        .st-table td.st-right{text-align:right!important;font-variant-numeric:tabular-nums}
        .st-table tbody tr{transition:background 0.15s;cursor:pointer}
        .st-table tbody tr:hover{background:#f8fafc!important}
        .st-row-danger{background:rgba(254,202,202,0.18)!important}
        .st-row-danger:hover{background:rgba(254,202,202,0.3)!important}
        .st-org-name{font-weight:700;color:var(--text-primary);font-size:0.82rem}
        .st-org-slug{font-size:0.68rem;color:#94a3b8;margin-top:2px;font-family:'JetBrains Mono',monospace}
        .st-score{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:28px;border-radius:8px;font-weight:800;font-size:1.1rem;padding:0 6px}
        .st-score-high{background:#FEE2E2;color:#991B1B}
        .st-score-medium{background:#FEF3C7;color:#92400E}
        .st-score-low{background:#DBEAFE;color:#1E40AF}
        .st-chip{display:inline-block;font-size:0.65rem;font-weight:500;padding:4px 10px;border-radius:9999px;background:#F1F5F9;color:#475569;margin:2px 3px;white-space:nowrap}
        .st-chip-danger{display:inline-block;font-size:0.65rem;font-weight:600;padding:4px 10px;border-radius:9999px;background:#FEE2E2;color:#DC2626;margin:2px 3px;white-space:nowrap}
        .st-chip-warning{display:inline-block;font-size:0.65rem;font-weight:500;padding:4px 10px;border-radius:9999px;background:#FEF3C7;color:#D97706;margin:2px 3px;white-space:nowrap}
        .st-num{font-weight:700;font-size:0.85rem}
        .st-num-warn{color:#f59e0b}
        .st-num-crit{color:#ef4444}
        .st-btn{padding:6px 14px;border-radius:8px;font-size:0.72rem;font-weight:600;cursor:pointer;border:none;transition:all 0.15s}
        .st-btn-suspend{background:#FEE2E2;color:#B91C1C;font-weight:700}
        .st-btn-suspend:hover{background:#FECACA;color:#991B1B;box-shadow:0 2px 8px rgba(239,68,68,0.25)}
        .st-btn-review{background:#FEF3C7;color:#92400E}
        .st-btn-review:hover{background:#FDE68A;box-shadow:0 2px 8px rgba(245,158,11,0.2)}
        .st-btn-monitor{background:#EFF6FF;color:#1E40AF;border:1px solid #DBEAFE}
        .st-btn-monitor:hover{background:#DBEAFE;box-shadow:0 2px 8px rgba(59,130,246,0.15)}
        .st-severity{font-size:0.72rem;font-weight:700;padding:4px 12px;border-radius:9999px;display:inline-flex;align-items:center;gap:4px}
        .st-sev-high{background:#FEE2E2;color:#991B1B}
        .st-sev-medium{background:#FEF3C7;color:#92400E}
        .st-sev-low{background:#DBEAFE;color:#1E40AF}
      </style>

      <div class="sa-card" style="overflow-x:auto">
        <table class="st-table" style="table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:180px">
            <col style="width:80px">
            <col style="width:80px">
            <col style="width:75px">
            <col style="width:65px">
            <col>
            <col style="width:110px">
            <col style="width:90px">
          </colgroup>          <thead><tr>
            <th style="text-align:left!important">Organization</th>
            <th style="text-align:right!important">Risk Score</th>
            <th style="text-align:right!important">Fraud Alerts</th>
            <th style="text-align:right!important">Open Cases</th>
            <th style="text-align:right!important">Critical</th>
            <th style="text-align:left!important">Detected Patterns</th>
            <th style="text-align:center!important">Recommended Action</th>
            <th style="text-align:center!important">Risk Level</th>
          </tr></thead>
          <tbody>
            ${tenants.map(t => {
    const tier = t.risk_score >= 70 ? 'high' : t.risk_score >= 40 ? 'medium' : 'low';
    const tierLabel = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';
    const tierIcon = tier === 'high' ? '🔥' : tier === 'medium' ? '⚡' : '✅';
    const action = tier === 'high'
      ? '<button class="st-btn st-btn-suspend">Suspend</button>'
      : tier === 'medium'
        ? '<button class="st-btn st-btn-review">Review</button>'
        : '<button class="st-btn st-btn-monitor">Monitor</button>';
    const chipClass = tier === 'high' ? 'st-chip-danger' : tier === 'medium' ? 'st-chip-warning' : 'st-chip';
    const patterns = t.top_patterns && t.top_patterns.length
      ? t.top_patterns.map(p => '<span class="' + chipClass + '">' + p + '</span>').join(' ')
      : '<span class="st-chip">' + t.pattern_types + ' types</span>';
    const rowClass = t.risk_score >= 90 ? 'st-row-danger' : '';
    return '<tr class="' + rowClass + '">'
      + '<td><div class="st-org-name" style="white-space:nowrap">' + t.name + '</div><div class="st-org-slug">' + t.slug + '</div></td>'
      + '<td style="text-align:right!important"><span class="st-score st-score-' + tier + '">' + t.risk_score + '</span></td>'
      + '<td style="text-align:right!important"><span class="st-num">' + t.fraud_count + '</span></td>'
      + '<td style="text-align:right!important"><span class="st-num st-num-warn">' + t.open_count + '</span></td>'
      + '<td style="text-align:right!important"><span class="st-num st-num-crit">' + t.critical_count + '</span></td>'
      + '<td>' + patterns + '</td>'
      + '<td style="text-align:center">' + action + '</td>'
      + '<td style="text-align:center"><span class="st-severity st-sev-' + tier + '">' + tierIcon + ' ' + tierLabel + '</span></td>'
      + '</tr>';
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
