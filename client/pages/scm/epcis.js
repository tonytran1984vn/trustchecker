/**
 * TrustChecker – Scm Epcis Page
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { timeAgo, downloadJSON } from '../../utils/helpers.js';

export function renderPage() {
  const d = State.epcisData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading EPCIS data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📡</div><div class="stat-value">${s.total_events || 0}</div><div class="stat-label">EPCIS Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">🔗</div><div class="stat-value">${s.blockchain_sealed_pct || 0}%</div><div class="stat-label">Blockchain Sealed</div></div>
      <div class="stat-card violet"><div class="stat-icon">📦</div><div class="stat-value">${s.products_tracked || 0}</div><div class="stat-label">Products Tracked</div></div>
      <div class="stat-card amber"><div class="stat-icon">🤝</div><div class="stat-value">${s.partners_tracked || 0}</div><div class="stat-label">Partners Tracked</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 Event Types (GS1 CBV)</div></div>
      <table class="data-table"><thead><tr><th>Internal Type</th><th>EPCIS Type</th><th>Biz Step</th><th>Count</th></tr></thead><tbody>
        ${(s.event_types || []).map(e => `<tr><td>${e.internal_type}</td><td><span class="badge">${e.epcis_type}</span></td><td>${e.cbv_biz_step}</td><td>${e.count}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📡 Recent EPCIS Events</div>
        <button class="btn btn-sm" onclick="exportEpcisDoc()">📄 Export Document</button>
      </div>
      <table class="data-table"><thead><tr><th>Time</th><th>EPCIS Type</th><th>Biz Step</th><th>Location</th><th>Sealed</th></tr></thead><tbody>
        ${(d.events || []).slice(0, 20).map(e => `<tr><td>${timeAgo(e.eventTime || e.created_at)}</td><td>${e.epcis_type || '—'}</td><td>${e.cbv_biz_step || '—'}</td><td>${e.readPointId || e.location || '—'}</td><td>${e.blockchain_seal_id ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '—'}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> GS1 Compliance</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(s.compliance || {}).map(([k, v]) => `<div style="padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:0.75rem;color:var(--text-muted)">${k.replace(/_/g, ' ')}</div><div style="font-size:1.1rem;font-weight:700;color:${v ? 'var(--emerald)' : 'var(--rose)'}">${v ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Yes' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> No'}</div></div>`).join('')}
      </div>
    </div>`;
}
async function exportEpcisDoc() {
  try { const doc = await API.get('/scm/epcis/document'); downloadJSON(doc, 'epcis_document.json'); showToast('📄 EPCIS Document exported', 'success'); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.exportEpcisDoc = exportEpcisDoc;
