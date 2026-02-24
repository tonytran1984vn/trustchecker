/**
 * SA – Industry Benchmark Engine — Real PG data
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try { data = await API.get('/risk-graph/risk-analytics'); } catch (e) { data = {}; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('industry-benchmark-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Đang tải Benchmark data...</div></div>`;

  const heatmap = data?.heatmap || [];
  const patterns = data?.fraudPatterns || [];
  const cats = data?.riskByCategory || [];
  const tenants = data?.suspiciousTenants || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Industry Benchmark Engine</h1><div class="sa-title-actions"><span style="font-size:0.72rem;color:var(--text-secondary)">Cross-organization intelligence · Dữ liệu thực từ PostgreSQL</span></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Organizations', heatmap.length.toString(), 'Across ' + new Set(heatmap.flatMap(h => h.industry.split(', '))).size + ' industries', 'blue', 'building')}
        ${m('Total Scans', heatmap.reduce((s, h) => s + h.scans, 0).toLocaleString(), 'Across all organizations', 'green', 'zap')}
        ${m('Active Fraud Patterns', patterns.length.toString(), 'Alert types detected', 'red', 'alertTriangle')}
        ${m('High Risk Organizations', heatmap.filter(h => h.tier === 'High').length.toString(), 'Cần audit ngay', 'orange', 'target')}
      </div>

      <!-- TENANT RISK HEATMAP -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🌍 Organization Risk Heatmap</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">So sánh rủi ro cross-organization dựa trên dữ liệu thực.</p>
        <table class="sa-table"><thead><tr><th>Organization</th><th>Industry</th><th>Scans</th><th>Dup Rate</th><th>Frauds</th><th>Avg Trust</th><th>Risk Tier</th></tr></thead><tbody>
          ${heatmap.map(t => `<tr class="${t.tier === 'High' ? 'ops-alert-row' : ''}">
            <td><strong>${t.name}</strong></td>
            <td style="font-size:0.78rem">${t.industry}</td>
            <td style="text-align:right">${t.scans.toLocaleString()}</td>
            <td style="font-weight:600;color:${t.dupRate > 10 ? '#ef4444' : t.dupRate > 5 ? '#f59e0b' : '#22c55e'}">${t.dupRate}%</td>
            <td style="text-align:center;font-weight:700">${t.fraudCount}</td>
            <td style="font-weight:600;color:${t.avgTrust < 70 ? '#ef4444' : t.avgTrust < 85 ? '#f59e0b' : '#22c55e'}">${t.avgTrust}</td>
            <td><span class="sa-status-pill sa-pill-${t.tier === 'Low' ? 'green' : t.tier === 'Medium' ? 'orange' : 'red'}">${t.tier}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- INDUSTRY BENCHMARKS + FRAUD PATTERNS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>📊 Industry Risk Benchmarks</h3>
          <table class="sa-table"><thead><tr><th>Category</th><th>Fraud Alerts</th><th>Scans</th><th>Risk Rate</th></tr></thead><tbody>
            ${cats.slice(0, 8).map(c => {
    const fc = parseInt(c.fraud_count) || 0;
    const sc = parseInt(c.scan_count) || 0;
    const rate = sc > 0 ? Math.round(fc / sc * 10000) / 100 : 0;
    return `<tr>
                  <td><strong>${c.category || '—'}</strong></td>
                  <td style="text-align:center;font-weight:700;color:${fc > 5 ? '#ef4444' : '#64748b'}">${fc}</td>
                  <td style="text-align:right">${sc.toLocaleString()}</td>
                  <td style="font-weight:600;color:${rate > 1 ? '#ef4444' : '#22c55e'}">${rate}%</td>
                </tr>`;
  }).join('')}
          </tbody></table>
        </div>

        <div class="sa-card" style="border-left:4px solid #ef4444">
          <h3>🕵️ Fraud Pattern Library</h3>
          <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.5rem">Patterns detected across all organizations</p>
          ${patterns.map(p => `
            <div style="padding:0.6rem 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="font-size:0.82rem">${(p.alert_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong>
                <div style="font-size:0.68rem;color:#94a3b8">${p.incidents} incidents · ${p.critical} critical · ${p.open_count} open</div>
              </div>
              <span class="sa-status-pill sa-pill-${parseInt(p.critical) > 0 ? 'red' : parseInt(p.open_count) > 0 ? 'orange' : 'green'}">${parseInt(p.critical) > 0 ? 'Critical' : parseInt(p.open_count) > 0 ? 'Active' : 'Resolved'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

export function renderPage() {
  return `<div id="industry-benchmark-root">${renderContent()}</div>`;
}
