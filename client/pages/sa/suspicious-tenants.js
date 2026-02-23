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
        .st-table th{text-align:left;padding:10px 14px;font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;border-bottom:1px solid #f0f2f5;white-space:nowrap}
        .st-table th.st-right{text-align:right}
        .st-table td{padding:12px 14px;border-bottom:1px solid #f8fafc;vertical-align:middle}
        .st-table td.st-right{text-align:right;font-variant-numeric:tabular-nums}
        .st-table tr{transition:background 0.15s}
        .st-table tbody tr:hover{background:#f8fafc}
        .st-row-danger{background:rgba(254,202,202,0.15)!important}
        .st-row-danger:hover{background:rgba(254,202,202,0.25)!important}
        .st-org-name{font-weight:700;color:var(--text-primary);font-size:0.82rem}
        .st-org-slug{font-size:0.68rem;color:#94a3b8;margin-top:2px;font-family:'JetBrains Mono',monospace}
        .st-score{display:inline-flex;align-items:center;justify-content:center;width:38px;height:26px;border-radius:8px;font-weight:800;font-size:1.05rem}
        .st-score-high{background:#FEE2E2;color:#991B1B}
        .st-score-medium{background:#FEF3C7;color:#92400E}
        .st-score-low{background:#DBEAFE;color:#1E40AF}
        .st-chip{display:inline-block;font-size:0.65rem;font-weight:500;padding:2px 8px;border-radius:10px;background:#f1f5f9;color:#475569;margin:1px 2px}
        .st-chip-danger{background:#FEE2E2;color:#991B1B}
        .st-chip-warning{background:#FEF3C7;color:#92400E}
        .st-num{font-weight:700;font-size:0.82rem}
        .st-num-warn{color:#f59e0b}
        .st-num-crit{color:#ef4444}
        .st-btn{padding:5px 12px;border-radius:6px;font-size:0.7rem;font-weight:600;cursor:pointer;border:none;transition:all 0.15s}
        .st-btn-suspend{background:#FEE2E2;color:#991B1B}
        .st-btn-suspend:hover{background:#FECACA;box-shadow:0 2px 6px rgba(239,68,68,0.2)}
        .st-btn-review{background:#FEF3C7;color:#92400E}
        .st-btn-review:hover{background:#FDE68A;box-shadow:0 2px 6px rgba(245,158,11,0.2)}
        .st-btn-monitor{background:#EFF6FF;color:#1E40AF;border:1px solid #DBEAFE}
        .st-btn-monitor:hover{background:#DBEAFE;box-shadow:0 2px 6px rgba(59,130,246,0.15)}
        .st-severity{font-size:0.72rem;font-weight:700;padding:4px 10px;border-radius:8px;display:inline-flex;align-items:center;gap:4px}
        .st-sev-high{background:#FEE2E2;color:#991B1B}
        .st-sev-medium{background:#FEF3C7;color:#92400E}
        .st-sev-low{background:#DBEAFE;color:#1E40AF}
      </style>

      <div class="sa-card">
        <table class="st-table">
          <thead><tr>
            <th>Organization</th>
            <th class="st-right">Risk Score</th>
            <th class="st-right">Fraud Alerts</th>
            <th class="st-right">Open Cases</th>
            <th class="st-right">Critical</th>
            <th>Detected Patterns</th>
            <th>Recommended Action</th>
            <th>Risk Level</th>
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
      + '<td><div class="st-org-name">' + t.name + '</div><div class="st-org-slug">' + t.slug + '</div></td>'
      + '<td class="st-right"><span class="st-score st-score-' + tier + '">' + t.risk_score + '</span></td>'
      + '<td class="st-right"><span class="st-num">' + t.fraud_count + '</span></td>'
      + '<td class="st-right"><span class="st-num st-num-warn">' + t.open_count + '</span></td>'
      + '<td class="st-right"><span class="st-num st-num-crit">' + t.critical_count + '</span></td>'
      + '<td>' + patterns + '</td>'
      + '<td>' + action + '</td>'
      + '<td><span class="st-severity st-sev-' + tier + '">' + tierIcon + ' ' + tierLabel + '</span></td>'
      + '</tr>';
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
