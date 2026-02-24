/**
 * Company Admin – Risk Rules (Tenant Scope)
 * ═══════════════════════════════════════════
 * Real data from /api/scm/model + /api/scm/risk
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let rules = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  // Safety timeout — render empty state if API hangs
  const timer = setTimeout(() => {
    if (!rules) { rules = { models: [], risks: [] }; loading = false; const el = document.getElementById('risk-rules-root'); if (el) el.innerHTML = renderContent(); }
  }, 5000);
  try {
    const [models, risks] = await Promise.all([
      API.get('/scm/model?limit=50').catch(() => ({ models: [] })),
      API.get('/scm/risk?limit=50').catch(() => ({ alerts: [] })),
    ]);
    const modelList = Array.isArray(models) ? models : (models.models || []);
    const riskList = Array.isArray(risks) ? risks : (risks.alerts || risks.rules || []);
    rules = { models: modelList, risks: riskList };
  } catch (e) { rules = { models: [], risks: [] }; }
  clearTimeout(timer);
  loading = false;
  setTimeout(() => { const el = document.getElementById('risk-rules-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!rules && !loading) { load(); }
  if (loading && !rules) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Risk Rules...</div></div>`;

  const models = rules?.models || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('target', 28)} Risk Rules</h1>
        <span style="font-size:0.75rem;color:var(--text-secondary);background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:6px">Organization Scope Only</span>
      </div>

      <!-- Risk Models from DB -->
      <section class="sa-section" style="margin-bottom:1.5rem">
        <h2 class="sa-section-title">${icon('settings', 20)} Active Risk Models</h2>
        <div class="sa-card">
          ${models.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No risk models configured yet</div>' : `
          <table class="sa-table">
            <thead><tr><th>Model Name</th><th>Type</th><th>Version</th><th>Accuracy</th><th>Status</th><th>Last Updated</th></tr></thead>
            <tbody>
              ${models.map(m => `
                <tr class="sa-row-clickable">
                  <td><strong>${m.name || m.model_name || '—'}</strong></td>
                  <td>${(m.model_type || m.type || '—').replace(/_/g, ' ')}</td>
                  <td class="sa-code">${m.version || 'v1'}</td>
                  <td class="sa-code">${m.accuracy ? (m.accuracy * 100).toFixed(1) + '%' : '—'}</td>
                  <td><span class="sa-status-pill sa-pill-${m.status === 'active' || m.status === 'production' ? 'green' : 'orange'}">${m.status || 'draft'}</span></td>
                  <td style="color:var(--text-secondary)">${m.updated_at ? new Date(m.updated_at).toLocaleDateString('en-US') : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
          <div style="margin-top:1rem;text-align:right">
            <button class="btn btn-primary btn-sm">+ Add Risk Rule</button>
          </div>
        </div>
      </section>

      <div class="sa-grid-2col">
        <!-- Built-in Rules -->
        <div class="sa-card">
          <h3>${icon('alert', 16)} Duplicate Detection</h3>
          <div class="sa-threshold-list">
            ${thresholdItem('Duplicate QR Threshold', 'Alert when same QR scanned from different locations within', '30 minutes')}
            ${thresholdItem('Serial Reuse Detection', 'Flag products with reused serial numbers', 'Immediate')}
            ${thresholdItem('Batch Duplication', 'Detect duplicate batch IDs in system', 'On creation')}
          </div>
        </div>

        <div class="sa-card">
          <h3>${icon('globe', 16)} Geographic Restrictions</h3>
          <div class="sa-threshold-list">
            ${thresholdItem('Allowed Regions', 'Scans only accepted from configured countries', 'VN, SG, TH, JP')}
            ${thresholdItem('Geo Anomaly Distance', 'Flag if consecutive scans > distance apart', '500 km / 1 hour')}
            ${thresholdItem('Blocked Countries', 'Reject scans from sanctioned regions', '3 countries')}
          </div>
        </div>
      </div>

      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('zap', 20)} Velocity Rules</h2>
        <div class="sa-card">
          <div class="sa-threshold-list">
            ${thresholdItem('Scan Velocity', 'Max scans per QR code per time window', '10 scans / hour')}
            ${thresholdItem('API Rate Limit', 'Max API calls per partner per minute', '100 req/min')}
            ${thresholdItem('Batch Transfer Rate', 'Max transfers per node per day', '50 transfers/day')}
            ${thresholdItem('Login Attempt Limit', 'Lock account after failed attempts', '5 attempts / 15 min')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function thresholdItem(name, desc, value) {
  return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span style="font-weight:600;font-size:0.82rem">${value}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}

export function renderPage() {
  return `<div id="risk-rules-root">${renderContent()}</div>`;
}
