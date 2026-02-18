/**
 * TrustChecker – Scm Leaks Page
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { navigate } from '../../core/router.js';

export function renderPage() {
  const stats = State.scmLeaks;
  if (!stats) return '<div class="loading"><div class="spinner"></div></div>';

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card rose"><div class="stat-icon">🔍</div><div class="stat-value">${stats.open}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card emerald"><div class="stat-icon">✅</div><div class="stat-value">${stats.resolved}</div><div class="stat-label">Resolved</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${stats.total}</div><div class="stat-label">Total Alerts</div></div>
    </div>

    <div style="margin-bottom:20px">
      <button class="leak-scan-btn" onclick="runLeakScan()">🔍 Run Marketplace Scan</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🛒 By Platform</div></div>
        ${(stats.by_platform || []).length ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(stats.by_platform || []).map(p => `
              <div class="factor-bar-container leak-platform-bar">
                <div class="factor-bar-label"><span>${p.platform}</span><span>${p.count} alerts (risk: ${Math.round((p.avg_risk || 0) * 100)}%)</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100, p.count / Math.max(...(stats.by_platform || []).map(x => x.count)) * 100)}%"></div></div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="empty-text">No leaks detected</div></div>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📦 Top Leaked Products</div></div>
        ${(stats.top_products || []).length ? `
          <div class="table-container">
            <table>
              <tr><th>Product</th><th>Leaks</th><th>Avg Risk</th></tr>
              ${(stats.top_products || []).map(p => `
                <tr>
                  <td style="font-weight:600">${p.product_name || '—'}</td>
                  <td style="font-family:'JetBrains Mono'">${p.leak_count}</td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round((p.avg_risk || 0) * 100)}%</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : '<div class="empty-state"><div class="empty-text">No product leaks</div></div>'}
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏢 Distributor Risk</div></div>
      ${(stats.distributor_risk || []).length ? `
        <div class="table-container">
          <table>
            <tr><th>Distributor</th><th>Leak Count</th><th>Avg Risk</th></tr>
            ${(stats.distributor_risk || []).map(d => `
              <tr>
                <td style="font-weight:600">${d.name || '—'}</td>
                <td style="font-family:'JetBrains Mono'">${d.leak_count}</td>
                <td style="font-family:'JetBrains Mono';color:${(d.avg_risk || 0) > 0.7 ? 'var(--rose)' : 'var(--amber)'}">${Math.round((d.avg_risk || 0) * 100)}%</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : '<div class="empty-state"><div class="empty-text">No distributor risk data</div></div>'}
    </div>
  `;
}
async function runLeakScan() {
  try {
    showToast('🔍 Scanning marketplaces...', 'info');
    const res = await API.post('/scm/leaks/scan', {});
    showToast(`Found ${res.leaks_found} leaks across ${res.platforms_scanned.join(', ')}`, res.leaks_found > 0 ? 'error' : 'success');
    navigate('scm-leaks');
  } catch (e) { showToast('Scan failed: ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.runLeakScan = runLeakScan;
