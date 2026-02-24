/**
 * CA – Duplicate Classification Intelligence
 * Real data from /api/scm/classify/duplicates + /api/scm/events
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  const emptyData = { total: 0, curiosity: 0, leakage: 0, counterfeit: 0, unclassified: 0, classList: [], duplicates: [] };
  // Safety timeout — render empty state if API hangs
  const timer = setTimeout(() => {
    if (!data) { data = emptyData; loading = false; const el = document.getElementById('duplicate-classification-root'); if (el) el.innerHTML = renderContent(); }
  }, 5000);
  try {
    const [classifications, scans] = await Promise.all([
      API.get('/scm/classify?limit=100').catch(() => ({ classifications: [] })),
      API.get('/scm/events?limit=200').catch(() => ({ events: [] })),
    ]);
    const classList = Array.isArray(classifications) ? classifications : (classifications.classifications || []);
    const scanList = Array.isArray(scans) ? scans : (scans.events || []);

    const duplicates = scanList.filter(s => s.is_duplicate || s.event_type === 'duplicate');
    const total = duplicates.length || classList.length || 0;
    const curiosity = classList.filter(c => c.classification === 'curiosity' || c.type === 'curiosity').length;
    const leakage = classList.filter(c => c.classification === 'leakage' || c.type === 'leakage').length;
    const counterfeit = classList.filter(c => c.classification === 'counterfeit' || c.type === 'counterfeit').length;
    const unclassified = total - curiosity - leakage - counterfeit;

    data = { total, curiosity, leakage, counterfeit, unclassified: Math.max(0, unclassified), classList, duplicates };
  } catch (e) { data = emptyData; }
  clearTimeout(timer);
  loading = false;
  setTimeout(() => { const el = document.getElementById('duplicate-classification-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Classification Data...</div></div>`;

  const d = data || {};
  const total = d.total || 1;
  const curiosityPct = ((d.curiosity / total) * 100).toFixed(1);
  const leakagePct = ((d.leakage / total) * 100).toFixed(1);
  const counterfeitPct = ((d.counterfeit / total) * 100).toFixed(1);
  const adjRiskPct = (parseFloat(leakagePct) + parseFloat(counterfeitPct)).toFixed(1);

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Duplicate Classification</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Duplicates', String(d.total), 'All duplicate events', 'blue', 'search')}
        ${m('Adjusted Risk Rate', adjRiskPct + '%', 'Leakage + Counterfeit only', 'red', 'target')}
        ${m('Curiosity (benign)', curiosityPct + '%', d.curiosity + ' scans — not risk', 'green', 'users')}
        ${m('Counterfeit (real)', counterfeitPct + '%', d.counterfeit + ' scans — actual threat', 'red', 'alertTriangle')}
      </div>

      <!-- CEO INSIGHT -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #6366f1;background:rgba(99,102,241,0.02)">
        <h3>🎯 Classification Breakdown</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem;text-align:center">
          ${classBox('👤 Curiosity', d.curiosity, curiosityPct + '%', '#22c55e', 'Benign — exclude')}
          ${classBox('🔀 Leakage', d.leakage, leakagePct + '%', '#f59e0b', 'Distribution issue')}
          ${classBox('🚨 Counterfeit', d.counterfeit, counterfeitPct + '%', '#ef4444', 'Real threat')}
          ${classBox('❓ Unclassified', d.unclassified, ((d.unclassified / total) * 100).toFixed(1) + '%', '#94a3b8', 'Needs review')}
        </div>
      </div>

      <!-- Classifications Table -->
      <div class="sa-card" style="border-left:4px solid #f59e0b">
        <h3>📋 Recent Classifications</h3>
        ${d.classList.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No classification data yet</div>' : `
        <table class="sa-table"><thead><tr><th>Type</th><th>Classification</th><th>Confidence</th><th>Product</th><th>Location</th><th>Time</th></tr></thead><tbody>
          ${d.classList.slice(0, 15).map(c => `
            <tr>
              <td><strong>${(c.scan_type || c.event_type || '—').replace(/_/g, ' ')}</strong></td>
              <td><span class="sa-status-pill sa-pill-${c.classification === 'counterfeit' ? 'red' : c.classification === 'leakage' ? 'orange' : c.classification === 'curiosity' ? 'green' : 'blue'}">${c.classification || c.type || 'pending'}</span></td>
              <td class="sa-code">${c.confidence ? (c.confidence * 100).toFixed(0) + '%' : '—'}</td>
              <td>${c.product_name || c.product_id?.substring(0, 8) || '—'}</td>
              <td>${c.location || c.region || '—'}</td>
              <td style="color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : '—'}</td>
            </tr>
          `).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}

function classBox(label, count, pct, color, desc) {
  return `<div style="background:${color}08;border-radius:6px;padding:0.75rem">
    <div style="font-size:1.5rem;font-weight:800;color:${color}">${count}</div>
    <div style="font-size:0.72rem">${label}</div>
    <div style="font-size:0.68rem;font-weight:600;color:${color}">${pct}</div>
    <div style="font-size:0.62rem;color:var(--text-secondary)">${desc}</div>
  </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

export function renderPage() {
  return `<div id="duplicate-classification-root">${renderContent()}</div>`;
}
