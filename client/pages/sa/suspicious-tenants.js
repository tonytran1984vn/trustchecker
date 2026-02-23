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
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Đang tải dữ liệu Cases...</div></div>`;

  const tenants = data?.suspiciousTenants || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Suspicious Organizations</h1>
        <span style="font-size:0.72rem;color:#94a3b8">${tenants.length} organizations with fraud alerts</span>
      </div>

      ${tenants.length === 0 ? '<div class="sa-card" style="text-align:center;padding:40px;color:#94a3b8">No suspicious organizations detected</div>' : ''}

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr>
            <th>Organization</th><th>Risk Score</th><th>Fraud Alerts</th><th>Open</th><th>Critical</th><th>Patterns</th><th>Recommendation</th><th>Severity</th>
          </tr></thead>
          <tbody>
            ${tenants.map(t => {
    const tier = t.risk_score >= 70 ? 'danger' : t.risk_score >= 40 ? 'warning' : 'info';
    const tierLabel = t.risk_score >= 70 ? 'High' : t.risk_score >= 40 ? 'Medium' : 'Low';
    const action = t.risk_score >= 70 ? '<button class="btn btn-xs btn-danger">Suspend</button>'
      : t.risk_score >= 40 ? '<button class="btn btn-xs btn-warning">Review</button>'
        : '<button class="btn btn-xs btn-outline">Monitor</button>';
    return `<tr class="${tier === 'danger' ? 'ops-alert-row' : ''}">
                  <td><strong>${t.name}</strong><br><span class="sa-code" style="font-size:0.72rem;color:#64748b">${t.slug}</span></td>
                  <td><span class="sa-score sa-score-${tier}">${t.risk_score}</span></td>
                  <td style="text-align:center;font-weight:700">${t.fraud_count}</td>
                  <td style="text-align:center;color:#f59e0b;font-weight:600">${t.open_count}</td>
                  <td style="text-align:center;color:#ef4444;font-weight:700">${t.critical_count}</td>
                  <td style="font-size:0.72rem">${t.top_patterns.length ? t.top_patterns.join(', ') : t.pattern_types + ' types'}</td>
                  <td>${action}</td>
                  <td><span class="sa-status-pill sa-pill-${tier === 'danger' ? 'red' : tier === 'warning' ? 'orange' : 'blue'}">${tierLabel}</span></td>
                </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
