/**
 * Super Admin – Risk Analytics — Real PG data
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try { data = await API.get('/risk-graph/risk-analytics'); } catch (e) { data = {}; }
  loading = false;
}

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Risk Analytics...</div></div>`;

  const regions = data?.riskByRegion || [];
  const cats = data?.riskByCategory || [];
  const patterns = data?.fraudPatterns || [];
  const maxRisky = Math.max(...regions.map(r => r.risky), 1);
  const maxCatFraud = Math.max(...cats.map(c => parseInt(c.fraud_count) || 0), 1);

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('barChart', 28)} Risk Analytics</h1></div>
      <div class="sa-grid-2col">

        <!-- Risk by Region -->
        <div class="sa-card">
          <h3>🌍 Risk by Region</h3>
          <div class="sa-analytics-bars">
            ${regions.map(r => barItem(r.name, r.risky, Math.round(r.risky / maxRisky * 100), r.pct + '% risky')).join('')}
          </div>
          ${regions.length === 0 ? '<div style="color:#94a3b8;font-size:0.78rem">No scan data available</div>' : ''}
        </div>

        <!-- Risk by Industry -->
        <div class="sa-card">
          <h3>🏭 Risk by Industry</h3>
          <div class="sa-analytics-bars">
            ${cats.slice(0, 8).map(c => barItem(
    c.category || 'Unknown',
    parseInt(c.fraud_count) || 0,
    Math.round((parseInt(c.fraud_count) || 0) / maxCatFraud * 100),
    (parseInt(c.scan_count) || 0).toLocaleString() + ' scans'
  )).join('')}
          </div>
        </div>

        <!-- Fraud Pattern Clustering -->
        <div class="sa-card">
          <h3>🔬 Fraud Pattern Clustering</h3>
          <table class="sa-table sa-table-compact">
            <thead><tr><th>Pattern</th><th>Incidents</th><th>Critical</th><th>Open</th></tr></thead>
            <tbody>
              ${patterns.map(p => `<tr>
                <td style="font-weight:600">${(p.alert_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                <td style="font-weight:700;text-align:center">${p.incidents}</td>
                <td style="text-align:center;color:${parseInt(p.critical) > 0 ? '#ef4444' : '#94a3b8'};font-weight:600">${p.critical}</td>
                <td style="text-align:center;color:${parseInt(p.open_count) > 0 ? '#f59e0b' : '#94a3b8'}">${p.open_count}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary Stats -->
        <div class="sa-card">
          <h3>📊 Overview</h3>
          <div class="sa-detail-grid" style="margin-top:0.5rem">
            <div class="sa-detail-item"><span class="sa-detail-label">Total Regions</span><span class="sa-score sa-score-info">${regions.length}</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Total Categories</span><span class="sa-score sa-score-info">${cats.length}</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Total Patterns</span><span class="sa-score sa-score-warning">${patterns.length}</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Total Risk Events</span><span class="sa-score sa-score-danger">${regions.reduce((s, r) => s + r.risky, 0)}</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

function barItem(label, count, pct, sub) {
  return `
    <div class="sa-bar-item">
      <div class="sa-bar-label">${label} <span class="sa-bar-count">${count}</span> ${sub ? '<span style="font-size:0.65rem;color:#94a3b8;margin-left:4px">' + sub + '</span>' : ''}</div>
      <div class="sa-bar-track"><div class="sa-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
}
