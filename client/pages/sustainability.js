/**
 * TrustChecker – Sustainability Page (v2.0)
 * Self-loading: fetches stats + leaderboard via API.get()
 */
import { icon } from '../core/icons.js';
import { API } from '../core/api.js';

let _data = null;
let _loading = false;

async function loadData() {
  if (_loading) return;
  if (_data && _data.stats?.products_assessed > 0) return; // skip only if we have real data
  _loading = true;
  try {
    const [stats, lb] = await Promise.all([
      API.get('/sustainability/stats').catch(() => null),
      API.get('/sustainability/leaderboard').catch(() => null),
    ]);
    _data = { stats: stats || {}, scores: lb?.leaderboard || [] };
    // Re-render into workspace content
    // Re-render only if this tab is still active
    setTimeout(() => { const el = document.getElementById('sustainability-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
  } catch (e) { console.error('Sustainability fetch error:', e); }
  _loading = false;
  setTimeout(() => { const el = document.getElementById('sustainability-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function scoreColor(s) {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  if (s >= 40) return '#f97316';
  return '#ef4444';
}

function gradeBadge(g) {
  const c = g === 'A+' || g === 'A' ? '#10b981' : g === 'B' ? '#3b82f6' : g === 'C' ? '#f59e0b' : '#ef4444';
  return `<span style="padding:2px 8px;border-radius:4px;background:${c}18;color:${c};font-weight:700;font-size:0.78rem">${g}</span>`;
}

function renderContent() {
  if (!_data) return '<div style="text-align:center;padding:40px;color:#64748b"><div class="spinner"></div> Loading sustainability data...</div>';

  const s = _data.stats;
  const scores = _data.scores || [];

  return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('globe', 24)} Sustainability Dashboard</h1>
            <p style="color:#94a3b8;margin:4px 0 16px">Product Sustainability Scoring · Green Certifications · ESG Analytics</p>
        </div>

        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
            ${[
      { l: 'Products Assessed', v: s.products_assessed || 0, c: '#3b82f6', i: '♻️' },
      { l: 'Avg Score', v: s.avg_score?.toFixed?.(1) || s.avg_score || 0, c: '#10b981', i: '📊' },
      { l: 'Green Certs', v: s.certifications_issued || 0, c: '#8b5cf6', i: '🏅' },
      { l: 'Avg Carbon', v: (s.avg_carbon_footprint?.toFixed?.(1) || s.avg_carbon_footprint || 0) + ' kgCO₂e', c: '#f59e0b', i: '🌍' },
      { l: 'Platform Grade', v: s.platform_grade || '—', c: s.platform_grade === 'A' ? '#10b981' : '#f59e0b', i: '🏆' },
    ].map(k => `
                <div class="sa-card" style="text-align:center;padding:14px">
                    <div style="font-size:20px">${k.i}</div>
                    <div style="font-size:20px;font-weight:700;color:${k.c};margin:4px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.72rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <!-- Grade Distribution -->
        ${s.grade_distribution?.length ? `
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('barChart')} Grade Distribution</h3>
            <div style="display:flex;gap:10px;justify-content:center">
                ${s.grade_distribution.map(g => {
      const c = g.grade === 'A+' || g.grade === 'A' ? '#10b981' : g.grade === 'B' ? '#3b82f6' : g.grade === 'C' ? '#f59e0b' : '#ef4444';
      return `<div style="text-align:center;padding:12px 20px;background:${c}08;border:1px solid ${c}33;border-radius:10px;min-width:70px">
                        <div style="font-size:22px;font-weight:800;color:${c}">${g.count}</div>
                        <div style="color:${c};font-weight:700;font-size:0.82rem">${g.grade}</div>
                    </div>`;
    }).join('')}
            </div>
        </div>` : ''}

        <!-- Leaderboard Table -->
        <div class="sa-card">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('users')} Sustainability Leaderboard</h3>
            ${scores.length > 0 ? `
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.72rem;text-transform:uppercase">
                        <th style="padding:8px;text-align:center;width:40px">#</th>
                        <th style="padding:8px;text-align:left">Product</th>
                        <th style="padding:8px;text-align:center">Carbon</th>
                        <th style="padding:8px;text-align:center">Water</th>
                        <th style="padding:8px;text-align:center">Recycl.</th>
                        <th style="padding:8px;text-align:center">Ethical</th>
                        <th style="padding:8px;text-align:center">Overall</th>
                        <th style="padding:8px;text-align:center">Grade</th>
                    </tr></thead>
                    <tbody>
                        ${scores.map(r => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:8px;text-align:center;color:#64748b;font-weight:600">${r.rank}</td>
                            <td style="padding:8px;color:#f1f5f9;font-weight:600">${r.product_name || r.product_id?.slice(0, 12) || '—'}</td>
                            <td style="padding:8px;text-align:center;color:${scoreColor(r.carbon_footprint)};font-weight:600">${r.carbon_footprint}</td>
                            <td style="padding:8px;text-align:center;color:${scoreColor(r.water_usage)};font-weight:600">${r.water_usage}</td>
                            <td style="padding:8px;text-align:center;color:${scoreColor(r.recyclability)};font-weight:600">${r.recyclability}</td>
                            <td style="padding:8px;text-align:center;color:${scoreColor(r.ethical_sourcing)};font-weight:600">${r.ethical_sourcing}</td>
                            <td style="padding:8px;text-align:center">
                                <span style="font-size:15px;font-weight:700;color:${scoreColor(r.overall_score)}">${r.overall_score}</span>
                            </td>
                            <td style="padding:8px;text-align:center">${gradeBadge(r.grade)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '<div style="text-align:center;padding:20px;color:#64748b">No sustainability data available</div>'}
        </div>
    </div>`;
}

function renderContent() {
  loadData();
  return renderContent();
}

export function renderPage() {
  return `<div id="sustainability-root">${renderContent()}</div>`;
}
